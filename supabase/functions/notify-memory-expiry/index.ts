// Edge Function: notify-memory-expiry
// Cron-driven: finds households whose memory-feed season ends in the next
// 0–4 days and sends a "your memories are about to refresh" email with a
// link to download the season montage first.
//
// Scheduled via the CRON_SECRET auth pattern (same as notify-trial-ending).
// Idempotent: stamps email_memory_expiry_sent_at on each household.
// The purge (purge-expired-memories) refuses to wipe any household whose
// stamp is missing or fresher than 24 hours — nobody loses memories unwarned.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendResendHtml } from "../_shared/resend-send.ts";
import { APP_URL, FROM_ADDRESS } from "../_shared/emails/base.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatNzDate(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString("en-NZ", { month: "long", day: "numeric", year: "numeric", timeZone: "Pacific/Auckland" });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildEmailHtml(vars: {
  firstName: string;
  familyName: string;
  cycleEndDate: string;
  memoryCount: number;
  retentionDays: number;
  exportUrl: string;
  keepUrl: string;
}): string {
  const plural = vars.memoryCount === 1 ? "memory" : "memories";
  const escape = escapeHtml;
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FBF7EC;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(60,47,38,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#FEE7B5 0%,#F9F6EF 100%);padding:32px 48px 28px;text-align:center;">
            <img src="https://tcpbvcgvtwrqsrzerwwr.supabase.co/storage/v1/object/public/assets/pointpals.logo.png" alt="PointPals" width="160" style="height:auto;display:block;margin:0 auto 16px;" />
            <div style="display:inline-block;background-color:#FFFFFF;border-radius:100px;padding:6px 18px;">
              <span style="font-size:12px;font-weight:700;color:#8A7F72;letter-spacing:0.08em;text-transform:uppercase;">Seasonal refresh</span>
            </div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 48px 16px;">
            <h1 style="margin:0 0 16px;font-family:'Zain','Georgia',serif;font-size:28px;font-weight:800;color:#3C2F26;line-height:1.25;">
              Your memory feed refreshes soon
            </h1>
            <p style="margin:0 0 16px;font-size:15px;color:#5C5247;line-height:1.7;">Hi ${escape(vars.firstName)},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#5C5247;line-height:1.7;">
              The <strong>${escape(vars.familyName)}</strong> family's memory feed refreshes on <strong>${escape(vars.cycleEndDate)}</strong>. That means the <strong>${vars.memoryCount} ${plural}</strong> from this season will be cleared to make room for the next one.
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#5C5247;line-height:1.7;">
              We keep your photos and videos for <strong>${vars.retentionDays} days</strong>, then delete them for good. It's a privacy feature, not a storage limit — we don't hoard your kids' photos.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#5C5247;line-height:1.7;">
              Before the refresh, you can turn this season into a keepsake:
            </p>
            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:linear-gradient(135deg,#FEE7B5,#FDDFA8);border-radius:16px;padding:24px 28px;">
                  <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#3C2F26;text-transform:uppercase;letter-spacing:0.07em;">What happens next</p>
                  <p style="margin:0;font-size:15px;color:#5C5247;line-height:1.7;">After ${escape(vars.cycleEndDate)}, this season's memories will be permanently removed from your feed. Any photos or videos you've added will be deleted from our servers.</p>
                </td>
              </tr>
            </table>
            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
              <tr>
                <td align="center">
                  <a href="${vars.exportUrl}" style="display:inline-block;background-color:#3C2F26;color:#FBF7EC;font-family:'Nunito Sans','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:100px;">Download your season montage →</a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#B5AFA9;text-align:center;line-height:1.6;">
              Prefer to keep the feed as it is? <a href="${vars.keepUrl}" style="color:#8A7F72;">Switch off seasonal refresh in Settings</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F9F6EF;padding:24px 48px;border-top:1px solid #EEE9E0;">
            <p style="margin:0;font-size:12px;color:#B5AFA9;line-height:1.6;">
              PointPals · hello@pointpals.co.nz · Proudly NZ-made 🇳🇿<br />
              <a href="https://pointpals.co.nz/privacy" style="color:#B5AFA9;">Unsubscribe</a> ·
              <a href="https://pointpals.co.nz/privacy" style="color:#B5AFA9;">Privacy</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // CRON_SECRET auth
  const cronSecret = Deno.env.get("CRON_SECRET");
  const xCron = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!cronSecret || (xCron !== cronSecret && authHeader !== `Bearer ${cronSecret}`)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("Missing RESEND_API_KEY");
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── FIND SEASONS ENDING IN 0–4 DAYS ─────────────────────────────────────
  // Window starts at "now" (not +1 day like trial-ending) so a household
  // whose end date slipped past is still warned before the purge — the purge
  // requires this stamp to be at least 24h old before it will touch anything.
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();

  const { data: households, error: hhErr } = await supabase
    .from("households")
    .select("id, name, memory_retention_days, memory_cycle_ends_at")
    .eq("memory_retention_enabled", true)
    .is("email_memory_expiry_sent_at", null)
    .gte("memory_cycle_ends_at", now.toISOString())
    .lte("memory_cycle_ends_at", windowEnd);

  if (hhErr) {
    console.error("household query error:", hhErr.message);
    return new Response(JSON.stringify({ ok: false, error: hhErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!households || households.length === 0) {
    console.log("No households with a memory season ending in 0–4 days.");
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Found ${households.length} households with a memory season ending soon.`);

  let sent = 0;
  const errors: string[] = [];

  for (const hh of households) {
    try {
      // Only email households that actually have memories to lose. Empty
      // feeds are rolled over silently by purge-expired-memories.
      const { count } = await supabase
        .from("memory_posts")
        .select("id", { count: "exact", head: true })
        .eq("household_id", hh.id);
      const memoryCount = count ?? 0;
      if (memoryCount === 0) {
        console.log(`Household ${hh.id} has an empty feed — skipping email`);
        continue;
      }

      // Primary admin/parent member (oldest = billing contact)
      const { data: members, error: memErr } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", hh.id)
        .in("role", ["admin", "parent"])
        .order("created_at", { ascending: true })
        .limit(1);

      if (memErr || !members || members.length === 0) {
        console.warn(`Household ${hh.id} has no admin/parent members — skipping`);
        continue;
      }

      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(
        members[0].user_id,
      );
      if (userErr || !userData?.user?.email) {
        console.warn(`User ${members[0].user_id} not found or has no email — skipping`);
        continue;
      }

      const email = userData.user.email;
      const meta = userData.user.user_metadata ?? {};
      const firstName = meta.first_name || meta.display_name || email.split("@")[0] || "there";
      const cycleEndDate = hh.memory_cycle_ends_at ? formatNzDate(hh.memory_cycle_ends_at) : "soon";

      const result = await sendResendHtml(resendKey, {
        to: email,
        from: FROM_ADDRESS,
        subject: `Your memory feed refreshes on ${cycleEndDate} — download your montage first`,
        html: buildEmailHtml({
          firstName,
          familyName: hh.name,
          cycleEndDate,
          memoryCount,
          retentionDays: hh.memory_retention_days ?? 90,
          exportUrl: `${APP_URL}/memories`,
          keepUrl: `${APP_URL}/settings`,
        }),
      });

      if (!result.ok) {
        console.warn(`Failed to send to ${email}: ${result.status} ${result.body}`);
        errors.push(`${email}: ${result.status}`);
        continue;
      }

      await supabase
        .from("households")
        .update({ email_memory_expiry_sent_at: new Date().toISOString() })
        .eq("id", hh.id);

      sent++;
      console.log(`Sent memory-expiry email to ${email} (${hh.name})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Error processing household ${hh.id}: ${msg}`);
      errors.push(`${hh.id}: ${msg}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, errors: errors.length > 0 ? errors : undefined }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
