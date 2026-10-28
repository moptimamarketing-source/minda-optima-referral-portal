-- Benefit text shown in the login/register page hero ("Ganjaran sehingga RM100 · Satu sesi kelas percuma").
-- Admin-editable via Content Editor (web-src/content.html).
insert into public.settings (key, value) values
  ('login_hero_benefits', '🎁 Ganjaran sehingga RM100 · Satu sesi kelas percuma')
on conflict (key) do nothing;
