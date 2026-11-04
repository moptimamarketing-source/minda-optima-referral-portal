-- Tambah Touch 'n Go (tunai) sebagai pilihan ganjaran ketiga, khusus untuk Rakan
-- Rujukan yang anak mereka dah tamat/tak lagi berdaftar kelas (Rebat Yuran tak relevan
-- untuk kes macam ni). Jalankan selepas migration-024. Selamat dijalankan berulang kali.

alter table public.reward_codes drop constraint if exists reward_codes_type_check;
alter table public.reward_codes add constraint reward_codes_type_check
  check (type in ('rebat_yuran', 'voucher_buku', 'tng'));
