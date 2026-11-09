-- Let admin attach a file (or external link) to a Komuniti "Info/Pengumuman"
-- post, same as creative_materials. Stored in the same public bucket when
-- uploaded, or as a direct external URL when admin pastes a link instead.

alter table public.community_info add column if not exists file_path text;
