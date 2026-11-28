-- Link Google Sheet untuk senarai "Leads Referral" — sekadar rujukan admin
-- (bukan sync/kawalan, admin ambil tahu je siapa lead yang masuk). Admin
-- boleh tukar link ni bila-bila di Admin Panel (bukan Content Editor,
-- sebab bukan untuk parent).
--
-- Selamat dijalankan berulang kali.

insert into public.settings (key, value) values
  ('leads_referral_link', 'https://docs.google.com/spreadsheets/d/1J_2O-iOUOUVQAPY0vcj2CXMCWdbG3VR5pN-FbzdN8qk/edit?usp=sharing')
on conflict (key) do update set value = excluded.value;
