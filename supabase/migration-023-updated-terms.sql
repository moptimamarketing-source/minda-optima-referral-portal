-- Kemas kini Terma & Syarat (syarat_items/syarat_notes) ikutan ciri Pengesahan Referrer baru.
-- Guna "do update" (bukan "do nothing") sebab kita nak GANTI teks demo lama dengan versi baru.
-- Jalankan sekali di Supabase > SQL Editor. Selamat dijalankan berulang kali.

insert into public.settings (key, value) values
  ('syarat_items', 'Program ini terbuka kepada semua ibu bapa/penjaga sedia ada yang mempunyai anak yang sedang atau pernah berdaftar di Minda Optima.
Satu nombor telefon hanya boleh mendaftar SATU akaun Rakan Rujukan.
Nama anak, tahun pendaftaran & pusat pembelajaran diperlukan semasa daftar untuk tujuan pengesahan.
Kod rujukan diterima serta-merta selepas daftar, tetapi kelulusan status & ganjaran hanya diproses selepas akaun Rakan Rujukan disahkan oleh pihak kami.
Tidak dibenarkan merujuk nombor telefon sendiri. Setiap nombor rakan yang dirujuk hanya direkodkan sekali sahaja.
Rakan yang dirujuk mesti mendaftarkan anak menggunakan kod yang sah, dan anak tersebut mesti menghadiri sesi kelas percuma pertama.
Status bertukar "Diluluskan" selepas kehadiran disahkan DAN akaun Rakan Rujukan disahkan.
Ganjaran RM100 adalah kadar PROMOSI bermusim, sah sehingga 31 Disember 2026. Selepas tamat tempoh promosi, kadar kembali kepada RM50 bagi setiap rujukan berjaya, berdasarkan tarikh rujukan didaftarkan.
Ganjaran dihantar ke Touch ''n Go yang didaftarkan, diproses berkelompok dalam 7 hari pertama setiap bulan.
Kami berhak menolak rujukan atau membatalkan akaun Rakan Rujukan jika didapati maklumat palsu atau cubaan penipuan.
Rayuan terhadap penolakan boleh dibuat melalui Sokongan.
Kami berhak meminda terma ini atau menamat/menggantung program ini pada bila-bila masa tanpa notis terdahulu.
Keputusan kami mengenai kelayakan, pengesahan dan kelulusan adalah muktamad.')
on conflict (key) do update set value = excluded.value;

insert into public.settings (key, value) values
  ('syarat_notes', 'Sesi percuma adalah kelas pertama sahaja. Tidak termasuk sesi intro atau ujian.
Tiada had bilangan rujukan.
Tempoh pengesahan akaun Rakan Rujukan tertakluk kepada semakan dalaman kami.
Kelas percuma anak yang dirujuk tetap sah walau akaun Rakan Rujukan ditolak — penolakan hanya menjejaskan ganjaran Rakan Rujukan, bukan manfaat anak.
Maklumat anak digunakan semata-mata untuk pengesahan & pengurusan program ini.')
on conflict (key) do update set value = excluded.value;
