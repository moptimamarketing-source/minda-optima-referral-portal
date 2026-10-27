-- Update default public.settings copy approved during landing page review.
-- Only touches rows that still hold the old seed text; admin can still edit
-- these in Content Editor regardless.
update public.settings
set value = '🎁 Kongsi Peluang, Bawa Pulang RM100! Rebut ganjaran RM100 untuk setiap rujukan berjaya sebelum 31 Disember. Selepas tarikh itu, ganjarannya hanya RM50 sahaja tau!'
where key = 'promo_banner_text';

update public.settings
set value = 'Anak mereka dapat satu sesi kelas percuma. Bila anak hadir, RM100 Touch ''n Go jadi milik anda!'
where key = 'hero_subtitle';

update public.settings
set value = 'Anda menerima RM100 Touch ''n Go apabila anak mereka hadir ke sesi pertama percuma.'
where key = 'step3_desc';
