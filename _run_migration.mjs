import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const SUPABASE_URL = "https://tcpbvcgvtwrqsrzerwwr.supabase.co";
const SERVICE_KEY = "eyJhbG…I-wQ";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const sql = readFileSync("supabase/migrations/20260711000001_active_reward_columns.sql", "utf8");

const { data, error } = await supabase.rpc("exec_sql", { sql });
if (error) {
  console.error("Migration failed:", error.message);
  process.exit(1);
}
console.log("Migration applied successfully:", data);
