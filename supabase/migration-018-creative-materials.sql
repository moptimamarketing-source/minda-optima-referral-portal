-- "Bahan Kreatif" page: admin uploads marketing posters/images, copywriting text
-- templates, and videos for referrers to use when promoting the program.
-- Admin CRUD goes through netlify/functions/admin.mjs (service role key). The
-- public page (public/bahan.html) reads the list through
-- netlify/functions/creative.mjs (anon, read-only, only handled rows... actually
-- all rows since there's no moderation step here).

create table if not exists public.creative_materials (
  id           bigserial primary key,
  category     text not null check (category in ('image', 'text', 'video')),
  title        text not null,
  description  text,
  text_content text,
  file_path    text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists creative_materials_category_idx on public.creative_materials (category, sort_order, created_at desc);

alter table public.creative_materials enable row level security;

-- Team manages rows via the dashboard client (and netlify/functions/admin.mjs
-- with the service role key, which bypasses RLS regardless).
create policy team_all on public.creative_materials for all to authenticated
  using (public.is_team()) with check (public.is_team());

-- Anyone (including anon) can read the list — it's shown to logged-in referrers
-- via a public, no-password Netlify Function, same pattern as settings.mjs.
create policy public_read on public.creative_materials for select to anon, authenticated using (true);

-- Public storage bucket: referrers need to view/download files directly via
-- public URLs (no signed-URL step needed, unlike the private support-screenshots
-- bucket). Only the service role (admin.mjs) can write.
insert into storage.buckets (id, name, public, file_size_limit)
values ('creative-materials', 'creative-materials', true, 52428800)
on conflict (id) do nothing;

create policy public_read_files on storage.objects for select to anon, authenticated
  using (bucket_id = 'creative-materials');
