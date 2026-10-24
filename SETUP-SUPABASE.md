# Jejak rujukan dengan Supabase

## Kenapa kod rujukan hilang sebelum ini

Pautan kongsi WhatsApp terus ke `pcs2.daftarmindaoptima.com?ref=KOD`. Portal tak pernah nampak klik itu, dan borang pendaftaran tak menyimpan `ref`, jadi tiada apa yang direkod.

## Aliran baru

1. Ibu bapa kongsi pautan portal: `.../daftar.html?ref=KOD`.
2. Rakan buka pautan: direkod **buka pautan**. Tekan Daftar: direkod **tekan Daftar**, dan dibawa ke borang dengan `?ref=KOD&vid=ID`.
3. Borang pendaftaran menyimpan kod itu dan memanggil `MOReferral.record(...)` selepas pendaftaran berjaya: direkod **siap daftar** (status Menunggu).
4. Pasukan buka `admin.html`: nampak corong setiap penjemput, semua rujukan, dan tukar status (Menunggu / Layak / Dibayar / Ditolak).

`vid` ialah ID rawak dalam browser rakan. Ia menyambung klik dengan pendaftaran walaupun ia berlaku di domain lain.

## Setup (sekali sahaja)

1. **Pangkalan data**: Supabase > SQL Editor > tampal seluruh `supabase/schema.sql` > Run. Ia membuang 3 jadual kosong dari percubaan pertama (dan berhenti dengan mesej jika jadual itu sudah ada data). Selamat dijalankan semula.
2. **Pasukan**:
   - Authentication > Users > Add user (emel + kata laluan, tandakan Auto Confirm).
   - SQL Editor: `insert into public.team_members (email) values ('emel-yang-sama@contoh.com');`
   - Authentication > Sign In / Providers: matikan "Allow new users to sign up".
3. **Hos laman**: letak folder `web/` di hos statik (Netlify: drag and drop). Untuk `referral.mindaoptima.com`, tambah rekod CNAME di NetKL ke alamat yang hos beri.
4. **Borang pendaftaran** (`pcs2`):
   - Lekatkan `integration/referral-snippet.js` dan isi `REGISTRATION_API_KEY` (Table Editor > `settings` > `registration_api_key`).
   - Tambah medan "Kod rujukan (jika ada)" yang diisi dengan `MOReferral.code()`. Ibu bapa boleh menaip sendiri jika pautan terpotong.
   - Selepas pendaftaran berjaya: `MOReferral.record({ phone, name, code })`.
   - Simpan juga kod itu dalam rekod pendaftaran borang sendiri sebagai sandaran.
5. **Ujian**: buka `login.html` dan dapatkan kod. Buka pautan kongsi dalam tetingkap incognito, tekan Daftar, dan semak `admin.html`.

## Had yang perlu diketahui

- **Tiada OTP WhatsApp lagi.** Sesiapa yang tahu nombor telefon ibu bapa boleh buka dashboard mereka (nama dan nombor rakan sentiasa disamarkan). Pasang OTP sebenar sebelum dibuka kepada orang ramai.
- **Kunci pendaftaran dalam borang statik kelihatan dalam source.** Ia hanya halangan ringan. Sebab itu setiap rujukan bermula "Menunggu" dan pasukan perlu sahkan sebelum bayar. Jika borang ada fungsi server (Netlify Function), letak kunci di sana.
- Seorang rakan (nombor telefon) hanya boleh dikira sekali, untuk penjemput pertama. Penjemput tak boleh merujuk nombornya sendiri.
- Tailwind dimuat dari CDN seperti kod asal. Boleh diganti dengan CSS yang dibina kemudian.

## Mengubah kod

`web/` dijana. Ubah `public/` atau `web-src/`, kemudian `node scripts/build-web.js`.
Uji skema SQL (perlu Postgres tempatan): lihat kepala `supabase/test/test.sql`.
