-- Add "why RM100" context (back-to-school campaign) to promo banner and
-- reward terms copy. Admin can still edit these in Content Editor.

update public.settings
set value = '🎁 Promosi sempena musim persekolahan baru! Dapatkan RM100 untuk setiap rujukan berjaya sebelum 31 Disember. Selepas itu, ganjaran kembali ke RM50 sahaja.'
where key = 'promo_banner_text';

update public.settings
set value = 'Ini promosi khas sempena musim persekolahan baru. Kawan anda mesti DAFTAR dan HADIR KELAS (bukan sekadar intro atau isi borang) untuk terima reward. Selepas 31 Disember 2026, ganjaran kembali ke RM50.'
where key = 'reward_terms';
