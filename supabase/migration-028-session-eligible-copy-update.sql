-- Kemas kini kandungan selepas tambah status "Eligible"/"Syarat Lengkap" dan
-- penjejakan kehadiran sesi (sessions_attended). Jalankan selepas migration-027.
-- Selamat dijalankan berulang kali.

insert into public.settings (key, value) values
  ('hero_badge_label', 'Program Referral Minda Optima'),
  ('hero_subtitle', 'Kawan anda daftar, bayar yuran & anak hadir kelas — anda layak ganjaran RM50 TnG, Rebat Yuran atau Voucher Buku❗🎉'),
  ('how_it_works_title', 'Cara Dapat RM50'),
  ('how_it_works_subtitle', 'Ikuti 3 langkah mudah'),
  ('step1_title', 'Dapatkan Kod'),
  ('step1_desc', 'Daftar sebagai Rakan Rujukan. Selepas akaun disahkan, kod unik anda akan dipaparkan.'),
  ('step2_title', 'Kongsi dengan Kawan'),
  ('step2_desc', 'Kawan yang belum pernah mendaftar masukkan kod anda semasa pendaftaran dan bayar yuran kelas.'),
  ('step3_title', 'Pilih Ganjaran RM50'),
  ('step3_desc', 'Selepas anak kawan hadir sekurang-kurangnya 3 sesi kelas dan syarat disahkan, pilih Rebat Yuran, Voucher Buku atau TnG. Akaun Touch ''n Go eWallet diperlukan untuk pilihan TnG.'),
  ('promo_banner_text', 'Kongsi Peluang, Dapat Ganjaran! Setiap rujukan berjaya layak ganjaran RM50 TnG, Rebat Yuran atau Voucher Buku.'),
  ('share_message_template', 'Anak saya dah pandai baca dengan Minda Optima! Guna kod *{code}* bila kawan saya daftar — saya layak ganjaran RM50 TnG, Rebat Yuran atau Voucher Buku 🎉 👉 {url}')
on conflict (key) do update set value = excluded.value;

insert into public.settings (key, value) values
  ('faq4_a', 'Pending bermaksud kawan masih berurusan dengan team sales. Layak bermaksud kawan sudah enroll dan sedang melengkapkan 3 sesi. Selepas 3 sesi dan bayaran disahkan, status jadi Syarat Lengkap; semakan mengambil masa maksimum 5 hari bekerja.'),
  ('faq5_a', 'Ganjaran diberikan dalam bentuk Rebat Yuran, Voucher Buku, atau Touch ''n Go (perlu mempunyai akaun Touch ''n Go eWallet). Selepas anda pilih di dashboard, satu kod digital dijana — hubungi Admin Operation melalui WhatsApp untuk menebusnya.')
on conflict (key) do update set value = excluded.value;

insert into public.settings (key, value) values
  ('syarat_items', 'Terbuka khusus untuk ibu bapa/penjaga sedia ada Minda Optima.
Wajib membaca dan bersetuju (tick) dengan Terma & Syarat semasa mendaftar.
Nombor telefon mesti sah dan sepadan dengan rekod sedia ada Minda Optima.
Akaun Rakan Rujukan perlu disahkan admin dahulu — kod & maklumat penuh tidak dipaparkan sehingga disahkan.
Kod rujukan hanya boleh digunakan oleh rakan yang belum pernah berdaftar dengan Minda Optima.
Rujukan tanpa kod rujukan yang sah tidak layak menerima ganjaran.
Rakan yang dirujuk mesti berjaya mendaftar, membayar yuran kelas, dan anak hadir sekurang-kurangnya 3 sesi kelas.
Ganjaran RM50 ditahan sehingga semua syarat di atas disahkan oleh pasukan Minda Optima.
Ganjaran diberikan dalam bentuk Rebat Yuran, Voucher Buku, atau Touch ''n Go (perlu akaun eWallet) — bukan tunai terus.
Pilihan ganjaran hanya boleh dibuat selepas status rujukan "Syarat Lengkap".
Penebusan kod ganjaran dibuat secara manual melalui WhatsApp dengan Admin Operation.
Minda Optima berhak menolak rujukan atau membatalkan akaun jika maklumat palsu atau cubaan penipuan dikesan.
Keputusan Minda Optima mengenai kelayakan dan kelulusan adalah muktamad.
Minda Optima berhak meminda Terma & Syarat ini pada bila-bila masa tanpa notis terdahulu.')
on conflict (key) do update set value = excluded.value;
