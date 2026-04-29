-- Harden MVP ad tracking payloads while keeping anonymous inserts enabled.
-- Constraints are NOT VALID so existing tracking data is preserved. PostgreSQL
-- still enforces these checks for new rows after the constraints are added.
-- jsonb metadata size is intentionally not constrained in this MVP migration;
-- the client keeps metadata small and later production hardening should move
-- tracking through server-side RPC / Edge Function rate limits.

alter table public.ad_impressions
  add constraint ad_impressions_ad_id_required
  check (ad_id is not null) not valid;

alter table public.ad_impressions
  add constraint ad_impressions_placement_allowed
  check (placement in ('feed', 'hero', 'detail')) not valid;

alter table public.ad_impressions
  add constraint ad_impressions_page_path_length
  check (page_path is null or char_length(page_path) <= 300) not valid;

alter table public.ad_impressions
  add constraint ad_impressions_session_id_length
  check (session_id is null or char_length(session_id) <= 120) not valid;

alter table public.ad_clicks
  add constraint ad_clicks_ad_id_required
  check (ad_id is not null) not valid;

alter table public.ad_clicks
  add constraint ad_clicks_placement_allowed
  check (placement in ('feed', 'hero', 'detail')) not valid;

alter table public.ad_clicks
  add constraint ad_clicks_page_path_length
  check (page_path is null or char_length(page_path) <= 300) not valid;

alter table public.ad_clicks
  add constraint ad_clicks_target_url_length
  check (target_url is null or char_length(target_url) <= 500) not valid;

alter table public.ad_clicks
  add constraint ad_clicks_target_url_http
  check (target_url is null or target_url ~* '^https?://') not valid;

alter table public.ad_clicks
  add constraint ad_clicks_session_id_length
  check (session_id is null or char_length(session_id) <= 120) not valid;
