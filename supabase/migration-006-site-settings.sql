-- Minda Optima Referral: tetapan laman (promo, reward, nombor sokongan, link komuniti) yang
-- boleh diedit dari admin.html tanpa perlu push code atau pergi Netlify. Tampal dalam Supabase
-- > SQL Editor > Run. Selamat dijalankan berulang kali.

insert into public.settings (key, value) values
  ('promo_deadline', '2026-12-31T23:59:59+08:00'),
  ('reward_before', '100'),
  ('reward_after', '50'),
  ('support_phone', '601158526817'),
  ('telegram_url', 'https://t.me/mindaoptimaofficial')
on conflict (key) do nothing;
