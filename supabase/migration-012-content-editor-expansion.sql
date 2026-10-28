-- Default values for the expanded Content Editor fields (landing page steps, syarat modal,
-- login hero, dashboard labels, FAQ). Admin can edit all of these afterwards.
insert into public.settings (key, value) values
  ('hero_badge_label', 'Program Rujukan Minda Optima'),
  ('how_it_works_title', 'Cara Kerja'),
  ('how_it_works_subtitle', '3 langkah mudah je'),
  ('step1_title', 'Share Kod'),
  ('step1_desc', 'Log masuk, dapatkan kod rujukan unik anda dan kongsi di WhatsApp.'),
  ('step2_title', 'Kawan Daftar'),
  ('step2_desc', 'Kawan guna kod anda semasa daftar dan dapat satu sesi kelas PERCUMA.'),
  ('step3_title', 'Dapat RM100'),
  ('cta_button_label', 'Dapatkan Kod Rujukan Saya'),
  ('reward_terms', 'Kawan anda mesti DAFTAR dan HADIR KELAS (bukan sekadar intro atau isi borang) untuk terima reward.'),
  ('syarat_items', 'Ibu bapa atau penjaga mendaftarkan anak menggunakan kod rujukan anda.
Anak mereka mesti menghadiri sesi kelas percuma pertama bersama Minda Optima.
Selepas kehadiran disahkan, status rujukan akan berubah kepada "Diluluskan/Approved" dalam tempoh 1–2 hari.
Ganjaran akan dihantar ke nombor Touch ''n Go eWallet yang didaftarkan dalam tempoh 3–5 hari bekerja.'),
  ('syarat_notes', 'Sesi percuma adalah kelas pertama sahaja. Tidak termasuk intro atau ujian.
Tiada had bilangan rujukan. Kamu boleh refer sebanyak yang kamu mahu.'),
  ('login_hero_title_line1', 'Kongsi Peluang,'),
  ('login_hero_title_line2', 'Nikmati Ganjaran'),
  ('dashboard_code_label', 'Kod Rujukan Anda'),
  ('dashboard_share_heading', 'Kongsi di WhatsApp'),
  ('faq1_q', 'Apa itu kod rujukan dan macam mana cara guna?'),
  ('faq1_a', 'Kod rujukan adalah kod unik anda (cth: MO-2531-YHLA). Kongsi kod ini kepada ibu bapa lain. Bila mereka daftar anak menggunakan kod anda, mereka akan dapat satu sesi percuma dan anda akan layak untuk RM100.'),
  ('faq2_q', 'Bila saya layak dapat RM100?'),
  ('faq2_a', 'Anda layak dapat RM100 apabila anak yang dirujuk didaftarkan melalui kod anda, dan hadir ke sesi pertama (kelas pertama percuma). Selepas itu, admin akan proses payout dalam 3-5 hari kerja.'),
  ('faq3_q', 'Kawan saya dah daftar, bila reward saya masuk?'),
  ('faq3_a', 'Selepas kawan anda daftar dan anak mereka hadir ke kelas, status akan berubah menjadi "Approved". Payout akan dilakukan dalam 3-5 hari kerja ke akaun Touch ''n Go yang didaftarkan.'),
  ('faq4_q', 'Kenapa status rujukan saya masih "Pending"?'),
  ('faq4_a', 'Status "Pending" bermakna anak yang dirujuk dah daftar tapi belum hadir ke kelas lagi. Selepas hadir ke sesi pertama, status akan berubah menjadi "Approved" dan anda akan layak untuk reward.'),
  ('faq5_q', 'Bila dan bagaimana RM100 akan dibayar?'),
  ('faq5_a', 'RM100 akan dibayar terus ke nombor Touch ''n Go yang anda daftarkan semasa sign-up. Payout dilakukan dalam 3-5 hari kerja selepas anak yang dirujuk hadir ke kelas.'),
  ('faq6_q', 'Boleh ke saya kongsi kod rujukan dengan lebih dari seorang ibu bapa?'),
  ('faq6_a', 'Boleh! Kod rujukan anda tiada had penggunaan. Kongsikan kepada seramai mana ibu bapa yang anda mahu, dan setiap pendaftaran berjaya menggunakan kod anda akan dikira sebagai satu rujukan yang berasingan.')
on conflict (key) do nothing;
