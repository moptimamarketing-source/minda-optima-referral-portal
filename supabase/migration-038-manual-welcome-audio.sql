-- Link manual pengguna (Google Drive) admin-editable, dipaparkan di dashboard
-- sekali dengan Video Tutorial. Juga tambah audio mesej selamat datang yang
-- auto-play bila parent buka dashboard — admin boleh on/off, tukar label,
-- atau override link audio sendiri (kosong = guna fail lalai /welcome-vo.mp3).
--
-- Selamat dijalankan berulang kali.

insert into public.settings (key, value) values
  ('user_manual_link', 'https://drive.google.com/file/d/1ECr9zsHqfPUvgOMcMD3quaCbomYr9ti-/view?usp=sharing'),
  ('welcome_audio_enabled', 'true'),
  ('welcome_audio_url', ''),
  ('welcome_audio_label', 'Mesej dari Minda Optima')
on conflict (key) do update set value = excluded.value;
