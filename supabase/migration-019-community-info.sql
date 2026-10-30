-- "Info" tab of the /komuniti page: admin-posted announcements/FAQ, same
-- public-read pattern as creative_materials (migration-018).

create table if not exists public.community_info (
  id         bigserial primary key,
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists community_info_created_idx on public.community_info (created_at desc);

alter table public.community_info enable row level security;

create policy team_all on public.community_info for all to authenticated
  using (public.is_team()) with check (public.is_team());

create policy public_read on public.community_info for select to anon, authenticated using (true);
