-- =============================================================================
-- PointPals — Member display names
-- Each household member can set a display name that shows in the member list.
-- The existing members_update RLS policy already allows user_id = auth.uid()
-- to update their own row, so no new policy is needed.
--
-- 🔮 Future: When Google/Facebook OAuth is added, this column will store the
--            profile display name returned by the IdP on first sign-in.
--            The registration flow should NOT ask for first/last name — just
--            pre-fill this from the IdP and let the user tweak it in Settings.
--            This avoids redundant name prompts and keeps a single source of
--            truth for how someone appears in the household member list.
-- =============================================================================

alter table if exists public.household_members
  add column if not exists display_name text;

comment on column public.household_members.display_name is
  'Display name for this member. On future Google/Facebook OAuth sign-in, this will be pre-filled from the IdP profile.';
