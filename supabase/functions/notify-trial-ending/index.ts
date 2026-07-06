// Edge Function: notify-trial-ending
// Cron-driven: finds households whose 14-day free trial ends in ~3 days and
// sends a nudge email via the Resend trial-ending template.
//
// Scheduled via CRON_SECRET auth pattern.
// Idempotent: stamps email_trial_ending_sent_at on each household.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendResendTemplate } from "../_shared/resend-send.ts";
import { TEMPLATES } from "../_shared/email-templates.ts";
import { APP_URL, FROM_ADDRESS } from "../_shared/emails/base.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: format a UTC ISO string as a readable NZ date (e.g. "9 July 2026").
function formatNzDate(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString("en-NZ", { month: "long", day: "numeric", year: "numeric", timeZone: "Pacific/Auckland" });
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

  // ── FIND TRIALS ENDING IN 1–4 DAYS ──────────────────────────────────────
  // Window: trial_ends_at between 1 day from now and 4 days from now.
  // This catches households with ~3 days left. The idempotency stamp
  // (email_trial_ending_sent_at) prevents re-sending.
  const now = new Date();
  const windowStart = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();

  const { data: households, error: hhErr } = await supabase
    .from("households")
    .select("id, name, shared_pool, reward_target, trial_ends_at")
    .eq("subscription_status", "trialing")
    .is("email_trial_ending_sent_at", null)
    .gte("trial_ends_at", windowStart)
    .lte("trial_ends_at", windowEnd);

  if (hhErr) {
    console.error("household query error:", hhErr.message);
    return new Response(JSON.stringify({ ok: false, error: hhErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!households || households.length === 0) {
    console.log("No households found with trial ending in 1–4 days.");
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Found ${households.length} households with trial ending soon.`);

  let sent = 0;
  const errors: string[] = [];

  for (const hh of households) {
    try {
      // ── FIND THE PRIMARY ADMIN MEMBER ──────────────────────────────────
      // Pick the oldest member (they're the billing contact).
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

      const userId = members[0].user_id;

      // ── LOOK UP THE USER'S EMAIL ───────────────────────────────────────
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId);
      if (userErr || !userData?.user?.email) {
        console.warn(`User ${userId} not found or has no email — skipping`);
        continue;
      }

      const email = userData.user.email;
      const meta = userData.user.user_metadata ?? {};
      const firstName = meta.first_name || meta.display_name || email.split("@")[0] || "there";

      // ── CALCULATE TEMPLATE VARIABLES ───────────────────────────────────
      const pctFull = hh.reward_target > 0
        ? Math.min(100, Math.round((hh.shared_pool * 100) / hh.reward_target))
        : 0;

      const trialEndDate = hh.trial_ends_at ? formatNzDate(hh.trial_ends_at) : "soon";
      const totalPoints = hh.shared_pool;

      // Approximate streak: count how many of the last 14 days have at
      // least one point event. We use a single SELECT with a manual date
      // range and then calculate distinct days from the returned results.
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentEvents } = await supabase
        .from("point_events")
        .select("created_at")
        .eq("household_id", hh.id)
        .gte("created_at", fourteenDaysAgo)
        .order("created_at", { ascending: false });

      let streak = 0;
      if (recentEvents && recentEvents.length > 0) {
        const days = new Set<string>();
        for (const ev of recentEvents) {
          const day = ev.created_at.slice(0, 10); // "2026-07-06"
          days.add(day);
        }
        // Find the longest trailing consecutive-day streak
        const sorted = [...days].sort().reverse();
        streak = 1;
        for (let i = 1; i < sorted.length; i++) {
          const prev = new Date(sorted[i - 1]);
          const curr = new Date(sorted[i]);
          const diffMs = prev.getTime() - curr.getTime();
          if (Math.round(diffMs / (24 * 60 * 60 * 1000)) === 1) {
            streak++;
          } else {
            break; // gap found — streak is from the most recent day backwards
          }
        }
      }

      // ── SEND THE EMAIL ─────────────────────────────────────────────────
      const result = await sendResendTemplate(resendKey, {
        to: email,
        templateId: TEMPLATES.TRIAL_ENDING,
        from: FROM_ADDRESS,
        variables: {
          pct_full: pctFull,
          first_name: firstName,
          trial_end_date: trialEndDate,
          family_name: hh.name,
          total_points: totalPoints,
          streak: streak,
          checkout_url: `${APP_URL}/subscribe`,
        },
      });

      if (!result.ok) {
        console.warn(`Failed to send to ${email}: ${result.status} ${result.body}`);
        errors.push(`${email}: ${result.status}`);
        continue;
      }

      // ── STAMP IDEMPOTENCY ──────────────────────────────────────────────
      await supabase
        .from("households")
        .update({ email_trial_ending_sent_at: new Date().toISOString() })
        .eq("id", hh.id);

      sent++;
      console.log(`Sent trial-ending email to ${email} (${hh.name})`);
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
