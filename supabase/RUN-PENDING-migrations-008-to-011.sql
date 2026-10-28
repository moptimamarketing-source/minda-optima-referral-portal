-- Gabungan semua migration yang belum run (008-011). Run sekali sahaja dalam Supabase SQL Editor.
-- Selamat run berulang kali (idempotent).

-- ===== supabase/migration-008-full-referee-name.sql =====
-- Show full referee name in referrer dashboard (previously masked via mask_name(),
-- e.g. "Demo 24" -> "Demo 2."). Phone number stays masked for privacy.
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
        'name', r.referee_name,
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

-- ===== supabase/migration-009-update-copy-defaults.sql =====
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

-- ===== supabase/migration-010-full-referrer-name.sql =====
-- Papar nama penuh pemilik akaun sendiri di dashboard (header + Info). Nama referee penuh sejak 008.
-- Nama di halaman landing (track_event) sengaja kekal dimasking kerana dilihat orang lain.
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
      'name', v_ref.name,
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
        'name', r.referee_name,
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

-- ===== supabase/migration-011-login-hero-benefits.sql =====
-- Benefit text shown in the login/register page hero ("Ganjaran sehingga RM100 · Satu sesi kelas percuma").
-- Admin-editable via Content Editor (web-src/content.html).
insert into public.settings (key, value) values
  ('login_hero_benefits', '🎁 Ganjaran sehingga RM100 · Satu sesi kelas percuma')
on conflict (key) do nothing;

