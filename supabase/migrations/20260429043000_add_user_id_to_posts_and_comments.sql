-- Adds ownership columns for future authenticated policies.
-- This migration only stores user ownership metadata; ownership-based RLS will
-- be added in the next phase.

alter table posts
add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists posts_user_id_idx
on posts(user_id);

alter table comments
add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists comments_user_id_idx
on comments(user_id);
