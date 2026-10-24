-- Ujian skema (meniru Supabase). Perlu Postgres 15+ tempatan:
--   createdb mo_test && psql -d mo_test -f supabase/test/bootstrap.sql -f supabase/schema.sql -f supabase/test/test.sql
-- (jalankan sebagai superuser; skrip ini bertukar ke role anon/authenticated sendiri)
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on

-- ---------- C. anon: tiada akses terus ----------
set role anon;
do $$
declare t text;
begin
  foreach t in array array['referrers','referral_events','referrals','team_members','settings','referral_funnel'] loop
    begin execute format('select * from public.%I', t);
      raise exception 'FAIL anon boleh SELECT %', t;
    exception when insufficient_privilege then null; end;
    begin execute format('insert into public.%I default values', t);
      raise exception 'FAIL anon boleh INSERT %', t;
    exception when insufficient_privilege then null; end;
  end loop;
  foreach t in array array['normalize_phone(text)','mask_phone(text)','mask_name(text)','reward_for(timestamptz)',
                           'new_referral_code(text)','is_team()','touch_status_updated_at()'] loop
    assert not has_function_privilege('anon', 'public.' || t, 'execute'), 'FAIL anon boleh execute ' || t;
  end loop;
  foreach t in array array['track_event(text,text,text)','record_registration(text,text,text,text,text)',
                           'register_referrer(text,text)','referrer_dashboard(text)'] loop
    assert has_function_privilege('anon', 'public.' || t, 'execute'), 'FAIL anon tak boleh execute ' || t;
  end loop;
  assert not has_function_privilege('anon', 'public.is_team()', 'execute');
  assert has_function_privilege('authenticated', 'public.is_team()', 'execute');
end $$;
reset role;
\echo OK  C. anon tak boleh baca/tulis jadual atau panggil pembantu

-- ---------- D. aliran RPC sebagai anon ----------
set role anon;
do $$
declare r jsonb; code1 text; key text;
begin
  r := public.register_referrer('012-3456789');
  assert r->>'reason' = 'name_required', 'tanpa nama: ' || r;
  r := public.register_referrer('abc', 'Siti Aminah');
  assert r->>'reason' = 'invalid_phone', 'phone tak sah: ' || r;
  r := public.register_referrer('+60 12-345 6789', 'Siti Aminah');
  assert (r->>'ok')::bool and r->>'phone' = '0123456789', 'daftar: ' || r;
  assert r->>'code' ~ '^MO-6789-[A-Z]{4}$', 'format kod: ' || r;
  assert r->>'name' = 'Siti A.', 'nama disamarkan: ' || r;
  code1 := r->>'code';
  r := public.register_referrer('012-3456789');
  assert r->>'code' = code1, 'nombor sama dapat kod sama';
  perform set_config('t.code', code1, false);
end $$;
reset role;
\echo OK  D1. register_referrer

set role anon;
do $$
declare r jsonb; code1 text := current_setting('t.code');
begin
  r := public.track_event(code1, 'v1', 'landing');
  assert (r->>'found')::bool and r->>'referrerName' = 'Siti A.', 'landing: ' || r;
  assert not (r ? 'phone'), 'phone bocor';
  perform public.track_event(code1, 'v1', 'landing');          -- dedupe
  perform public.track_event(code1, 'v2', 'landing');          -- pelawat lain
  perform public.track_event(code1, 'v1', 'cta_click');
  r := public.track_event('MO-0000-ZZZZ', 'v3', 'landing');    -- format sah, tak wujud
  assert not (r->>'found')::bool, 'kod tak wujud';
  r := public.track_event('hello', 'v3', 'landing');           -- sampah, tak direkod
  assert not (r->>'found')::bool;
  begin perform public.track_event(code1, 'v1', 'registered'); raise exception 'FAIL event registered dibenarkan';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
do $$
declare n int; code1 text := current_setting('t.code');
begin
  select count(*) into n from referral_events where event='landing' and code = code1;
  assert n = 2, 'landing sepatutnya 2 (dedupe) tapi ' || n;
  select count(*) into n from referral_events where event='cta_click' and code = code1;
  assert n = 1, 'cta 1';
  select count(*) into n from referral_events where referrer_id is null;
  assert n = 1, 'kod tak wujud direkod 1, sampah tidak: ' || n;
end $$;
\echo OK  D2. track_event (dedupe, kod tak wujud, sampah, event tak sah)

set role anon;
do $$
declare r jsonb; code1 text := current_setting('t.code'); k text;
begin
  r := public.record_registration(code1, '017-111 2222', 'Ahmad Faiz', 'v1');
  assert r->>'reason' = 'unauthorized', 'tanpa kunci: ' || r;
  r := public.record_registration(code1, '017-111 2222', 'Ahmad Faiz', 'v1', 'salah');
  assert r->>'reason' = 'unauthorized', 'kunci salah: ' || r;
end $$;
reset role;
select set_config('t.key', value, false) from settings where key = 'registration_api_key';

set role anon;
do $$
declare r jsonb; code1 text := current_setting('t.code'); k text := current_setting('t.key');
begin
  r := public.record_registration(code1, '+60 17-111 2222', '  Ahmad   Faiz ', 'v1', k);
  assert (r->>'ok')::bool and r->>'status' = 'pending', 'daftar ok: ' || r;
  r := public.record_registration(code1, '0171112222', 'Ahmad Faiz', 'v1', k);
  assert r->>'reason' = 'duplicate', 'duplicate: ' || r;
  r := public.record_registration(code1, '012-3456789', 'Siti', null, k);
  assert r->>'reason' = 'self_referral', 'self: ' || r;
  r := public.record_registration('MO-0000-ZZZZ', '018-3334444', 'X', null, k);
  assert r->>'reason' = 'unknown_code', 'unknown: ' || r;
  r := public.record_registration(code1, '12345', 'X', null, k);
  assert r->>'reason' = 'invalid_phone', 'phone: ' || r;
  r := public.record_registration(lower(code1), '018-3334444', 'Nurul Huda', 'v9', k);
  assert (r->>'ok')::bool, 'kod huruf kecil diterima: ' || r;
end $$;
reset role;
do $$
declare n int; rw int; nm text; rcode text := current_setting('t.code');
begin
  select count(*) into n from referrals; assert n = 2, 'referrals 2: ' || n;
  select referee_name, reward into nm, rw from referrals where referee_phone = '0171112222';
  assert nm = 'Ahmad Faiz' and rw = 100, 'nama dibersihkan & reward 100: ' || nm || rw;
  select count(*) into n from referral_events where event = 'registered'; assert n = 2, 'event registered 2: ' || n;
  assert public.reward_for(timestamptz '2026-12-31 23:59:59+08') = 100, 'sempadan 100';
  assert public.reward_for(timestamptz '2027-01-01 00:00:00+08') = 50, 'selepas tarikh 50';
end $$;
\echo OK  D3. record_registration (kunci API, normalisasi, duplicate, self-referral, reward)

set role anon;
do $$
declare r jsonb;
begin
  r := public.referrer_dashboard('012-3456789');
  assert (r->>'ok')::bool, 'dashboard ok';
  assert (r#>>'{stats,totalReferrals}')::int = 2, 'jumlah 2: ' || r;
  assert (r#>>'{stats,rewardPending}')::int = 200, 'pending 200: ' || r;
  assert (r#>>'{stats,totalEarned}')::int = 0;
  assert r#>>'{referrals,0,phone}' ~ '^01[0-9]-\*+[0-9]{4}$', 'phone disamarkan: ' || r;
  assert r#>>'{referrals,0,name}' in ('Nurul H.', 'Ahmad F.'), 'nama disamarkan: ' || r;
  assert (r::text !~ '0171112222') and (r::text !~ '0183334444'), 'nombor penuh bocor';
  r := public.referrer_dashboard('019-9999999');
  assert not (r->>'ok')::bool, 'nombor tak dikenali';
end $$;
reset role;
\echo OK  D4. referrer_dashboard (statistik, data disamarkan)

-- ---------- E. pasukan ----------
-- bukan ahli pasukan
set role authenticated;
select set_config('request.jwt.claims', '{"email":"orang@luar.com","role":"authenticated"}', false);
do $$
declare n int;
begin
  assert not public.is_team(), 'bukan team';
  select count(*) into n from referrals; assert n = 0, 'bukan team nampak data: ' || n;
  select count(*) into n from referrers; assert n = 0;
  select count(*) into n from referral_funnel; assert n = 0, 'funnel bocor';
  update referrals set status = 'paid'; get diagnostics n = row_count; assert n = 0, 'bukan team boleh update';
  begin perform * from settings; raise exception 'FAIL authenticated baca settings';
  exception when insufficient_privilege then null; end;
  begin perform * from team_members; raise exception 'FAIL authenticated baca team_members';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into team_members (email) values ('Ahli@Minda.com');
set role authenticated;
select set_config('request.jwt.claims', '{"email":"ahli@minda.com","role":"authenticated"}', false);
do $$
declare n int; before_ts timestamptz; after_ts timestamptz; f record;
begin
  assert public.is_team(), 'team (tak sensitif huruf besar)';
  select count(*) into n from referrals; assert n = 2, 'team nampak 2: ' || n;
  select * into f from referral_funnel where phone = '0123456789';
  assert f.landings = 2 and f.cta_clicks = 1 and f.registrations = 2 and f.pending = 2 and f.paid = 0,
    'funnel salah: ' || f::text;
  select status_updated_at into before_ts from referrals where referee_phone = '0171112222';
  perform pg_sleep(0.05);
  update referrals set status = 'paid' where referee_phone = '0171112222';
  get diagnostics n = row_count; assert n = 1, 'team update status';
  select status_updated_at into after_ts from referrals where referee_phone = '0171112222';
  assert after_ts > before_ts, 'status_updated_at tidak berubah';
  begin update referrals set referee_phone = '0100000000'; raise exception 'FAIL team ubah referee_phone';
  exception when insufficient_privilege then null; end;
  begin update referrals set status = 'bonus'; raise exception 'FAIL status tak sah';
  exception when check_violation then null; end;
  begin delete from referrals; raise exception 'FAIL team boleh DELETE';
  exception when insufficient_privilege then null; end;
  begin insert into referrers (phone,name,code) values ('0100000000','X Y','MO-0000-AAAA'); raise exception 'FAIL team INSERT referrers';
  exception when insufficient_privilege then null; end;
  select * into f from referral_funnel where phone = '0123456789';
  assert f.paid = 1 and f.pending = 1, 'funnel selepas bayar: ' || f::text;
end $$;
reset role;
\echo OK  E. pasukan (RLS, status, lajur terhad, funnel)

\echo SEMUA UJIAN LULUS
