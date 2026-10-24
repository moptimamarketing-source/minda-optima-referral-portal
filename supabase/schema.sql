-- Minda Optima Referral: skema Supabase
-- Tampal SEMUA fail ni dalam Supabase > SQL Editor > Run. Selamat dijalankan berulang kali.
--
-- Prinsip keselamatan: publishable key kelihatan dalam browser, jadi anon TIDAK boleh baca/tulis
-- jadual terus. Anon hanya boleh panggil fungsi (RPC) di bawah. Pasukan (login Supabase Auth +
-- ada dalam team_members) boleh baca semua dan tukar status rujukan.

-- 0. Pemasangan pertama sahaja: buang 3 jadual kosong dari percubaan awal.
do $$
declare
  t text;
  n bigint;
begin
  if to_regclass('public.referral_events') is null then
    foreach t in array array['referral_tracking', 'registrations', 'referrers'] loop
      if to_regclass('public.' || t) is not null then
        execute format('select count(*) from public.%I', t) into n;
        if n > 0 then
          raise exception 'Jadual % sudah ada % baris data. Dibatalkan supaya data tak hilang.', t, n;
        end if;
      end if;
    end loop;
    drop table if exists public.referral_tracking, public.registrations, public.referrers cascade;
  end if;
end $$;

-- 1. Jadual ------------------------------------------------------------------------------------

create table if not exists public.referrers (
  id         bigint generated always as identity primary key,
  phone      text not null unique check (phone ~ '^01[0-9]{8,9}$'),
  name       text not null check (char_length(name) between 2 and 80),
  code       text not null unique check (code ~ '^MO-[0-9]{4}-[A-Z]{4}$'),
  created_at timestamptz not null default now()
);

-- Log corong: landing = buka link rujukan, cta_click = tekan Daftar, registered = siap daftar.
create table if not exists public.referral_events (
  id          bigint generated always as identity primary key,
  code        text not null,
  referrer_id bigint references public.referrers (id),
  visitor_id  text,
  event       text not null check (event in ('landing', 'cta_click', 'registered')),
  created_at  timestamptz not null default now()
);
create index if not exists referral_events_referrer_idx on public.referral_events (referrer_id, event);
create index if not exists referral_events_visitor_idx on public.referral_events (visitor_id, event, created_at);

create table if not exists public.referrals (
  id                bigint generated always as identity primary key,
  referrer_id       bigint not null references public.referrers (id),
  code              text not null,
  referee_phone     text not null unique check (referee_phone ~ '^01[0-9]{8,9}$'),
  referee_name      text,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected')),
  reward            integer not null,
  visitor_id        text,
  notes             text,
  registered_at     timestamptz not null default now(),
  status_updated_at timestamptz not null default now()
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id);

create table if not exists public.team_members (
  email      text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key   text primary key,
  value text not null
);
-- Kunci untuk panggilan rekod pendaftaran. Lihat nilainya dalam Table Editor > settings.
insert into public.settings (key, value)
values ('registration_api_key', replace(gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

create or replace function public.touch_status_updated_at() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then
    new.status_updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists referrals_touch on public.referrals;
create trigger referrals_touch before update on public.referrals
  for each row execute function public.touch_status_updated_at();

-- 2. Fungsi pembantu (tak boleh dipanggil dari browser) -----------------------------------------

create or replace function public.normalize_phone(p text) returns text
language sql immutable as $$
  select case
    when d ~ '^01[0-9]{8,9}$'  then d
    when d ~ '^601[0-9]{8,9}$' then '0' || substr(d, 3)
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) s
$$;

create or replace function public.mask_phone(p text) returns text
language sql immutable as $$
  select substr(p, 1, 3) || '-' || repeat('*', char_length(p) - 7) || right(p, 4)
$$;

create or replace function public.mask_name(n text) returns text
language sql immutable as $$
  select case
    when n is null or btrim(n) = '' then null
    when array_length(regexp_split_to_array(btrim(n), '\s+'), 1) > 1 then
      (regexp_split_to_array(btrim(n), '\s+'))[1] || ' ' ||
      upper(left((regexp_split_to_array(btrim(n), '\s+'))[2], 1)) || '.'
    else btrim(n)
  end
$$;

-- RM100 sehingga 31 Dis 2026 23:59:59 (waktu Malaysia), RM50 selepas itu.
create or replace function public.reward_for(ts timestamptz) returns integer
language sql immutable as $$
  select case when ts <= timestamptz '2026-12-31 23:59:59+08' then 100 else 50 end
$$;

create or replace function public.new_referral_code(p_phone text) returns text
language plpgsql volatile set search_path = public as $$
declare
  c text;
begin
  loop
    c := 'MO-' || right(p_phone, 4) || '-' ||
         (select string_agg(chr(65 + floor(random() * 26)::int), '') from generate_series(1, 4));
    exit when not exists (select 1 from public.referrers where code = c);
  end loop;
  return c;
end $$;

create or replace function public.is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

-- 3. Fungsi untuk browser (RPC) -----------------------------------------------------------------

-- Halaman jemputan: rekod 'landing' / 'cta_click' dan pulangkan nama penjemput (disamarkan).
create or replace function public.track_event(p_code text, p_visitor text, p_event text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_vid  text := nullif(left(btrim(coalesce(p_visitor, '')), 64), '');
  v_ref  public.referrers%rowtype;
begin
  if p_event not in ('landing', 'cta_click') then
    raise exception 'event tidak sah' using errcode = '22023';
  end if;
  if v_code !~ '^MO-[0-9]{4}-[A-Z]{4}$' then
    return jsonb_build_object('found', false);
  end if;

  select * into v_ref from public.referrers where code = v_code;

  -- Abaikan klik berganda (refresh / double tap) dari pelawat yang sama dalam 30 saat.
  if v_vid is null or not exists (
    select 1 from public.referral_events e
    where e.visitor_id = v_vid and e.code = v_code and e.event = p_event
      and e.created_at > now() - interval '30 seconds'
  ) then
    insert into public.referral_events (code, referrer_id, visitor_id, event)
    values (v_code, v_ref.id, v_vid, p_event);
  end if;

  return jsonb_build_object(
    'found', v_ref.id is not null,
    'code', v_ref.code,
    'referrerName', public.mask_name(v_ref.name)
  );
end $$;

-- Borang pendaftaran panggil ini selepas pendaftaran berjaya.
create or replace function public.record_registration(
  p_code text, p_phone text, p_name text,
  p_visitor text default null, p_api_key text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_key   text;
  v_code  text := upper(btrim(coalesce(p_code, '')));
  v_phone text := public.normalize_phone(p_phone);
  v_name  text := nullif(left(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), 80), '');
  v_vid   text := nullif(left(btrim(coalesce(p_visitor, '')), 64), '');
  v_ref   public.referrers%rowtype;
  v_id    bigint;
begin
  select value into v_key from public.settings where key = 'registration_api_key';
  if v_key is not null and p_api_key is distinct from v_key then
    return jsonb_build_object('ok', false, 'reason', 'unauthorized');
  end if;
  if v_phone is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_phone');
  end if;

  select * into v_ref from public.referrers where code = v_code;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_code');
  end if;
  if v_ref.phone = v_phone then
    return jsonb_build_object('ok', false, 'reason', 'self_referral');
  end if;

  insert into public.referrals (referrer_id, code, referee_phone, referee_name, reward, visitor_id)
  values (v_ref.id, v_ref.code, v_phone, v_name, public.reward_for(now()), v_vid)
  on conflict (referee_phone) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'reason', 'duplicate');
  end if;

  insert into public.referral_events (code, referrer_id, visitor_id, event)
  values (v_ref.code, v_ref.id, v_vid, 'registered');

  return jsonb_build_object('ok', true, 'status', 'pending');
end $$;

-- Ibu bapa dapat kod rujukan. Nombor sedia ada dapat kod yang sama semula.
create or replace function public.register_referrer(p_phone text, p_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_name  text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
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
    insert into public.referrers (phone, name, code)
    values (v_phone, v_name, public.new_referral_code(v_phone))
    on conflict (phone) do nothing;
    select * into v_ref from public.referrers where phone = v_phone;
  end if;

  return jsonb_build_object(
    'ok', true, 'phone', v_phone, 'code', v_ref.code, 'name', public.mask_name(v_ref.name)
  );
end $$;

-- Data dashboard ibu bapa. Nama dan nombor rakan sentiasa disamarkan.
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
    'referrer', jsonb_build_object('name', public.mask_name(v_ref.name), 'code', v_ref.code),
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

-- 4. Paparan untuk pasukan ----------------------------------------------------------------------

create or replace view public.referral_funnel with (security_invoker = true) as
select
  r.id, r.name, r.phone, r.code, r.created_at,
  (select count(*) from public.referral_events e where e.referrer_id = r.id and e.event = 'landing')   as landings,
  (select count(*) from public.referral_events e where e.referrer_id = r.id and e.event = 'cta_click') as cta_clicks,
  (select count(*) from public.referrals x where x.referrer_id = r.id)                                  as registrations,
  (select count(*) from public.referrals x where x.referrer_id = r.id and x.status = 'pending')         as pending,
  (select count(*) from public.referrals x where x.referrer_id = r.id and x.status = 'approved')        as approved,
  (select count(*) from public.referrals x where x.referrer_id = r.id and x.status = 'paid')            as paid
from public.referrers r;

-- 5. Keselamatan: RLS + kebenaran ---------------------------------------------------------------

alter table public.referrers       enable row level security;
alter table public.referral_events enable row level security;
alter table public.referrals       enable row level security;
alter table public.team_members    enable row level security;
alter table public.settings        enable row level security;

drop policy if exists team_read on public.referrers;
create policy team_read on public.referrers for select to authenticated using (public.is_team());
drop policy if exists team_read on public.referral_events;
create policy team_read on public.referral_events for select to authenticated using (public.is_team());
drop policy if exists team_read on public.referrals;
create policy team_read on public.referrals for select to authenticated using (public.is_team());
drop policy if exists team_update on public.referrals;
create policy team_update on public.referrals for update to authenticated
  using (public.is_team()) with check (public.is_team());

revoke all on public.referrers, public.referral_events, public.referrals,
              public.team_members, public.settings, public.referral_funnel
  from public, anon, authenticated;
grant select on public.referrers, public.referral_events, public.referrals, public.referral_funnel
  to authenticated;
grant update (status, notes) on public.referrals to authenticated;

revoke all on function
  public.normalize_phone(text), public.mask_phone(text), public.mask_name(text),
  public.reward_for(timestamptz), public.new_referral_code(text), public.is_team(),
  public.touch_status_updated_at(),
  public.track_event(text, text, text),
  public.record_registration(text, text, text, text, text),
  public.register_referrer(text, text), public.referrer_dashboard(text)
  from public, anon, authenticated;

-- Pembantu yang dipanggil dari dalam RLS dan view mesti boleh dijalankan oleh 'authenticated'.
grant execute on function public.is_team() to authenticated;
-- Satu-satunya fungsi yang browser (anon) boleh panggil:
grant execute on function
  public.track_event(text, text, text),
  public.record_registration(text, text, text, text, text),
  public.register_referrer(text, text),
  public.referrer_dashboard(text)
  to anon, authenticated;

-- 6. Tambah ahli pasukan (ubah emel, kemudian jalankan). Cipta juga pengguna yang sama di
--    Supabase > Authentication > Users > Add user (tandakan Auto Confirm).
-- insert into public.team_members (email) values ('emel-pasukan@contoh.com');
