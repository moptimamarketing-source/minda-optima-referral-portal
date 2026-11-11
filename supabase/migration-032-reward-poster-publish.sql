-- Ganjaran digital kini dipaparkan sebagai POSTER (bukan teks kod terus) kepada
-- parent, dan hanya selepas admin sahkan ia dah "diterbitkan" (admin dah jana &
-- hantar emel/WhatsApp). Sebelum diterbitkan, parent cuma nampak notis
-- "sedang diproses" — kod/poster sebenar disorok sehingga published_at diisi.
-- Jalankan selepas migration-027. Selamat dijalankan berulang kali.

alter table public.reward_codes add column if not exists published_at timestamptz;

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
        'rewardChosenAt', rc.created_at,
        'rewardPublishedAt', rc.published_at,
        'rewardExpiresAt', case when rc.type = 'voucher_buku' and rc.created_at is not null
                                 then rc.created_at + interval '365 days' end,
        -- Kod sebenar hanya didedahkan selepas admin terbitkan (published_at diisi) —
        -- sebelum itu parent cuma nampak notis "sedang diproses", bukan kod mentah.
        'rewardCode', case when rc.published_at is not null then rc.code end,
        'rewardStatus', rc.status
      ) order by r.registered_at desc)
      from public.referrals r
      left join public.reward_codes rc on rc.referral_id = r.id
      where r.referrer_id = v_ref.id
    ), '[]'::jsonb)
  );
end $$;
