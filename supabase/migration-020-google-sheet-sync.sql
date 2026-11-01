-- Track which referrals came from Google Sheet sync (optional, for auditing)
create table if not exists public.google_sheet_syncs (
  id           bigserial primary key,
  sheet_row_id text,
  referral_id  bigint references public.referrals(id),
  sync_date    timestamptz not null default now()
);

create index if not exists google_sheet_syncs_referral_idx on public.google_sheet_syncs (referral_id);
