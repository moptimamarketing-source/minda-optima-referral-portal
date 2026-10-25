-- Minda Optima Referral: tetapan & kandungan page (promo, reward, nombor sokongan, komuniti,
-- teks hero/CTA/mesej share) yang boleh diedit dari admin.html tanpa perlu push code atau pergi
-- Netlify. Tampal dalam Supabase > SQL Editor > Run. Selamat dijalankan berulang kali.

delete from public.settings where key = 'telegram_url';

insert into public.settings (key, value) values
  -- Promo & reward (dipakai untuk kira reward sebenar bila referral ditambah, dan untuk countdown).
  -- Set promo_enabled ke 'false' untuk sembunyikan semua banner/countdown promo (reward_before jadi reward tetap).
  ('promo_enabled', 'true'),
  ('promo_deadline', '2026-12-31T23:59:59+08:00'),
  ('reward_before', '100'),
  ('reward_after', '50'),
  ('support_phone', '601158526817'),

  -- Teks hero (index.html)
  ('hero_title_line1', 'Jemput Kawan,'),
  ('hero_title_line2', 'Dapat RM100!'),
  ('hero_subtitle', 'Kongsi kod rujukan anda dengan ibu bapa lain. Bila mereka daftar, anak mereka dapat 1 kelas percubaan PERCUMA dan anda dapat RM100 Touch ''n Go.'),
  ('step3_desc', 'Anda terima RM100 Touch ''n Go untuk setiap rujukan yang berjaya.'),
  ('cta_heading', 'Refer sebelum 31 Dis — RM100!'),
  ('cta_sub', 'Selepas tarikh ini, ganjaran turun ke RM50 sahaja.'),

  -- Promo banner (dashboard.html)
  ('promo_banner_text', '🔥 TAWARAN TERHAD: Refer sebelum 31 Dis — RM100 TnG! Selepas tu RM50 je.'),

  -- Kad komuniti (dashboard.html) — teks, warna (telegram/whatsapp/brand) & link semua boleh tukar.
  ('community_title', 'Komuniti Telegram'),
  ('community_desc', 'Dapatkan update, tips dan pengumuman rasmi Minda Optima.'),
  ('community_button_label', 'Sertai Komuniti Telegram'),
  ('community_link', 'https://t.me/mindaoptimaofficial'),
  ('community_color', 'telegram'),

  -- Mesej share WhatsApp (dashboard.html). Kekalkan token {code} dan {url}.
  ('share_message_template', 'Anak saya dah pandai baca dengan Minda Optima! Guna kod *{code}* bila daftar, anak dapat 1 kelas PERCUMA & saya dapat RM100 🎉 👉 {url}')
on conflict (key) do nothing;
