-- Terma & Syarat khusus setiap jenis ganjaran (Rebat Yuran / Voucher Buku /
-- Touch 'n Go), dipaparkan bila parent klik ikon "i" sebelah nama ganjaran
-- di dashboard. Admin boleh edit dari Content Editor lepas ni. Format sama
-- macam syarat_items (# tajuk, - bullet, **bold**). Selamat dijalankan
-- berulang kali.

insert into public.settings (key, value) values
  ('reward_terms_rebat_yuran', '# Terma & Syarat — Rebat Yuran
- Rebat Yuran bernilai **RM50**, dipotong terus pada **yuran kelas bulan berikutnya** anak Rakan Rujukan.
- Rebat hanya boleh digunakan **sekali** dan tidak boleh digabung dengan sebarang promosi/diskaun lain.
- Proses automatik — Rakan Rujukan **tidak perlu buat apa-apa untuk menebus**. Sebaik admin menekan "Tebus" di sistem, potongan akan direkodkan secara automatik pada bil yuran.
- Rebat **tidak boleh ditukar kepada tunai**.'),
  ('reward_terms_voucher_buku', '# Terma & Syarat — Voucher Buku
- Voucher Buku ialah **potongan RM50** daripada harga buku Bahasa Melayu atau Bahasa Inggeris (harga buku sebenar biasanya melebihi RM100 — baki harga ditanggung oleh Rakan Rujukan).
- Kod voucher sah digunakan dalam tempoh **365 hari** dari tarikh dijana.
- Untuk menebus, hubungi **Admin Operation melalui WhatsApp** dengan kod voucher anda.
- Voucher **tidak boleh ditukar kepada tunai**.'),
  ('reward_terms_tng', '# Terma & Syarat — Touch ''n Go eWallet
- Ganjaran TnG bernilai **RM50**, dipindahkan terus ke akaun Touch ''n Go eWallet Rakan Rujukan.
- Rakan Rujukan **mesti mempunyai akaun Touch ''n Go eWallet aktif** (guna nombor telefon yang sama dengan pendaftaran rujukan).
- Pindahan diproses **secara berkumpulan pada 1hb-5hb setiap bulan**. Jika ganjaran disahkan dalam bulan semasa, pindahan akan dibuat pada tempoh 1hb-5hb bulan berikutnya.
- Ganjaran tidak dikenakan sebarang caj kepada Rakan Rujukan.')
on conflict (key) do update set value = excluded.value;
