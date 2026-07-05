-- Reports feature — point_events attribution.
--
-- point_events is an append-only ledger: every award ever made survives a
-- reward-claim reset forever (the claim action only zeroes the DERIVED
-- kids.current_points and the pool — it never deletes or alters point_events).
-- The Reports screen depends on that permanence.
--
-- Add who made each award so reports can show "by {name}". Historic rows stay
-- null and render as "—".

alter table public.point_events
  add column if not exists awarded_by uuid references auth.users(id) on delete set null;
