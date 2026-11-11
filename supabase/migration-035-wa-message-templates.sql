-- Semua mesej WhatsApp pre-filled dalam admin panel (bukan hanya poster
-- ganjaran) kini boleh admin edit sendiri di Content Editor -> tab
-- "WhatsApp", tanpa perlu minta developer ubah kod/SQL lagi. Seed dengan
-- teks sedia ada supaya field tak kosong. Selamat dijalankan berulang kali.

insert into public.settings (key, value) values
  ('wa_approved_message', 'Salam {name}, rujukan anda telah disahkan layak. Sila pilih jenis ganjaran RM{reward} (Rebat Yuran/Voucher Buku/Touch ''n Go) di dashboard anda. – Minda Optima'),
  ('wa_paid_message', 'Salam {name}, ganjaran RM{reward} untuk rujukan anda telah ditebus. Terima kasih! – Minda Optima'),
  ('wa_support_reply_message', 'Salam {name}, terima kasih kerana menghubungi sokongan Minda Optima. {code}Mengenai masalah anda: "{problem}" — ')
on conflict (key) do update set value = excluded.value;
