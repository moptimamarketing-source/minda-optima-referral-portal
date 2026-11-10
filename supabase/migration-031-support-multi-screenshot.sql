-- Let a support request carry up to 5 screenshots instead of just one.
-- Old screenshot_path column kept as-is (first screenshot, for anything
-- still reading it); new screenshot_paths holds the full list.

alter table public.support_requests add column if not exists screenshot_paths text[];
