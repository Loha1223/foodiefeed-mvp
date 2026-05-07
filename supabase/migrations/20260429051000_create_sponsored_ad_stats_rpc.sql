-- Aggregate sponsored ad stats in the database.
-- This avoids pulling raw ad_impressions/ad_clicks rows into the browser for
-- admin reporting. It preserves the MVP dedupe definition:
-- ad_id + session_id + created_at date, with row id fallback for null session_id.

create or replace function public.get_sponsored_ad_stats()
returns table (
  id bigint,
  title text,
  brand_name text,
  placement text,
  is_active boolean,
  starts_at timestamptz,
  ends_at timestamptz,
  impressions bigint,
  clicks bigint,
  ctr_percent numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_required';
  end if;

  return query
  with impression_counts as (
    select
      ad_impressions.ad_id,
      count(distinct (
        coalesce(ad_impressions.session_id, 'row_' || ad_impressions.id::text)
        || ':'
        || ad_impressions.created_at::date::text
      ))::bigint as impressions
    from public.ad_impressions
    where ad_impressions.ad_id is not null
    group by ad_impressions.ad_id
  ),
  click_counts as (
    select
      ad_clicks.ad_id,
      count(distinct (
        coalesce(ad_clicks.session_id, 'row_' || ad_clicks.id::text)
        || ':'
        || ad_clicks.created_at::date::text
      ))::bigint as clicks
    from public.ad_clicks
    where ad_clicks.ad_id is not null
    group by ad_clicks.ad_id
  )
  select
    sponsored_posts.id,
    sponsored_posts.title,
    sponsored_posts.brand_name,
    sponsored_posts.placement,
    coalesce(sponsored_posts.is_active, false) as is_active,
    sponsored_posts.starts_at,
    sponsored_posts.ends_at,
    coalesce(impression_counts.impressions, 0)::bigint as impressions,
    coalesce(click_counts.clicks, 0)::bigint as clicks,
    case
      when coalesce(impression_counts.impressions, 0) = 0 then 0::numeric
      else round(
        (
          coalesce(click_counts.clicks, 0)::numeric
          / impression_counts.impressions::numeric
        ) * 100,
        2
      )
    end as ctr_percent
  from public.sponsored_posts
  left join impression_counts
    on impression_counts.ad_id = sponsored_posts.id
  left join click_counts
    on click_counts.ad_id = sponsored_posts.id
  order by sponsored_posts.created_at desc;
end;
$$;

revoke all on function public.get_sponsored_ad_stats() from public;
grant execute on function public.get_sponsored_ad_stats() to authenticated;
