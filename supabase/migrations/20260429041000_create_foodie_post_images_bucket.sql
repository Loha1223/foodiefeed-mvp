-- MVP-only public image bucket for FoodieFeed post images.
-- Public upload is convenient for smoke testing, but production should require
-- authenticated users and ownership-based paths/policies.

insert into storage.buckets (id, name, public)
values ('foodie-post-images', 'foodie-post-images', true)
on conflict (id) do update
set public = true;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow public read foodie post images'
  ) then
    create policy "Allow public read foodie post images"
    on storage.objects
    for select
    to public
    using (bucket_id = 'foodie-post-images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow public upload foodie post images'
  ) then
    create policy "Allow public upload foodie post images"
    on storage.objects
    for insert
    to public
    with check (bucket_id = 'foodie-post-images');
  end if;
end $$;
