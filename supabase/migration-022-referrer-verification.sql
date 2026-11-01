-- Pengesahan Referrer: tapis supaya hanya parent sedia ada Minda Optima jadi Rakan Rujukan.
-- Pendaftaran TIDAK disekat (kod terus dikeluarkan), tapi kelulusan/bayaran rujukan disekat
-- sehingga admin sahkan referrer tu (lihat setStatus check dalam admin.mjs).
-- Jalankan sekali di Supabase > SQL Editor. Selamat dijalankan berulang kali.

alter table public.referrers
  add column if not exists child_name         text,
  add column if not exists enroll_year         text,
  add column if not exists centre              text,
  add column if not exists signup_note         text,
  add column if not exists verification_status text,
  add column if not exists verification_note   text;

-- Referrer yang DAH WUJUD sebelum ciri ni dianggap sah (jangan sekat orang lama).
update public.referrers set verification_status = 'verified' where verification_status is null;

alter table public.referrers alter column verification_status set default 'unverified';
alter table public.referrers alter column verification_status set not null;

do $$
begin
  alter table public.referrers
    add constraint referrers_verification_status_check
    check (verification_status in ('unverified', 'verified', 'rejected'));
exception
  when duplicate_object then null;
end $$;

create index if not exists referrers_verification_status_idx on public.referrers (verification_status);

-- Padankan register_referrer baru (tambah child_name/enroll_year/centre/note, buang bank-related).
drop function if exists public.register_referrer(text, text, text, text);

create or replace function public.register_referrer(
  p_phone text,
  p_name text default null,
  p_email text default null,
  p_child_name text default null,
  p_enroll_year text default null,
  p_centre text default null,
  p_occupation text default null,
  p_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_name  text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_child text := nullif(regexp_replace(btrim(coalesce(p_child_name, '')), '\s+', ' ', 'g'), '');
  v_year  text := nullif(btrim(coalesce(p_enroll_year, '')), '');
  v_centre text := nullif(regexp_replace(btrim(coalesce(p_centre, '')), '\s+', ' ', 'g'), '');
  v_occ   text := nullif(btrim(coalesce(p_occupation, '')), '');
  v_note  text := nullif(btrim(coalesce(p_note, '')), '');
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
    if v_child is null or char_length(v_child) < 2 or char_length(v_child) > 80 then
      return jsonb_build_object('ok', false, 'reason', 'child_name_required');
    end if;
    if v_year is null or v_year !~ '^\d{4}$' then
      return jsonb_build_object('ok', false, 'reason', 'enroll_year_invalid');
    end if;
    if v_centre is null or char_length(v_centre) < 2 or char_length(v_centre) > 100 then
      return jsonb_build_object('ok', false, 'reason', 'centre_required');
    end if;
    insert into public.referrers (phone, name, code, email, child_name, enroll_year, centre, occupation, signup_note)
    values (v_phone, v_name, public.new_referral_code(v_phone), v_email, v_child, v_year, v_centre, left(v_occ, 50), left(v_note, 300))
    on conflict (phone) do nothing;
    select * into v_ref from public.referrers where phone = v_phone;
  end if;

  return jsonb_build_object(
    'ok', true, 'phone', v_phone, 'code', v_ref.code, 'name', public.mask_name(v_ref.name)
  );
end $$;

revoke execute on function public.register_referrer(text, text, text, text, text, text, text, text) from public;
grant execute on function public.register_referrer(text, text, text, text, text, text, text, text) to anon, authenticated;

-- referrer_dashboard: tambah status pengesahan + butiran anak untuk paparan profil.
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
      'occupation', v_ref.occupation,
      'childName', v_ref.child_name,
      'enrollYear', v_ref.enroll_year,
      'centre', v_ref.centre,
      'verificationStatus', v_ref.verification_status
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
