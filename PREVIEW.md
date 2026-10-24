# Preview Referral Portal (tanpa server)

Folder `preview/` ialah halaman yang sama seperti `public/`, tapi boleh dibuka terus dari komputer.
Tiada server, tiada Node diperlukan untuk membukanya.

## Cara guna

1. Muat turun folder `referral-portal/preview/` (kekalkan struktur folder `js/`).
2. Double-click **`index.html`**.
3. Perlu internet (reka bentuk guna Tailwind dari CDN).

## Cara cuba

- Klik **Masuk Dashboard** atau **Daftar sebagai Rujukan**.
- Guna nombor demo **012-3456789** untuk lihat dashboard berisi 3 rujukan contoh.
- OTP **tidak dihantar ke WhatsApp**. Ia dipaparkan dalam kotak kuning-hitam di atas skrin.
- Nombor lain: isi nama, dan anda dapat kod rujukan baru (dashboard kosong).
- Halaman jemputan: `daftar.html?ref=MO-6789-DEMO` (buka dari folder yang sama).
- Butang **PREVIEW · reset data** di kiri bawah memadam semua data demo.

Data disimpan dalam browser (localStorage) sahaja. Ini bukan backend sebenar.

## Bina semula preview

Jika `public/` diubah:

```bash
node scripts/build-preview.js
```

## Jalankan versi sebenar (dengan server)

Perlu Node 22.13 ke atas:

```bash
npm start      # http://localhost:3100
npm run seed   # pilihan: data demo
npm test
```

Dalam mod ini OTP dicetak dalam tetingkap terminal, bukan WhatsApp.
