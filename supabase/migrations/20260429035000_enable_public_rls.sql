-- Run after the posts and comments tables have been created.
-- MVP-only policy: public update/delete is convenient for testing, but should
-- be replaced with authenticated ownership checks before production launch.

alter table posts enable row level security;
alter table comments enable row level security;

create policy "Allow public read posts"
on posts
for select
using (true);

create policy "Allow public insert posts"
on posts
for insert
with check (true);

create policy "Allow public update posts"
on posts
for update
using (true)
with check (true);

create policy "Allow public delete posts"
on posts
for delete
using (true);

create policy "Allow public read comments"
on comments
for select
using (true);

create policy "Allow public insert comments"
on comments
for insert
with check (true);
