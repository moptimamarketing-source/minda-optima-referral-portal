-- send_otp mengembalikan kod OTP, jadi TIDAK boleh dipanggil oleh pelayar (anon).
-- Hanya fungsi Netlify (service_role) boleh panggil. Selamat dijalankan berulang kali.

revoke execute on function public.send_otp(text, text) from public, anon, authenticated;
revoke execute on function public.verify_otp(text, text) from public, anon, authenticated;
grant execute on function public.send_otp(text, text) to service_role;
grant execute on function public.verify_otp(text, text) to service_role;

alter table public.otp_requests enable row level security;
