-- =============================================================================
-- PointPals — Member display names
-- Each household member can set a display name that shows in the member list.
-- The existing members_update RLS policy already allows user_id = auth.uid()
-- to update their own row, so no new policy is needed.
-- =============================================================================

alter table if exists public.household_members
  add column if not exists display_name text;
