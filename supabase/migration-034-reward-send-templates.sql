-- Jadikan emel + mesej WhatsApp (dihantar dari butang "Hantar Emel"/"Hantar
-- WhatsApp" dalam popup poster ganjaran) boleh edit oleh admin di Content
-- Editor, bukan hardcode dalam kod. Seed dengan nilai sedia ada supaya admin
-- nampak kandungan betul dari awal, bukan kotak kosong. Token {type} = jenis
-- ganjaran, {name} = nama Rakan Rujukan. Selamat dijalankan berulang kali.

insert into public.settings (key, value) values
  ('reward_email_heading', '🎁 Ganjaran {type} Anda'),
  ('reward_email_subtitle', 'Tahniah! Ganjaran anda telah disahkan — poster (lengkap dengan kod) disertakan dalam emel ini.'),
  ('reward_whatsapp_template', 'Salam {name}! Ganjaran {type} anda dah sedia 🎉 Poster (dengan kod) baru je dimuat turun — sila lampirkan di sini.')
on conflict (key) do update set value = excluded.value;
