-- Jadikan maklumat syarikat di footer (nama, no. pendaftaran, alamat) boleh
-- edit oleh admin di Content Editor, bukan hardcode lagi. Seed dengan nilai
-- sedia ada supaya tiada perubahan visual sehingga admin sendiri ubah.
--
-- Juga tambah community_enabled — toggle berasingan daripada community_link
-- untuk admin boleh sorok Kad Komuniti (WhatsApp/Telegram) sementara waktu
-- tanpa perlu buang link yang dah disimpan. Diset 'false' sekarang kerana
-- komuniti WhatsApp belum sedia lagi.
--
-- Selamat dijalankan berulang kali.

insert into public.settings (key, value) values
  ('footer_company_name', 'Pusat Tuisyen Minda Optima Sdn. Bhd.'),
  ('footer_registration_no', '201601014023 (1184954-W)'),
  ('footer_address', 'Lot 1029, Tingkat 1, Jalan Samudera Utama, Taman Samudra, 68100 Batu Caves, Selangor'),
  ('community_enabled', 'false')
on conflict (key) do update set value = excluded.value;
