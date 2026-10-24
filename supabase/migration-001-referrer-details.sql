-- Jalankan sekali di Supabase > SQL Editor. Selamat dijalankan berulang kali.
-- Tambah butiran penjemput (emel, bank, pekerjaan) dan kemas kini register_referrer.

alter table public.referrers
  add column if not exists email        text,
  add column if not exists bank_account text,
  add column if not exists bank_name    text,
  add column if not exists occupation   text;

drop function if exists public.register_referrer(text, text);

create or replace function public.register_referrer(
  p_phone text,
  p_name text default null,
  p_email text default null,
  p_bank_account text default null,
  p_bank_name text default null,
  p_occupation text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_name  text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_acc   text := nullif(regexp_replace(coalesce(p_bank_account, ''), '\D', '', 'g'), '');
  v_bank  text := nullif(btrim(coalesce(p_bank_name, '')), '');
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
    if v_acc is null or char_length(v_acc) < 6 or char_length(v_acc) > 20 then
      return jsonb_build_object('ok', false, 'reason', 'bank_account_invalid');
    end if;
    if v_bank is null or char_length(v_bank) > 50 then
      return jsonb_build_object('ok', false, 'reason', 'bank_name_required');
    end if;
    insert into public.referrers (phone, name, code, email, bank_account, bank_name, occupation)
    values (v_phone, v_name, public.new_referral_code(v_phone), v_email, v_acc, v_bank, left(v_occ, 50))
    on conflict (phone) do nothing;
    select * into v_ref from public.referrers where phone = v_phone;
  end if;

  return jsonb_build_object(
    'ok', true, 'phone', v_phone, 'code', v_ref.code, 'name', public.mask_name(v_ref.name)
  );
end $$;

revoke execute on function public.register_referrer(text, text, text, text, text, text) from public;
grant execute on function public.register_referrer(text, text, text, text, text, text) to anon, authenticated;
