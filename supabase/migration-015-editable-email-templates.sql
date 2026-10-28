-- Make email template images/text editable via Content Editor (tab "Email").
-- Seed defaults matching the current hardcoded values in auth.mjs/admin.mjs.

insert into public.settings (key, value) values
  ('otp_email_header_image', 'https://referral.mindaoptima.com/logo-mindaoptima.webp'),
  ('otp_email_heading', 'Sahkan Kod OTP Anda'),
  ('otp_email_desc', 'Masukkan kod di bawah untuk mengesahkan pendaftaran anda sebagai referrer Minda Optima.'),

  ('welcome_email_header_image', 'https://drive.google.com/uc?id=15gWaMZTfS9d8-z1yN7dKLmvDgjPYGbud'),
  ('welcome_email_heading', '🎉 Selamat Datang!'),
  ('welcome_email_subtitle', 'Terima kasih telah mendaftar. Kod rujukan anda sudah siap untuk dikongsi.'),
  ('welcome_email_image1', 'https://drive.google.com/uc?id=12BtXDOAxv_ofGCpDuTdUQHPhWt6ZMtL2'),
  ('welcome_email_image2', 'https://drive.google.com/uc?id=1PzIvylgBQPfawl2JxyHRAKGH_gdEOBmE'),

  ('approved_email_header_image', 'https://drive.google.com/uc?id=1QUvgbM8Cf6RNh0qn6K_e9GRTFzHFu4-F'),
  ('approved_email_heading', '✓ Rujukan Anda Layak!'),
  ('approved_email_subtitle', 'Tahniah! Rujukan anda telah disahkan memenuhi kriteria program kami.'),

  ('paid_email_header_image', 'https://drive.google.com/uc?id=12SPd0G_EfTz-_OdPcAba5xwMNzKBQ_ip'),
  ('paid_email_heading', '🎉 Pembayaran Selesai!'),
  ('paid_email_subtitle', 'Ganjaran anda telah diproses dan akan masuk ke akaun Touch ''n Go anda.')
on conflict (key) do nothing;

-- If your actual site domain is not referral.mindaoptima.com, update
-- otp_email_header_image in Content Editor (tab Email) to match — it just
-- needs to point at your deployed /logo-mindaoptima.webp file.
