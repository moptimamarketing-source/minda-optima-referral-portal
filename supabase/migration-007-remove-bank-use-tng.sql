-- Minda Optima Referral: tukar kaedah payout dari bank transfer ke Touch 'n Go.
-- Buang keperluan bank_name/bank_account semasa daftar — reward dihantar terus ke
-- Touch 'n Go yang dikaitkan dengan nombor telefon referrer (dah sedia ada, tak perlu field baru).
-- Jalankan sekali di Supabase > SQL Editor. Selamat dijalankan berulang kali.

drop function if exists public.register_referrer(text, text, text, text, text, text);

create or replace function public.register_referrer(
  p_phone text,
  p_name text default null,
  p_email text default null,
  p_occupation text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_name  text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_occ   text := nullif(btrim(coalesce(p_occupation, '')), '');
  v_ref   public.referrers%rowtype;
begin
  if v_phone is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_phone');
  end if;

  select * into v_ref from public.referrers where phone = v_phone;
  if not found then
    if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 80 then
      return jsonb_build_object('ok', false, 'reason', 'name_required');
    end if;
    if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 100 then
      return jsonb_build_object('ok', false, 'reason', 'email_invalid');
    end if;
    insert into public.referrers (phone, name, code, email, occupation)
    values (v_phone, v_name, public.new_referral_code(v_phone), v_email, left(v_occ, 50))
    on conflict (phone) do nothing;
    select * into v_ref from public.referrers where phone = v_phone;
  end if;

  return jsonb_build_object(
    'ok', true, 'phone', v_phone, 'code', v_ref.code, 'name', public.mask_name(v_ref.name)
  );
end $$;

revoke execute on function public.register_referrer(text, text, text, text) from public;
grant execute on function public.register_referrer(text, text, text, text) to anon, authenticated;

create or replace function public.referrer_dashboard(p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_ref   public.referrers%rowtype;
begin
  select * into v_ref from public.referrers where phone = v_phone;
  if not found then
    return jsonb_build_object('ok', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'referrer', jsonb_build_object(
      'name', public.mask_name(v_ref.name),
      'code', v_ref.code,
      'phone', v_ref.phone,
      'email', v_ref.email,
      'occupation', v_ref.occupation
    ),
    'stats', jsonb_build_object(
      'totalReferrals', (select count(*) from public.referrals where referrer_id = v_ref.id),
      'rewardPending', coalesce((select sum(reward) from public.referrals
                                  where referrer_id = v_ref.id and status = 'pending'), 0),
      'totalEarned',   coalesce((select sum(reward) from public.referrals
                                  where referrer_id = v_ref.id and status in ('approved', 'paid')), 0)
    ),
    'referrals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', public.mask_name(r.referee_name),
        'phone', public.mask_phone(r.referee_phone),
        'registeredAt', r.registered_at,
        'status', r.status,
        'reward', r.reward
      ) order by r.registered_at desc)
      from public.referrals r where r.referrer_id = v_ref.id
    ), '[]'::jsonb),
    'promo', jsonb_build_object(
      'deadline', timestamptz '2026-12-31 23:59:59+08',
      'currentReward', public.reward_for(now())
    )
  );
end $$;

alter table public.referrers
  drop column if exists bank_account,
  drop column if exists bank_name;
