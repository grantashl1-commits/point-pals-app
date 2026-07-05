// Speech-to-text for the memory composer (composer v2): a child narrates a
// photo, the recording is transcribed straight into the caption field.
//
// RATE-LIMITED per household per calendar month (same guardrail pattern as
// generate-icon; ledger: public.transcriptions). Provider-agnostic: wired for
// OpenAI Whisper when OPENAI_API_KEY is set, otherwise returns a clear
// "not configured" error so the client can fall back to keeping the audio.
//
// Deploy: `supabase functions deploy transcribe-memory`
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const FREE_MONTHLY_CAP = 20;
const PREMIUM_MONTHLY_CAP = 200;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // ~90s of opus is well under this

function monthStartISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { householdId, audioBase64, mimeType, durationSec } = await req.json();
    if (!householdId || !audioBase64) return json({ error: "Missing householdId/audio" }, 400);

    const { data: household, error: hErr } = await admin
      .from("households")
      .select("subscription_status")
      .eq("id", householdId)
      .single();
    if (hErr || !household) return json({ error: "Unknown household" }, 404);

    const premium =
      household.subscription_status === "active" || household.subscription_status === "trialing";
    const cap = premium ? PREMIUM_MONTHLY_CAP : FREE_MONTHLY_CAP;

    const { count, error: cErr } = await admin
      .from("transcriptions")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .gte("created_at", monthStartISO());
    if (cErr) return json({ error: "rate check failed" }, 500);
    if ((count ?? 0) >= cap) {
      return json({ error: "monthly_limit_reached", cap, used: count, premium }, 429);
    }

    const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
    if (bytes.length > MAX_AUDIO_BYTES) return json({ error: "audio too large" }, 413);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return json({ error: "transcription_not_configured" }, 503);
    }

    const form = new FormData();
    form.append(
      "file",
      new Blob([bytes], { type: mimeType || "audio/webm" }),
      "recording.webm",
    );
    form.append("model", "whisper-1");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return json({ error: "provider_failed", detail: detail.slice(0, 300) }, 502);
    }
    const out = (await res.json()) as { text?: string };

    await admin.from("transcriptions").insert({
      household_id: householdId,
      duration_sec: typeof durationSec === "number" ? Math.round(durationSec) : null,
    });

    // The raw transcript is returned verbatim — no auto-correction. Kids'
    // phrasing is the charm; the parent edits (or doesn't) in the caption box.
    return json({ ok: true, text: out.text ?? "", remaining: cap - (count ?? 0) - 1 });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "transcription failed" }, 500);
  }
});
