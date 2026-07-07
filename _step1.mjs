import { readFileSync, writeFileSync } from "fs";

// ── 1. Household type: add activeRewardName and activeRewardTarget ──
let appStore = readFileSync("src/lib/app-store.tsx", "utf8");

// Add fields to the Household type
appStore = appStore.replace(
  "sharedJarEnabled: boolean;\r\n};",
  "sharedJarEnabled: boolean;\r\n  activeRewardName: string | null;\r\n  activeRewardTarget: number | null;\r\n};",
);

writeFileSync("src/lib/app-store.tsx", appStore);
console.log("✅ app-store.tsx — Household type updated");

// ── 2. INITIAL_HOUSEHOLD: add activeReward fields ──
let mockData = readFileSync("src/lib/mock-data.ts", "utf8");

mockData = mockData.replace(
  "sharedJarEnabled: true,\r\n};",
  "sharedJarEnabled: true,\r\n  activeRewardName: null,\r\n  activeRewardTarget: null,\r\n};",
);

writeFileSync("src/lib/mock-data.ts", mockData);
console.log("✅ mock-data.ts — INITIAL_HOUSEHOLD updated");

// ── 3. mapHousehold: read new columns ──
let supabaseSync = readFileSync("src/lib/supabase-sync.ts", "utf8");

supabaseSync = supabaseSync.replace(
  "sharedJarEnabled: (row as { shared_jar_enabled?: boolean }).shared_jar_enabled ?? true,\r\n  };",
  "sharedJarEnabled: (row as { shared_jar_enabled?: boolean }).shared_jar_enabled ?? true,\r\n    activeRewardName: (row as { active_reward_name?: string | null }).active_reward_name ?? null,\r\n    activeRewardTarget: (row as { active_reward_target?: number | null }).active_reward_target ?? null,\r\n  };",
);

writeFileSync("src/lib/supabase-sync.ts", supabaseSync);
console.log("✅ supabase-sync.ts — mapHousehold updated");
