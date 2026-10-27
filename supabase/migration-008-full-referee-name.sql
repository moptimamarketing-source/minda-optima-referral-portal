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
