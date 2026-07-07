-- User-uploaded custom icons with auto background removal.
-- Each household can upload their own images and the app strips the
-- background (via Gemini 2.0 Flash) to produce transparent PNGs that
-- sit on the coloured tiles alongside the pre-made registry icons.

create table if not exists public.user_icons (
  id          uuid        primary key default gen_random_uuid(),
  household_id uuid       not null references public.households(id) on delete cascade,
  storage_path text       not null,
  label        text       not null default '',
  prompt       text       default null,      -- what the user named it
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz default null
);

create index if not exists idx_user_icons_household
  on public.user_icons(household_id)
  where deleted_at is null;

comment on table public.user_icons is
  'Custom icons uploaded by households, with Gemini-stripped backgrounds';

-- Row-level security — households see and manage their own icons.
alter table public.user_icons enable row level security;

create policy "households can view their own icons"
  on public.user_icons for select
  using (public.is_member(household_id));

create policy "households can insert their own icons"
  on public.user_icons for insert
  with check (public.is_member(household_id));

create policy "households can soft-delete their own icons"
  on public.user_icons for update
  using (public.is_member(household_id));

-- Storage bucket for uploaded icons
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- Allow public read access to assets bucket
create policy "public read access"
  on storage.objects for select
  using (bucket_id = 'assets');

-- Allow authenticated inserts to assets/uploads path
create policy "members can upload icons"
  on storage.objects for insert
  with check (
    bucket_id = 'assets'
    and auth.role() = 'authenticated'
  );
