-- Keputusan mesyuarat HR (Nov 2026):
--  1. Tiada lagi tiering promo RM100->RM50 — ganjaran flat RM50 sahaja.
--  2. Ganjaran jadi digital: Rebat Yuran RM50 atau Voucher Buku RM50 (bukan tunai/TnG).
--  3. Parent kena tick setuju Terma & Syarat semasa daftar (direkod tnc_agreed_at).
-- Jalankan sekali di Supabase > SQL Editor. Selamat dijalankan berulang kali.

-- 1. Ganjaran flat RM50 — guna laluan "promo off" sedia ada dalam rewardFor() (admin.mjs):
--    bila promo_enabled = false, ia pulangkan reward_before terus, tanpa kira tarikh.
insert into public.settings (key, value) values
  ('promo_enabled', 'false'),
  ('reward_before', '50'),
  ('reward_after', '50')
on conflict (key) do update set value = excluded.value;

-- reward_for() SQL (dipanggil oleh record_registration, borang luar pcs2.daftarmindaoptima.com)
-- turut dikemaskini supaya konsisten — flat RM50, tiada tarikh tamat.
create or replace function public.reward_for(ts timestamptz) returns integer
language sql immutable as $$
  select 50
$$;

-- 2. Rekod persetujuan T&C semasa daftar.
alter table public.referrers add column if not exists tnc_agreed_at timestamptz;

drop function if exists public.register_referrer(text, text, text, text, text, text, text, text);

create or replace function public.register_referrer(
  p_phone text,
  p_name text default null,
  p_email text default null,
  p_child_name text default null,
  p_enroll_year text default null,
  p_centre text default null,
  p_tnc_agreed boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_name  text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_child text := nullif(regexp_replace(btrim(coalesce(p_child_name, '')), '\s+', ' ', 'g'), '');
  v_year  text := nullif(btrim(coalesce(p_enroll_year, '')), '');
  v_centre text := nullif(regexp_replace(btrim(coalesce(p_centre, '')), '\s+', ' ', 'g'), '');
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
    if p_tnc_agreed is not true then
      return jsonb_build_object('ok', false, 'reason', 'tnc_required');
    end if;
    insert into public.referrers (phone, name, code, email, child_name, enroll_year, centre, tnc_agreed_at)
    values (v_phone, v_name, public.new_referral_code(v_phone), v_email, v_child, v_year, v_centre, now())
    on conflict (phone) do nothing;
    select * into v_ref from public.referrers where phone = v_phone;
  end if;

  return jsonb_build_object(
    'ok', true, 'phone', v_phone, 'code', v_ref.code, 'name', public.mask_name(v_ref.name)
  );
end $$;

revoke execute on function public.register_referrer(text, text, text, text, text, text, text) from public;
grant execute on function public.register_referrer(text, text, text, text, text, text, text) to anon, authenticated;

-- 3. Ganjaran digital: satu kod seunik bagi setiap rujukan yang Approved, jenis
--    rebat_yuran atau voucher_buku, ditebus secara manual oleh Admin Operation.
create table if not exists public.reward_codes (
  id            bigint generated always as identity primary key,
  referral_id   bigint not null unique references public.referrals (id),
  referrer_id   bigint not null references public.referrers (id),
  type          text not null check (type in ('rebat_yuran', 'voucher_buku')),
  code          text not null unique,
  value         integer not null default 50,
  status        text not null default 'issued' check (status in ('issued', 'redeemed')),
  redeemed_at   timestamptz,
  redeemed_note text,
  created_at    timestamptz not null default now()
);
create index if not exists reward_codes_referrer_idx on public.reward_codes (referrer_id);

alter table public.reward_codes enable row level security;
drop policy if exists team_read on public.reward_codes;
create policy team_read on public.reward_codes for select to authenticated using (public.is_team());
drop policy if exists team_update on public.reward_codes;
create policy team_update on public.reward_codes for update to authenticated
  using (public.is_team()) with check (public.is_team());
revoke all on public.reward_codes from public, anon, authenticated;
grant select, update (status, redeemed_at, redeemed_note, type, code) on public.reward_codes to authenticated;

-- referrer_dashboard: tambah maklumat kod ganjaran bagi setiap rujukan (untuk Parent pilih jenis).
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
        'id', r.id,
        'name', public.mask_name(r.referee_name),
        'phone', public.mask_phone(r.referee_phone),
        'registeredAt', r.registered_at,
        'status', r.status,
        'reward', r.reward,
        'rewardType', rc.type,
        'rewardCode', rc.code,
        'rewardStatus', rc.status
      ) order by r.registered_at desc)
      from public.referrals r
      left join public.reward_codes rc on rc.referral_id = r.id
      where r.referrer_id = v_ref.id
    ), '[]'::jsonb)
  );
end $$;
