-- Memory composer v2 fixes.
--
-- 1. Caption-only and voice-note-only posts are allowed (the composer's Post
--    button always promised this) — storage_path becomes nullable, and a
--    media_type records what the path points at.
-- 2. transcribe-memory rate-limit ledger, mirroring icon_generations: one row
--    per transcription so the edge function can enforce a monthly cap per
--    household without a new counting scheme.

alter table public.memory_posts alter column storage_path drop not null;
alter table public.memory_posts
  add column if not exists media_type text
  check (media_type in ('image', 'video') or media_type is null);

create table if not exists public.transcriptions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  duration_sec int,
  created_at   timestamptz not null default now()
);
create index if not exists transcriptions_household_month_idx
  on public.transcriptions(household_id, created_at desc);

alter table public.transcriptions enable row level security;
-- Written by the edge function's service-role client only; members may read
-- their own usage (e.g. to show "N transcriptions left this month" later).
create policy transcriptions_select on public.transcriptions
  for select to authenticated using (public.is_member(household_id));
grant select on public.transcriptions to authenticated;
grant all on public.transcriptions to service_role;
