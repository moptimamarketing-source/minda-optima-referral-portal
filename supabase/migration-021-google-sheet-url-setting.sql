-- Seed the google_sheet_url setting so the admin's "Sync Google Sheet" link field
-- starts pre-filled instead of empty. Admin can change it anytime from admin.html.
insert into public.settings (key, value) values
  ('google_sheet_url', 'https://docs.google.com/spreadsheets/d/1NSi6hm2tVt1fyoqfFSgYRBiwNQfQ9lXjlTBKztsVGas/edit?gid=0#gid=0')
on conflict (key) do nothing;
