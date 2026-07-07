// Companion mascot asset resolver — wires AI-generated mascot art from
// the Supabase Storage `assets` bucket. This is the single swap point:
// update COMPANION_URLS below and every caller uses the new URLs.

import {
  COMPANION_URLS,
  companionArtUrl,
} from "@/lib/image-urls";

// Per-kid avatar override (kid.id → companion id or URL). Empty by default;
// kids without an override render the vector companion face.
export const AVATAR_MAP: Record<string, string> = {};

export function companionImageUrl(seed: string): string | undefined {
  const v = AVATAR_MAP[seed];
  if (!v) return undefined;
  if (v.startsWith("http")) return v;
  return COMPANION_URLS[v];
}

// Re-export for convenience
export { companionArtUrl, COMPANION_URLS };
