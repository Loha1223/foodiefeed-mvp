-- Enforce ownership-based RLS for posts, comments, and FoodieFeed Storage.
-- This replaces MVP public write policies while keeping public read access.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "Profiles users read own" on public.profiles;
drop policy if exists "Profiles admins read all" on public.profiles;

create policy "Profiles users read own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Profiles admins read all"
on public.profiles
for select
to authenticated
using (public.is_admin());

-- Keep anonymous likes working after posts update policies become ownership-only.
create or replace function public.increment_post_likes(post_id bigint)
returns public.posts
language sql
security definer
set search_path = public
as $$
  update public.posts
  set likes = coalesce(likes, 0) + 1
  where id = post_id
  returning *;
$$;

revoke all on function public.increment_post_likes(bigint) from public;
grant execute on function public.increment_post_likes(bigint) to anon;
grant execute on function public.increment_post_likes(bigint) to authenticated;

alter table public.posts enable row level security;
alter table public.comments enable row level security;

drop policy if exists "Allow public read posts" on public.posts;
drop policy if exists "Allow public insert posts" on public.posts;
drop policy if exists "Allow public update posts" on public.posts;
drop policy if exists "Allow public delete posts" on public.posts;
drop policy if exists "Posts public read active" on public.posts;
drop policy if exists "Posts authenticated insert own" on public.posts;
drop policy if exists "Posts owners update own" on public.posts;
drop policy if exists "Posts owners delete own" on public.posts;
drop policy if exists "Posts admins update all" on public.posts;
drop policy if exists "Posts admins delete all" on public.posts;

create policy "Posts public read active"
on public.posts
for select
to public
using (expiry > now());

create policy "Posts authenticated insert own"
on public.posts
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Posts owners update own"
on public.posts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Posts owners delete own"
on public.posts
for delete
to authenticated
using (user_id = auth.uid());

create policy "Posts admins update all"
on public.posts
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Posts admins delete all"
on public.posts
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Allow public read comments" on public.comments;
drop policy if exists "Allow public insert comments" on public.comments;
drop policy if exists "Comments public read" on public.comments;
drop policy if exists "Comments authenticated insert own" on public.comments;
drop policy if exists "Comments owners update own" on public.comments;
drop policy if exists "Comments owners delete own" on public.comments;
drop policy if exists "Comments admins delete all" on public.comments;

create policy "Comments public read"
on public.comments
for select
to public
using (true);

create policy "Comments authenticated insert own"
on public.comments
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Comments owners update own"
on public.comments
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Comments owners delete own"
on public.comments
for delete
to authenticated
using (user_id = auth.uid());

create policy "Comments admins delete all"
on public.comments
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Allow public read foodie post images" on storage.objects;
drop policy if exists "Allow public upload foodie post images" on storage.objects;
drop policy if exists "Allow public delete foodie post images" on storage.objects;
drop policy if exists "Foodie post images public read" on storage.objects;
drop policy if exists "Foodie post images authenticated upload own" on storage.objects;
drop policy if exists "Foodie post images authenticated delete own" on storage.objects;

create policy "Foodie post images public read"
on storage.objects
for select
to public
using (bucket_id = 'foodie-post-images');

create policy "Foodie post images authenticated upload own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'foodie-post-images'
  and name like ('posts/' || auth.uid()::text || '/%')
);

create policy "Foodie post images authenticated delete own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'foodie-post-images'
  and name like ('posts/' || auth.uid()::text || '/%')
);
