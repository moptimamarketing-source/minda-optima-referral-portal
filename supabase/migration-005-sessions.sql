-- Sesi penjemput: token rahsia dikeluarkan selepas OTP sah. Dashboard dan pendaftaran
-- hanya boleh diakses melalui fungsi Netlify (service_role), bukan terus dari pelayar.
-- Jalankan sekali di Supabase > SQL Editor. Selamat dijalankan berulang kali.

create table if not exists public.referrer_sessions (
  token_hash text primary key,
  phone      text not null,
  email      text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.referrer_sessions enable row level security;

revoke execute on function public.referrer_dashboard(text) from public, anon, authenticated;
grant execute on function public.referrer_dashboard(text) to service_role;

revoke execute on function public.register_referrer(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.register_referrer(text, text, text, text, text, text) to service_role;

-- Kod OTP hanya boleh disahkan sekali.
create or replace function public.verify_otp(
  p_phone text,
  p_otp text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_req public.otp_requests;
begin
  if v_phone is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_phone');
  end if;

  select * into v_req from public.otp_requests
  where phone = v_phone
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_otp');
  end if;
  if v_req.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'otp_expired');
  end if;
  if v_req.verified_at is not null or v_req.otp_code <> p_otp then
    return jsonb_build_object('ok', false, 'reason', 'otp_invalid');
  end if;

  update public.otp_requests set verified_at = now() where id = v_req.id;

  return jsonb_build_object(
    'ok', true,
    'phone', v_phone,
    'email', v_req.email,
    'isNewUser', not exists(select 1 from public.referrers where phone = v_phone)
  );
end $$;

revoke execute on function public.verify_otp(text, text) from public, anon, authenticated;
grant execute on function public.verify_otp(text, text) to service_role;
