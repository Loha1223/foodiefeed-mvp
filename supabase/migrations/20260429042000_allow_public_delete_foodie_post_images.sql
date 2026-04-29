-- MVP-only public delete policy for cleaning up uploaded FoodieFeed images.
-- Production should replace this with authenticated, ownership-based deletes.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Allow public delete foodie post images'
  ) then
    create policy "Allow public delete foodie post images"
    on storage.objects
    for delete
    to public
    using (
      bucket_id = 'foodie-post-images'
      and name like 'posts/%'
    );
  end if;
end $$;
