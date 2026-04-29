-- Atomic likes increment RPC.
-- This avoids the race condition caused by reading post.likes in the client
-- and writing back post.likes + 1 when multiple users like the same post.

create or replace function increment_post_likes(post_id bigint)
returns posts
language sql
as $$
  update posts
  set likes = coalesce(likes, 0) + 1
  where id = post_id
  returning *;
$$;

grant execute on function increment_post_likes(bigint) to anon;
grant execute on function increment_post_likes(bigint) to authenticated;
