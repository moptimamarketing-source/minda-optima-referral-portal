-- Email OTP verification system for referrer registration.
-- Run once in Supabase > SQL Editor.

-- 1. Create otp_requests table to store OTP codes
create table if not exists public.otp_requests (
  id bigserial primary key,
  phone text not null,
  email text not null,
  otp_code text not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  verified_at timestamptz
);

create index if not exists idx_otp_requests_phone on public.otp_requests(phone);
create index if not exists idx_otp_requests_email on public.otp_requests(email);

-- 2. RPC: send_otp - generate OTP and prepare for sending
create or replace function public.send_otp(
  p_phone text,
  p_email text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_otp text;
begin
  if v_phone is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_phone');
  end if;
  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_email');
  end if;

  -- Generate 6-digit OTP
  v_otp := lpad((random() * 999999)::bigint::text, 6, '0');

  -- Insert OTP request (expires in 10 minutes)
  insert into public.otp_requests (phone, email, otp_code, expires_at)
  values (v_phone, v_email, v_otp, now() + interval '10 minutes')
  on conflict do nothing;

  -- Return OTP for email sending (server will handle via Resend)
  return jsonb_build_object(
    'ok', true,
    'phone', v_phone,
    'email', v_email,
    'otp', v_otp  -- Server will send this via Resend
  );
end $$;

revoke execute on function public.send_otp(text, text) from public;
grant execute on function public.send_otp(text, text) to anon, authenticated;

-- 3. RPC: verify_otp - check if OTP is valid
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

  -- Find latest OTP for this phone
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

  if v_req.otp_code != p_otp then
    return jsonb_build_object('ok', false, 'reason', 'otp_invalid');
  end if;

  -- Mark as verified
  update public.otp_requests set verified_at = now() where id = v_req.id;

  return jsonb_build_object(
    'ok', true,
    'phone', v_phone,
    'email', v_req.email,
    'isNewUser', not exists(select 1 from public.referrers where phone = v_phone)
  );
end $$;

revoke execute on function public.verify_otp(text, text) from public;
grant execute on function public.verify_otp(text, text) to anon, authenticated;
