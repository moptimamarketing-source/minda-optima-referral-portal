-- Kemas kini kandungan (T&C, FAQ, hero, dsb) ikut keputusan mesyuarat HR (Nov 2026):
-- ganjaran flat RM50 (Rebat Yuran/Voucher Buku), tiada kelas percuma, kelayakan = daftar +
-- bayar yuran + 3 sesi kehadiran, kod hanya dipaparkan selepas akaun disahkan.
-- Guna "do update" supaya teks lama (RM100/kelas percuma) digantikan terus.
-- Jalankan sekali di Supabase > SQL Editor. Selamat dijalankan berulang kali.

insert into public.settings (key, value) values
  ('hero_title_line2', 'Dapat Ganjaran!'),
  ('hero_subtitle', 'Kawan anda daftar, bayar yuran & anak hadir kelas — anda layak ganjaran RM50 (Rebat Yuran atau Voucher Buku)!'),
  ('step2_desc', 'Kawan guna kod anda semasa daftar, bayar yuran dan hantar anak ke kelas.'),
  ('step3_title', 'Dapat Ganjaran RM50'),
  ('step3_desc', 'Anda layak ganjaran (Rebat Yuran/Voucher Buku) apabila anak mereka hadir sekurang-kurangnya 3 sesi kelas.'),
  ('cta_heading', 'Mula Kongsi & Dapat Ganjaran!'),
  ('cta_sub', 'Daftar sebagai Rakan Rujukan dan layak ganjaran RM50 untuk setiap rujukan berjaya.'),
  ('login_hero_benefits', '🎁 Ganjaran RM50 — Rebat Yuran atau Voucher Buku'),
  ('reward_terms', 'Kawan anda mesti DAFTAR, BAYAR YURAN dan anak HADIR SEKURANG-KURANGNYA 3 SESI KELAS (bukan sekadar intro) untuk anda layak ganjaran.'),
  ('promo_banner_text', 'Kongsi Peluang, Dapat Ganjaran! Setiap rujukan berjaya layak ganjaran RM50 (Rebat Yuran/Voucher Buku).'),
  ('share_message_template', 'Anak saya dah pandai baca dengan Minda Optima! Guna kod *{code}* bila kawan saya daftar — saya layak ganjaran RM50 (Rebat Yuran/Voucher Buku) 🎉 👉 {url}')
on conflict (key) do update set value = excluded.value;

insert into public.settings (key, value) values
  ('syarat_items', 'Ibu bapa/penjaga wajib membaca dan bersetuju dengan Terma & Syarat ini semasa mendaftar.
Program ini terbuka kepada ibu bapa/penjaga sedia ada Minda Optima sahaja.
Kod rujukan hanya boleh digunakan oleh rakan yang belum pernah berdaftar dengan Minda Optima.
Akaun Rakan Rujukan perlu disahkan oleh pihak kami sebelum kod dan maklumat penuh program dipaparkan.
Rujukan yang didaftarkan tanpa kod rujukan yang sah tidak layak menerima ganjaran.
Rakan yang dirujuk mesti berjaya mendaftar, membayar yuran kelas, dan anak mereka hadir sekurang-kurangnya 3 sesi kelas.
Ganjaran sebanyak RM50 akan ditahan sehingga semua syarat di atas dipenuhi.
Ganjaran diberikan dalam bentuk Rebat Yuran atau Voucher Buku (pilihan Rakan Rujukan), bukan tunai.
Kami berhak menolak rujukan atau membatalkan akaun jika didapati maklumat palsu atau cubaan penipuan.
Rayuan terhadap penolakan boleh dibuat melalui Sokongan.
Kami berhak meminda Terma & Syarat ini pada bila-bila masa tanpa notis terdahulu.
Keputusan kami mengenai kelayakan dan kelulusan adalah muktamad.')
on conflict (key) do update set value = excluded.value;

insert into public.settings (key, value) values
  ('syarat_notes', 'Tiada had bilangan rujukan.
Pendaftaran sebagai Rakan Rujukan tidak disekat — hanya kelulusan dan ganjaran yang menunggu pengesahan akaun.
Ganjaran tidak boleh ditukar kepada tunai.
Maklumat anak digunakan semata-mata untuk tujuan pengesahan.')
on conflict (key) do update set value = excluded.value;

insert into public.settings (key, value) values
  ('approved_email_heading', '✓ Rujukan Anda Layak!'),
  ('approved_email_subtitle', 'Tahniah! Rujukan anda telah disahkan memenuhi kriteria program kami.'),
  ('paid_email_heading', '🎉 Ganjaran Ditebus!'),
  ('paid_email_subtitle', 'Ganjaran anda telah berjaya ditebus.')
on conflict (key) do update set value = excluded.value;

insert into public.settings (key, value) values
  ('faq1_q', 'Apa itu kod rujukan dan macam mana cara guna?'),
  ('faq1_a', 'Kod rujukan adalah kod unik anda (cth: MO-2531-YHLA). Kongsi kod ini kepada ibu bapa lain. Bila mereka daftar menggunakan kod anda dan layak, anda akan menerima ganjaran RM50 (Rebat Yuran atau Voucher Buku).'),
  ('faq2_q', 'Bila saya layak dapat ganjaran?'),
  ('faq2_a', 'Anda layak apabila rakan yang dirujuk berjaya mendaftar, membayar yuran, dan anak mereka hadir sekurang-kurangnya 3 sesi kelas. Selepas disahkan, status bertukar "Layak" dan anda boleh pilih ganjaran di dashboard.'),
  ('faq3_q', 'Bila saya boleh kongsi kod rujukan saya?'),
  ('faq3_a', 'Kod rujukan anda hanya dipaparkan selepas akaun disahkan oleh pasukan kami. Anda akan menerima emel sebaik sahaja akaun disahkan.'),
  ('faq4_q', 'Kenapa status rujukan saya masih "Menunggu"?'),
  ('faq4_a', 'Status "Menunggu" bermakna rakan sudah didaftarkan tapi belum memenuhi semua syarat (daftar, bayar yuran, 3 sesi kehadiran). Selepas lengkap, status akan berubah menjadi "Layak".'),
  ('faq5_q', 'Bagaimana ganjaran RM50 diberikan?'),
  ('faq5_a', 'Ganjaran diberikan dalam bentuk Rebat Yuran atau Voucher Buku, bukan tunai. Selepas anda pilih di dashboard, satu kod digital dijana — hubungi Admin Operation melalui WhatsApp untuk menebusnya.'),
  ('faq6_q', 'Boleh ke saya kongsi kod rujukan dengan lebih dari seorang ibu bapa?'),
  ('faq6_a', 'Boleh! Kod rujukan anda tiada had penggunaan. Kongsikan kepada seramai mana ibu bapa yang anda mahu, dan setiap pendaftaran berjaya menggunakan kod anda akan dikira sebagai satu rujukan yang berasingan.')
on conflict (key) do update set value = excluded.value;
