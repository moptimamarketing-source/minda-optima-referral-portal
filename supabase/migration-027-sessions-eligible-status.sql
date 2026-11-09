-- Tambah penjejakan kehadiran sesi (0-3) dan status "eligible" (Syarat Lengkap) —
-- rujukan kini: pending -> approved -> eligible (bila kehadiran capai 3 sesi) -> paid.
-- Parent hanya boleh pilih ganjaran bila status = eligible (bukan approved sahaja lagi).
-- Jalankan selepas migration-026. Selamat dijalankan berulang kali.

alter table public.referrals add column if not exists sessions_attended integer not null default 0;
alter table public.referrals add column if not exists rejected_reason text;

alter table public.referrals drop constraint if exists referrals_status_check;
alter table public.referrals add constraint referrals_status_check
  check (status in ('pending', 'approved', 'eligible', 'paid', 'rejected'));

alter table public.referrals drop constraint if exists referrals_sessions_attended_check;
alter table public.referrals add constraint referrals_sessions_attended_check
  check (sessions_attended >= 0 and sessions_attended <= 3);

-- referrer_dashboard: dedahkan sessions_attended + rejected_reason, dan kira stats ikut
-- status baharu (rewardPending = pending/approved/eligible, totalEarned = eligible/paid).
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
                                  where referrer_id = v_ref.id and status in ('pending', 'approved', 'eligible')), 0),
      'totalEarned',   coalesce((select sum(reward) from public.referrals
                                  where referrer_id = v_ref.id and status in ('eligible', 'paid')), 0)
    ),
    'referrals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'name', public.mask_name(r.referee_name),
        'phone', public.mask_phone(r.referee_phone),
        'registeredAt', r.registered_at,
        'status', r.status,
        'sessionsAttended', r.sessions_attended,
        'rejectedReason', r.rejected_reason,
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
