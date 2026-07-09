import { execSync } from "child_process";
try {
  const out = execSync(
    `npx supabase db query "SELECT column_name FROM information_schema.columns WHERE table_name='households' AND column_name IN ('active_reward_name','active_reward_target')" --linked`,
    { encoding: "utf8", timeout: 15000, cwd: "C:\\point-pals-app" }
  );
  console.log(out);
} catch (e) {
  console.error("Error:", e.message);
  if (e.stdout) console.log("stdout:", e.stdout);
  if (e.stderr) console.log("stderr:", e.stderr);
}
