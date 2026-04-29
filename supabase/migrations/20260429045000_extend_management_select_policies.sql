-- Extend post read policies for management views without changing write rules.
-- Public users still read active posts only. Owners can read all of their own
-- posts, including expired posts. Admins can read all posts.

drop policy if exists "Posts owners read own" on public.posts;
drop policy if exists "Posts admins read all" on public.posts;

create policy "Posts owners read own"
on public.posts
for select
to authenticated
using (user_id = auth.uid());

create policy "Posts admins read all"
on public.posts
for select
to authenticated
using (public.is_admin());
