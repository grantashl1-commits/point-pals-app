// Edge Function: render-montage
// Turns a household's current memory season into an MP4 slideshow montage via
// the Shotstack render API, storing the result in the private "exports"
// bucket and handing back short-lived signed URLs.
//
// POST /render-montage   (caller: signed-in household member)
//   { householdId: "uuid", action: "start" }            → { jobId, status }
//   { householdId: "uuid", action: "status", jobId }    → { status, url? }
//
// Privacy: only time-limited signed URLs ever leave this function — the
// render service never sees the raw bucket, and the finished video is pulled
// back into our own private storage as soon as the render completes.
//
// Cost control: one montage per season on the free tier, a small cap for
// active subscribers. A queued/rendering job is returned as-is (idempotent).
//
// Secrets: SHOTSTACK_API_KEY (required to render), SHOTSTACK_ENV ("v1" prod /
// "stage" sandbox, default "v1"), SHOTSTACK_SOUNDTRACK_URL (optional music).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { sendResendHtml } from "../_shared/resend-send.ts";
import { APP_URL, FROM_ADDRESS } from "../_shared/emails/base.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const IMAGE_SECONDS = 3;
const VIDEO_SECONDS = 5;
const TITLE_SECONDS = 3;
const MAX_CLIPS = 60; // keeps renders/downloads a sane size
const SIGNED_ASSET_TTL = 24 * 60 * 60; // renders can queue — give sources a day
const SIGNED_DOWNLOAD_TTL = 60 * 60;
const FREE_MONTAGES_PER_SEASON = 1;
const PAID_MONTAGES_PER_SEASON = 5;

function shotstackBase(): string {
  const env = Deno.env.get("SHOTSTACK_ENV") ?? "v1";
  return `https://api.shotstack.io/edit/${env}`;
}

type MediaItem = { path: string; kind: "image" | "video" };

type PostRow = {
  id: string;
  storage_path: string | null;
  media_type: "image" | "video" | null;
  media_paths: MediaItem[] | null;
  created_at: string;
};

function postMedia(p: PostRow): MediaItem[] {
  if (Array.isArray(p.media_paths) && p.media_paths.length > 0) {
    return p.media_paths.filter((m) => m?.path);
  }
  if (p.storage_path) return [{ path: p.storage_path, kind: p.media_type ?? "image" }];
  return [];
}

function formatNzDate(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString("en-NZ", { month: "long", day: "numeric", year: "numeric", timeZone: "Pacific/Auckland" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { householdId, action, jobId } = await req.json();
    if (!householdId) return json({ ok: false, error: "householdId is required" }, 400);

    // ── AUTH: signed-in member of this household ────────────────────────
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    const { data: member } = await admin
      .from("household_members")
      .select("role")
      .eq("household_id", householdId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) return json({ ok: false, error: "Not a member of this household" }, 403);

    if (action === "status") {
      if (!jobId) return json({ ok: false, error: "jobId is required" }, 400);
      return await handleStatus(householdId, jobId);
    }
    return await handleStart(householdId, user.id);
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

// ── START: build the edit and submit the render ──────────────────────────

async function handleStart(householdId: string, userId: string): Promise<Response> {
  const apiKey = Deno.env.get("SHOTSTACK_API_KEY");
  if (!apiKey) {
    return json({ ok: false, error: "not_configured" }, 501);
  }

  const { data: hh } = await admin
    .from("households")
    .select("name, subscription_status, memory_cycle_started_at, memory_cycle_ends_at")
    .eq("id", householdId)
    .maybeSingle();
  if (!hh) return json({ ok: false, error: "Household not found" }, 404);

  // Idempotency: an in-flight job for this season is simply returned.
  const { data: existing } = await admin
    .from("montage_jobs")
    .select("id, status")
    .eq("household_id", householdId)
    .eq("cycle_ends_at", hh.memory_cycle_ends_at)
    .in("status", ["queued", "rendering"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (existing && existing.length > 0) {
    return json({ ok: true, jobId: existing[0].id, status: existing[0].status });
  }

  // Per-season cap: 1 on the free tier, a small cap for subscribers.
  const paid = hh.subscription_status === "active" || hh.subscription_status === "trialing";
  const cap = paid ? PAID_MONTAGES_PER_SEASON : FREE_MONTAGES_PER_SEASON;
  const { count: doneCount } = await admin
    .from("montage_jobs")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .eq("cycle_ends_at", hh.memory_cycle_ends_at)
    .eq("status", "done");
  if ((doneCount ?? 0) >= cap) {
    return json({ ok: false, error: "season_limit_reached", limit: cap }, 429);
  }

  // ── Gather the season, oldest first ─────────────────────────────────
  const { data: posts, error: postErr } = await admin
    .from("memory_posts")
    .select("id, storage_path, media_type, media_paths, created_at")
    .eq("household_id", householdId)
    .gte("created_at", hh.memory_cycle_started_at)
    .order("created_at", { ascending: true });
  if (postErr) return json({ ok: false, error: postErr.message }, 500);

  const items: MediaItem[] = (posts ?? []).flatMap((p) => postMedia(p as PostRow)).slice(0, MAX_CLIPS);
  if (items.length === 0) {
    return json({ ok: false, error: "no_memories" }, 400);
  }

  // ── Build the Shotstack edit: title card, then one clip per item.
  // Sources are 24h signed URLs — the render service never sees the bucket.
  const clips: Record<string, unknown>[] = [];
  let cursor = 0;

  clips.push({
    asset: {
      type: "title",
      text: `The ${hh.name} family\n${formatNzDate(hh.memory_cycle_started_at)} – ${formatNzDate(hh.memory_cycle_ends_at)}`,
      style: "chunk",
      size: "small",
    },
    start: cursor,
    length: TITLE_SECONDS,
    transition: { in: "fade", out: "fade" },
  });
  cursor += TITLE_SECONDS;

  for (const item of items) {
    const { data: signed, error: signErr } = await admin.storage
      .from("memories")
      .createSignedUrl(item.path, SIGNED_ASSET_TTL);
    if (signErr || !signed?.signedUrl) continue;

    if (item.kind === "video") {
      clips.push({
        asset: { type: "video", src: signed.signedUrl, trim: 0, volume: 1 },
        start: cursor,
        length: VIDEO_SECONDS,
        transition: { in: "fade", out: "fade" },
      });
      cursor += VIDEO_SECONDS;
    } else {
      clips.push({
        asset: { type: "image", src: signed.signedUrl },
        start: cursor,
        length: IMAGE_SECONDS,
        effect: "zoomIn",
        transition: { in: "fade", out: "fade" },
      });
      cursor += IMAGE_SECONDS;
    }
  }

  if (clips.length <= 1) {
    return json({ ok: false, error: "could not sign any media" }, 500);
  }

  const timeline: Record<string, unknown> = {
    background: "#000000",
    tracks: [{ clips }],
  };
  const soundtrack = Deno.env.get("SHOTSTACK_SOUNDTRACK_URL");
  if (soundtrack) {
    timeline.soundtrack = { src: soundtrack, effect: "fadeInFadeOut" };
  }

  const edit = {
    timeline,
    output: { format: "mp4", resolution: "hd", fps: 25 },
  };

  const res = await fetch(`${shotstackBase()}/render`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(edit),
  });
  const body = await res.json().catch(() => null);
  const renderId = body?.response?.id;
  if (!res.ok || !renderId) {
    console.error("Shotstack submit failed:", res.status, JSON.stringify(body));
    return json({ ok: false, error: "render submit failed" }, 502);
  }

  const { data: job, error: jobErr } = await admin
    .from("montage_jobs")
    .insert({
      household_id: householdId,
      requested_by: userId,
      status: "rendering",
      provider: "shotstack",
      provider_render_id: renderId,
      cycle_ends_at: hh.memory_cycle_ends_at,
      post_count: posts?.length ?? 0,
    })
    .select("id")
    .single();
  if (jobErr || !job) return json({ ok: false, error: jobErr?.message ?? "job insert failed" }, 500);

  return json({ ok: true, jobId: job.id, status: "rendering" });
}

// ── STATUS: poll the provider, land the MP4 in our own bucket ─────────────

function buildMontageReadyHtml(vars: {
  firstName: string;
  familyName: string;
  seasonLabel: string;
  memoryCount: number;
  hasVideos: boolean;
  downloadUrl: string;
  expiresInHours: number;
  seasonLimit: number;
}): string {
  const plural = vars.memoryCount === 1 ? "memory" : "memories";
  const videosSuffix = vars.hasVideos ? ` and videos` : ``;
  const escape = escapeHtml;
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FBF7EC;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(60,47,38,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#C7B0EE 0%,#F9F6EF 100%);padding:32px 48px 28px;text-align:center;">
            <img src="https://tcpbvcgvtwrqsrzerwwr.supabase.co/storage/v1/object/public/assets/pointpals.logo.png" alt="PointPals" width="160" style="height:auto;display:block;margin:0 auto 16px;" />
            <div style="display:inline-block;background-color:#FFFFFF;border-radius:100px;padding:6px 18px;">
              <span style="font-size:12px;font-weight:700;color:#8A7F72;letter-spacing:0.08em;text-transform:uppercase;">\uD83C\uDFAC Montage ready</span>
            </div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 48px 16px;">
            <h1 style="margin:0 0 16px;font-family:'Zain','Georgia',serif;font-size:28px;font-weight:800;color:#3C2F26;line-height:1.25;">
              Your season montage is ready \uD83C\uDFAC
            </h1>
            <p style="margin:0 0 16px;font-size:15px;color:#5C5247;line-height:1.7;">Hi ${escape(vars.firstName)},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#5C5247;line-height:1.7;">
              The <strong>${escape(vars.familyName)}</strong> family's season montage is ready to download! We've stitched together <strong>${vars.memoryCount} ${plural}</strong>${videosSuffix} from ${escape(vars.seasonLabel)}, and it's all yours to keep forever.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#5C5247;line-height:1.7;">
              This link expires in <strong>${vars.expiresInHours} hours</strong>, so grab it while it's hot:
            </p>
            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${escape(vars.downloadUrl)}" style="display:inline-block;background-color:#3C2F26;color:#FBF7EC;font-family:'Nunito Sans','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:100px;">Download montage (MP4) →</a>
                </td>
              </tr>
            </table>
            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:linear-gradient(135deg,#C7B0EE,#E2D5F5);border-radius:16px;padding:24px 28px;">
                  <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#3C2F26;text-transform:uppercase;letter-spacing:0.07em;">How it's made</p>
                  <p style="margin:0;font-size:15px;color:#5C5247;line-height:1.7;">Your montage was created from the memories in your feed, arranged in the order they were added. Each season you can create up to <strong>${vars.seasonLimit}</strong> free montages.</p>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#B5AFA9;text-align:center;line-height:1.6;">
              \uD83D\uDCA1 <strong style="color:#8A7F72;">Tip:</strong> On mobile, tap and hold the download link, then choose <em>\u201CSave to Files\u201D</em> to keep it in your camera roll.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F9F6EF;padding:24px 48px;border-top:1px solid #EEE9E0;">
            <p style="margin:0;font-size:12px;color:#B5AFA9;line-height:1.6;">
              PointPals · hello@pointpals.co.nz · Proudly NZ-made \uD83C\uDDF3\uD83C\uDDFF<br />
              <a href="https://pointpals.co.nz/privacy" style="color:#B5AFA9;">Unsubscribe</a> ·
              <a href="https://pointpals.co.nz/privacy" style="color:#B5AFA9;">Privacy</a> ·
              <a href="${APP_URL}/memories" style="color:#B5AFA9;">Your memories</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function sendMontageReadyEmail(
  householdId: string,
  jobId: string,
  outputPath: string,
): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.log("No RESEND_API_KEY — skipping montage-ready email");
    return;
  }

  try {
    // Household name
    const { data: hh } = await admin
      .from("households")
      .select("name, memory_cycle_started_at, memory_cycle_ends_at")
      .eq("id", householdId)
      .maybeSingle();
    if (!hh) {
      console.warn(`Household ${householdId} not found — skipping email`);
      return;
    }

    // Job detail (post_count, cycle_ends_at)
    const { data: jobRow } = await admin
      .from("montage_jobs")
      .select("post_count, cycle_ends_at")
      .eq("id", jobId)
      .maybeSingle();

    // Primary admin/parent for the billing contact
    const { data: members } = await admin
      .from("household_members")
      .select("user_id")
      .eq("household_id", householdId)
      .in("role", ["admin", "parent"])
      .order("created_at", { ascending: true })
      .limit(1);
    if (!members || members.length === 0) {
      console.warn(`Household ${householdId} has no admin/parent — skipping email`);
      return;
    }

    const { data: userData } = await admin.auth.admin.getUserById(members[0].user_id);
    if (!userData?.user?.email) {
      console.warn(`User ${members[0].user_id} has no email — skipping`);
      return;
    }

    const email = userData.user.email;
    const meta = userData.user.user_metadata ?? {};
    const firstName = meta.first_name || meta.display_name || email.split("@")[0] || "there";
    const seasonLabel = hh.memory_cycle_ends_at
      ? `${formatNzDate(hh.memory_cycle_started_at)} \u2013 ${formatNzDate(hh.memory_cycle_ends_at)}`
      : "this season";

    // Check if the household is on a paid tier for the season limit message
    const { data: hhSub } = await admin
      .from("households")
      .select("subscription_status")
      .eq("id", householdId)
      .maybeSingle();
    const paid = hhSub?.subscription_status === "active" || hhSub?.subscription_status === "trialing";

    const { data: signed } = await admin.storage
      .from("exports")
      .createSignedUrl(outputPath, SIGNED_DOWNLOAD_TTL);
    if (!signed?.signedUrl) {
      console.warn("Could not sign export URL for email — skipping");
      return;
    }

    const result = await sendResendHtml(resendKey, {
      to: email,
      from: FROM_ADDRESS,
      subject: `Your ${hh.name} family season montage is ready \uD83C\uDFAC`,
      html: buildMontageReadyHtml({
        firstName,
        familyName: hh.name,
        seasonLabel,
        memoryCount: jobRow?.post_count ?? 0,
        hasVideos: false, // simplified — we don't track this per-job
        downloadUrl: signed.signedUrl,
        expiresInHours: Math.floor(SIGNED_DOWNLOAD_TTL / 3600),
        seasonLimit: paid ? PAID_MONTAGES_PER_SEASON : FREE_MONTAGES_PER_SEASON,
      }),
    });

    if (result.ok) {
      console.log(`Montage-ready email sent to ${email} (${hh.name})`);
    } else {
      console.warn(`Failed to send montage-ready email to ${email}: ${result.status}`);
    }
  } catch (e) {
    // Log but don't fail — the render already succeeded
    console.error("sendMontageReadyEmail error:", e instanceof Error ? e.message : String(e));
  }
}

async function handleStatus(householdId: string, jobId: string): Promise<Response> {
  const { data: job } = await admin
    .from("montage_jobs")
    .select("id, household_id, status, provider_render_id, output_path, error")
    .eq("id", jobId)
    .eq("household_id", householdId)
    .maybeSingle();
  if (!job) return json({ ok: false, error: "Job not found" }, 404);

  if (job.status === "done" && job.output_path) {
    const { data: signed } = await admin.storage
      .from("exports")
      .createSignedUrl(job.output_path, SIGNED_DOWNLOAD_TTL);
    return json({ ok: true, status: "done", url: signed?.signedUrl });
  }
  if (job.status === "failed") {
    return json({ ok: true, status: "failed", error: job.error });
  }

  const apiKey = Deno.env.get("SHOTSTACK_API_KEY");
  if (!apiKey || !job.provider_render_id) {
    return json({ ok: true, status: job.status });
  }

  const res = await fetch(`${shotstackBase()}/render/${job.provider_render_id}`, {
    headers: { "x-api-key": apiKey },
  });
  const body = await res.json().catch(() => null);
  const providerStatus = body?.response?.status as string | undefined;

  if (providerStatus === "failed") {
    const reason = body?.response?.error ?? "render failed";
    await admin.from("montage_jobs").update({ status: "failed", error: reason }).eq("id", job.id);
    return json({ ok: true, status: "failed", error: reason });
  }

  if (providerStatus !== "done" || !body?.response?.url) {
    return json({ ok: true, status: "rendering" });
  }

  // Pull the finished MP4 into our private exports bucket, then serve it
  // with a signed URL — the provider's hosted copy expires on its own.
  const videoRes = await fetch(body.response.url);
  if (!videoRes.ok) {
    return json({ ok: true, status: "rendering" }); // transient — retry next poll
  }
  const outputPath = `${householdId}/montage-${job.id}.mp4`;
  const { error: upErr } = await admin.storage
    .from("exports")
    .upload(outputPath, await videoRes.blob(), { contentType: "video/mp4", upsert: true });
  if (upErr) {
    console.error("exports upload failed:", upErr.message);
    return json({ ok: true, status: "rendering" }); // retry next poll
  }

  // ── Idempotent done transition ─────────────────────────────────────
  // Check current DB status so concurrent polls don't double-send email.
  const { data: current } = await admin
    .from("montage_jobs")
    .select("status")
    .eq("id", job.id)
    .single();

  if (current?.status !== "done") {
    await admin
      .from("montage_jobs")
      .update({ status: "done", output_path: outputPath })
      .eq("id", job.id);

    // Fire-and-forget: send email notification (logged internally)
    void sendMontageReadyEmail(householdId, jobId, outputPath);
  }

  const { data: signed } = await admin.storage
    .from("exports")
    .createSignedUrl(outputPath, SIGNED_DOWNLOAD_TTL);
  return json({ ok: true, status: "done", url: signed?.signedUrl });
}
