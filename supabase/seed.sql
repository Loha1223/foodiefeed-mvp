delete from posts
where title in (
  'Seed 午間限定蔥油餅',
  'Seed 信義快閃甜甜圈',
  'Seed 夜間限定滷味拼盤'
);

with inserted_posts as (
  insert into posts (
    name,
    title,
    city,
    district,
    address,
    img,
    category,
    likes,
    expiry
  )
  values
    (
      'Seed 大安小吃攤',
      'Seed 午間限定蔥油餅',
      '台北市',
      '大安區',
      '台北市大安區測試路 12 號',
      '/placeholder-food.jpg',
      '當日限定',
      8,
      now() + interval '14 days'
    ),
    (
      'Seed 信義甜點車',
      'Seed 信義快閃甜甜圈',
      '台北市',
      '信義區',
      '台北市信義區測試街 88 號',
      '/placeholder-food.jpg',
      '快閃店',
      15,
      now() + interval '14 days'
    ),
    (
      'Seed 夜市滷味',
      'Seed 夜間限定滷味拼盤',
      '台北市',
      '大安區',
      '台北市大安區範例路 66 號',
      '/placeholder-food.jpg',
      '在地美食',
      4,
      now() + interval '14 days'
    )
  returning id, title
)
insert into comments (post_id, user_name, content)
select id, '訪客', '排隊大約 10 分鐘，建議趁熱吃。'
from inserted_posts
where title = 'Seed 午間限定蔥油餅'
union all
select id, 'Foodie', '甜甜圈下午剛出爐，口感很好。'
from inserted_posts
where title = 'Seed 信義快閃甜甜圈'
union all
select id, '訪客', '滷味拼盤份量足，兩個人分剛好。'
from inserted_posts
where title = 'Seed 夜間限定滷味拼盤'
union all
select id, '在地人', '辣度可以請店家調整。'
from inserted_posts
where title = 'Seed 夜間限定滷味拼盤';
