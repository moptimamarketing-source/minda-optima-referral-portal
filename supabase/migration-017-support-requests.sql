-- Support request form (replaces the direct-to-WhatsApp "Hubungi Sokongan" link).
-- Parent fills in a form (name, account/code, problem, optional screenshot) via the
-- netlify/functions/support.mjs function (service role key — no anon table/storage
-- access needed); team reviews submissions in admin.html and WhatsApps them back.

create table if not exists public.support_requests (
  id              bigserial primary key,
  name            text not null,
  account_code    text,
  problem         text not null,
  screenshot_path text,
  handled         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists support_requests_created_idx on public.support_requests (created_at desc);

alter table public.support_requests enable row level security;

-- No public/anon policies at all: the browser never talks to this table directly.
-- Submissions and screenshot uploads go through netlify/functions/support.mjs
-- (service role key, bypasses RLS). Team can still read/update via the dashboard
-- client if ever needed.
create policy team_read on public.support_requests for select to authenticated using (public.is_team());
create policy team_update on public.support_requests for update to authenticated
  using (public.is_team()) with check (public.is_team());

-- Private storage bucket for screenshots. Only the service role (used by
-- netlify/functions/support.mjs and admin.mjs) can read or write — no anon/
-- authenticated policies, so nothing here needs a storage.objects policy.
insert into storage.buckets (id, name, public)
values ('support-screenshots', 'support-screenshots', false)
on conflict (id) do nothing;
