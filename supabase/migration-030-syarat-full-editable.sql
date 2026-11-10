-- Jadikan pop-up "Terma & Syarat Penuh" (landing page & dashboard) boleh edit
-- oleh admin sendiri (Content Editor), gantikan versi static HTML sebelum ni.
-- Seed syarat_items dengan kandungan sedia ada (format ringkas: "# " = tajuk,
-- "- " = bullet, "**teks**" = bold) supaya admin boleh terus edit teks,
-- bukan mula dari kosong. Selamat dijalankan berulang kali.

insert into public.settings (key, value) values
  ('syarat_items', '# 1. Kelayakan Menyertai
1.1. Program ini terbuka khusus untuk **ibu bapa/penjaga sedia ada** Minda Optima (anak masih mengikuti kelas, atau pernah menjadi pelajar Minda Optima).
1.2. Ibu bapa/penjaga wajib **membaca dan bersetuju (tick)** dengan Terma & Syarat ini semasa mendaftar sebagai Rakan Rujukan. Pendaftaran tidak boleh diteruskan tanpa persetujuan ini.
1.3. Nombor telefon yang didaftarkan mestilah **nombor yang sah dan sepadan dengan rekod sedia ada Minda Optima**, bagi tujuan pengesahan dan kelulusan akaun.

# 2. Proses Pendaftaran & Pengesahan Akaun
2.1. Selepas mendaftar, akaun Rakan Rujukan akan berstatus **"Menunggu Kelulusan"**. Kod rujukan dan maklumat penuh program **TIDAK akan dipaparkan** sehingga akaun disahkan.
2.2. Pasukan admin akan menyemak dan memadankan nama anak serta nombor telefon dengan rekod pelajar sedia ada Minda Optima sebelum meluluskan akaun.
2.3. Rakan Rujukan akan menerima emel pemberitahuan sebaik sahaja akaun disahkan, bersama kod rujukan unik.
2.4. Minda Optima berhak menolak permohonan jika maklumat tidak sah, tidak lengkap, atau disyaki palsu. Rayuan boleh dibuat melalui Sokongan.

# 3. Syarat Penggunaan Kod Rujukan
3.1. Kod rujukan hanya boleh digunakan oleh **rakan yang belum pernah berdaftar** dengan Minda Optima sebelum ini.
3.2. Rujukan yang didaftarkan **tanpa menggunakan kod rujukan yang sah** tidak layak menerima sebarang ganjaran.
3.3. Tiada had bilangan rujukan — Rakan Rujukan boleh berkongsi kod kepada seramai mana ibu bapa yang dikehendaki.

# 4. Syarat Kelayakan Ganjaran
Rakan Rujukan hanya layak menerima ganjaran apabila rakan yang dirujuk memenuhi **KESEMUA** syarat berikut:
4.1. **Berjaya mendaftar** menggunakan kod rujukan yang sah.
4.2. **Membuat bayaran yuran kelas**.
4.3. Anak yang didaftarkan **hadir sekurang-kurangnya 3 sesi kelas** (bukan sekadar sesi intro/percubaan). Nota: 1 hari = 1 sesi, kecuali Sabtu/Ahad yang boleh dikira 2 sesi dalam sehari.
Ganjaran akan **ditahan (on hold)** sehingga kesemua syarat di atas disahkan oleh pasukan Minda Optima.

# 5. Jumlah & Bentuk Ganjaran
5.1. Ganjaran adalah **RM50 setiap rujukan berjaya** (kadar tetap — tiada lagi tiering promo mengikut tarikh).
5.2. Ganjaran diberikan dalam bentuk **digital**, pilihan Rakan Rujukan sendiri:
- **Rebat Yuran** (potongan yuran kelas)
- **Voucher Buku** (Bahasa Melayu/Bahasa Inggeris)
- **Touch ''n Go** (Rakan Rujukan perlu mempunyai akaun Touch ''n Go eWallet untuk memilih ganjaran ini)
5.3. Ganjaran **bukan dalam bentuk tunai terus** dan **tidak boleh ditukar** selepas dipilih tanpa kebenaran admin.
5.4. Pilihan ganjaran hanya boleh dibuat selepas status rujukan bertukar kepada **"Syarat Lengkap"**.

# 6. Proses Penebusan Ganjaran
6.1. Selepas Rakan Rujukan memilih jenis ganjaran di dashboard, satu **kod digital unik** akan dijana (cth: RB-XXXX-YYYY untuk Rebat Yuran, VB-XXXX-YYYY untuk Voucher Buku, TNG-XXXX-YYYY untuk Touch ''n Go).
6.2. Penebusan kod dilakukan secara manual melalui **WhatsApp dengan Admin Operation** — tiada kaunter/staf kedai berasingan.
6.3. Admin akan merekodkan setiap penebusan (nota ringkas) sebagai rekod audit dalaman.

# 7. Pencegahan Penyalahgunaan & Penipuan
7.1. Minda Optima berhak menjalankan semakan lanjut ke atas maklumat pendaftar (nombor telefon, maklumat anak, bukti pembayaran) sebelum meluluskan akaun atau ganjaran.
7.2. Minda Optima berhak **menolak rujukan atau membatalkan akaun** pada bila-bila masa jika didapati maklumat palsu, pendua, atau percubaan manipulasi sistem.
7.3. Keputusan Minda Optima mengenai kelayakan dan kelulusan adalah **muktamad**.

# 8. Pindaan Terma & Syarat
8.1. Minda Optima berhak **meminda Terma & Syarat ini pada bila-bila masa**, tanpa notis terdahulu, mengikut keperluan operasi atau dasar syarikat.
8.2. Versi terkini Terma & Syarat akan sentiasa dipaparkan di dashboard dan borang pendaftaran.

# 9. Lain-lain
9.1. Pendaftaran sebagai Rakan Rujukan **tidak disekat/terhad** — hanya proses kelulusan akaun dan ganjaran sahaja yang tertakluk kepada pengesahan.
9.2. Maklumat anak yang diberikan digunakan **semata-mata untuk tujuan pengesahan kelayakan**, tidak untuk tujuan lain.
9.3. Sebarang pertanyaan atau rayuan boleh dibuat melalui borang Sokongan di laman web.')
on conflict (key) do update set value = excluded.value;
