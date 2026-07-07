import { readFileSync, writeFileSync } from "fs";

let content = readFileSync("src/lib/correction-store.tsx", "utf8");

// 1) After the localStorage hydration effect, add a live-mode hydration effect
//    that reads the active reward from the household row.
const hydEnd = "setHydrated(true);\r\n  }, [])";
content = content.replace(
  hydEnd,
  "setHydrated(true);\r\n  }, []);\r\n\r\n  // Live mode: hydrate active reward from household row (server source of truth).\r\n  useEffect(() => {\r\n    if (!live || !household.id) return;\r\n    if (household.activeRewardName) {\r\n      setActiveRewardState({\r\n        name: household.activeRewardName,\r\n        targetPoints: household.activeRewardTarget ?? household.rewardTarget,\r\n      });\r\n    } else {\r\n      setActiveRewardState(null);\r\n    }\r\n  }, [live, household.id, household.activeRewardName, household.activeRewardTarget]);",
);

// 2) Add DB sync to the persist effect
const persistBlock = `  // Persist on change (both modes — the active reward has no server home yet,
  // and a cached copy of history is harmless if the server list loads over it).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(REWARD_KEY, JSON.stringify({ activeReward, rewardHistory }));
    } catch {
      /* storage blocked — session-only */
    }
  }, [activeReward, rewardHistory, hydrated]);`;

const persistReplacement = `  // Persist on change (both modes). localStorage is the primary store for demo;
  // live mode also syncs to the households table so the reward survives browser clears.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(REWARD_KEY, JSON.stringify({ activeReward, rewardHistory }));
    } catch {
      /* storage blocked — session-only */
    }
    if (live && household.id) {
      const name = activeReward?.name ?? null;
      const target = activeReward?.targetPoints ?? null;
      db.from("households").update({ active_reward_name: name, active_reward_target: target }).eq("id", household.id).then();
    }
  }, [activeReward, rewardHistory, hydrated, live, household.id]);`;

content = content.replace(persistBlock, persistReplacement);

writeFileSync("src/lib/correction-store.tsx", content);
console.log("✅ correction-store.tsx — DB persistence added");
