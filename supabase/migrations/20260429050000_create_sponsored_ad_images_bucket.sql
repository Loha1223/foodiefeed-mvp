-- Create Storage bucket and policies for sponsored ad images.
-- Admin users upload ad creatives to sponsored-ad-images and sponsored_posts
-- continues to store the resulting public URL in image_url.

insert into storage.buckets (id, name, public)
values ('sponsored-ad-images', 'sponsored-ad-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Sponsored ad images public read" on storage.objects;
drop policy if exists "Sponsored ad images admin upload" on storage.objects;
drop policy if exists "Sponsored ad images admin delete" on storage.objects;

create policy "Sponsored ad images public read"
on storage.objects
for select
to public
using (bucket_id = 'sponsored-ad-images');

create policy "Sponsored ad images admin upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sponsored-ad-images'
  and public.is_admin() = true
  and name like ('ads/' || auth.uid()::text || '/%')
);

create policy "Sponsored ad images admin delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'sponsored-ad-images'
  and public.is_admin() = true
);
