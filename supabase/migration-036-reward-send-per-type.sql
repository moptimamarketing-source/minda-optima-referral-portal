-- Pisahkan mesej emel & WhatsApp "Hantar Poster Ganjaran" ikut jenis ganjaran
-- (Rebat Yuran / Voucher Buku / Touch 'n Go) supaya setiap satu boleh ada
-- syarat/cara tebus sendiri, bukan satu mesej generik untuk semua. Juga
-- tambah reward_poster_* (pilihan) untuk admin tukar design poster sendiri.
-- Buang baris lama yang generik (dah digantikan). Selamat dijalankan berulang kali.

delete from public.settings
  where key in ('reward_email_heading', 'reward_email_subtitle', 'reward_whatsapp_template');

insert into public.settings (key, value) values
  ('reward_email_heading_rebat_yuran', '🎁 Ganjaran Rebat Yuran Anda'),
  ('reward_email_subtitle_rebat_yuran', 'Tahniah! Poster (lengkap dengan kod) disertakan. Rebat akan direkodkan automatik pada bil yuran bulan berikutnya — anda tak perlu buat apa-apa untuk menebus.'),
  ('reward_email_heading_voucher_buku', '🎁 Ganjaran Voucher Buku Anda'),
  ('reward_email_subtitle_voucher_buku', 'Tahniah! Poster (lengkap dengan kod & tarikh luput) disertakan. Untuk menebus, hubungi Admin Operation melalui WhatsApp dengan kod voucher anda.'),
  ('reward_email_heading_tng', '🎁 Ganjaran Touch ''n Go Anda'),
  ('reward_email_subtitle_tng', 'Tahniah! Poster disertakan. Pindahan ke akaun Touch ''n Go eWallet anda diproses secara berkumpulan pada 1hb-5hb bulan berikutnya.'),
  ('reward_whatsapp_template_rebat_yuran', 'Salam {name}! Ganjaran Rebat Yuran anda dah sedia 🎉 Poster (dengan kod) baru je dimuat turun — sila lampirkan di sini. Rebat akan direkodkan automatik pada bil yuran bulan depan.'),
  ('reward_whatsapp_template_voucher_buku', 'Salam {name}! Ganjaran Voucher Buku anda dah sedia 🎉 Poster (dengan kod & tarikh luput) baru je dimuat turun — sila lampirkan di sini. Untuk tebus, reply je WhatsApp ni dengan kod voucher tu.'),
  ('reward_whatsapp_template_tng', 'Salam {name}! Ganjaran Touch ''n Go anda dah sedia 🎉 Poster baru je dimuat turun — sila lampirkan di sini. Pindahan akan diproses pada 1hb-5hb bulan depan.')
on conflict (key) do update set value = excluded.value;
