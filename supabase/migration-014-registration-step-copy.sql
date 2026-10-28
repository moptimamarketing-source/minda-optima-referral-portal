-- Make the "Lengkapkan Profil Anda" (name + occupation) registration step
-- copy editable via Content Editor. Seed defaults matching current hardcoded text.

insert into public.settings (key, value) values
  ('reg_heading', 'Lengkapkan Profil Anda'),
  ('reg_subtitle', 'Sila isi maklumat di bawah untuk menjadi rujukan Minda Optima.'),
  ('reg_name_label', 'Nama Penuh'),
  ('reg_occupation_label', 'Pekerjaan (Pilihan)'),
  ('reg_submit_label', 'Daftar Sekarang')
on conflict (key) do nothing;
