-- Add active_reward_name and active_reward_target columns to households
-- so the active reward persists server-side across devices and browser clears.

ALTER TABLE households
  ADD COLUMN active_reward_name text,
  ADD COLUMN active_reward_target integer DEFAULT 100;

-- Backfill existing rows: use the reward_target as a sensible default for
-- active_reward_target so the family jar doesn't break.
UPDATE households
  SET active_reward_target = reward_target
  WHERE active_reward_target IS NULL;
