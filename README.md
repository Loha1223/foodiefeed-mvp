# 味鮮牆 FoodieFeed

FoodieFeed 是一個在地化、具備時間急迫性的限時美食情報站。使用者可以分享快閃店、當日限定餐點、期間限定優惠與在地美食情報。

## 本機開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3000。

沒有 `.env.local` 時，首頁會使用 mockPosts fallback，仍可正常啟動。

## Supabase 設定與測試

### .env.local

在專案根目錄建立 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
```

### SQL / migrations 執行順序

依序執行：

```txt
supabase/migrations/20260429034500_create_posts_and_comments.sql
```

```txt
supabase/migrations/20260429035000_enable_public_rls.sql
```

```txt
supabase/migrations/20260429040000_create_increment_post_likes_rpc.sql
```

```txt
supabase/migrations/20260429041000_create_foodie_post_images_bucket.sql
```

```txt
supabase/migrations/20260429042000_allow_public_delete_foodie_post_images.sql
```

```txt
supabase/migrations/20260429043000_add_user_id_to_posts_and_comments.sql
```

```txt
supabase/migrations/20260429044000_enforce_ownership_rls.sql
```

```txt
supabase/migrations/20260429045000_extend_management_select_policies.sql
```

```txt
supabase/migrations/20260429046000_create_sponsored_posts.sql
```

```txt
supabase/migrations/20260429047000_create_ad_tracking_tables.sql
```

可選：加入測試資料：

```txt
supabase/seed.sql
```

按讚使用 `increment_post_likes` RPC 做 atomic increment，避免多人同時按讚時以 `post.likes + 1` 覆蓋彼此的結果。若按讚失敗，請先確認 RPC migration 已在 Supabase SQL Editor 執行。

### Supabase Auth

本階段使用 Email magic link / OTP 登入。請到 Supabase Dashboard 設定：

1. Authentication -> Providers
2. 確認 Email provider 已啟用
3. Authentication -> URL Configuration
4. Site URL 設定為 Vercel production URL
5. Redirect URLs 加入：

```txt
http://localhost:3000
http://localhost:3001
你的 Vercel production URL
```

本階段狀態：

- 前端已要求登入後才能發文、留言、上傳圖片。
- `posts.user_id` 會記錄發文者。
- `comments.user_id` 會記錄留言者。
- Storage 上傳路徑會使用 `posts/{user.id}/{timestamp}-{random}.{ext}`。
- RLS 已收斂為 ownership-based policy。

### 正式 RLS

目前資料庫安全規則：

- 未登入者可瀏覽未過期 posts。
- 未登入者可讀取 comments。
- 未登入者不可新增、修改、刪除 posts 或 comments。
- 登入者可新增自己的 posts，`posts.user_id` 必須等於 `auth.uid()`。
- 作者可修改 / 刪除自己的 posts。
- 一般使用者不能刪除別人的 posts。
- 登入者可新增自己的 comments，`comments.user_id` 必須等於 `auth.uid()`。
- 留言作者可修改 / 刪除自己的 comments。
- admin 可修改 / 刪除所有 posts，並可刪除所有 comments。
- likes 使用 `increment_post_likes` RPC，仍允許匿名與登入者執行。

既有 `user_id is null` 的 posts / comments：

- 仍可被公開讀取。
- 不會被一般登入使用者視為自己的內容。
- 不能由一般使用者刪除。
- 若需要清理，請使用 admin 帳號或 SQL 手動處理。

### Admin Role

已建立 `public.profiles` 作為 admin role 基礎：

```sql
insert into public.profiles (id, role)
values ('使用者 auth.users.id', 'admin')
on conflict (id) do update set role = 'admin';
```

Admin 使用者登入後，Navbar 會顯示「Admin 管理」入口。

### 投稿管理 UI

Navbar 的「我的投稿」會開啟「我的情報管理」區塊：

- 未登入時只顯示「請先登入後管理自己的投稿」。
- 登入後會查詢並列出 `post.user_id === auth.uid()` 的所有投稿，包含已過期內容。
- 一般使用者在 UI 中看不到別人的刪除按鈕。
- `profiles.role = 'admin'` 的使用者會額外看到「Admin 管理」。
- Admin 管理會另外查詢所有 posts，包含已過期內容，並提供刪除入口。
- Admin 刪除他人 post 的 DB delete 由 RLS admin policy 允許；Storage cleanup 若被 owner path policy 擋下，會 `console.warn`，不會 rollback DB delete。
- 真正安全仍由 Supabase RLS ownership policy 保護。
- 完整 server-side admin 後台與跨範圍 Storage cleanup 可在下一階段補齊。

### Feed / 管理查詢拆分

目前 posts 查詢分成三種：

- Feed query：首頁瀑布流使用 `fetchActivePosts()`，只顯示 `expiry > now()` 的未過期 posts。
- My posts query：「我的投稿」使用 `fetchMyPosts()`，登入者可查看自己的所有 posts，包含已過期內容。
- Admin posts query：「Admin 管理」使用 `fetchAdminPosts()`，admin 可查看所有 posts，包含已過期內容。

管理功能不再依賴首頁已載入的 active posts。Public 使用者仍不可讀取別人的過期 posts；一般登入者也只能透過 owner select policy 讀取自己的過期 posts。若 admin 看不到過期資料，請確認已執行：

```txt
supabase/migrations/20260429045000_extend_management_select_policies.sql
```

### Sponsored Posts 廣告卡 MVP

本階段新增自營廣告版位，不接 Google AdSense、不做付款，也還沒有完整廣告後台。

資料表：

```txt
sponsored_posts
```

主要欄位：

- `title`：廣告標題。
- `brand_name`：品牌名稱。
- `description`：廣告描述。
- `image_url`：廣告圖片 URL，空值時使用 `/placeholder-food.jpg`。
- `target_url`：活動連結，前端會以新分頁開啟。
- `city` / `district` / `category`：可選的投放匹配條件，空值代表不限。
- `placement`：目前使用 `feed`。
- `starts_at` / `ends_at`：投放期間。
- `is_active`：是否啟用。
- `priority`：排序權重，數字越大越優先。

RLS：

- public 只能讀取目前有效的 active ads：`is_active = true`、`starts_at <= now()`、`ends_at >= now()`。
- admin 可 select / insert / update / delete 所有 sponsored posts。
- 一般 authenticated user 不可新增、修改或刪除廣告。

用 Supabase Table Editor 手動新增廣告：

1. 開啟 Supabase Dashboard -> Table Editor。
2. 選擇 `sponsored_posts`。
3. 新增一筆資料，至少填入 `title`、`brand_name`、`ends_at`。
4. `placement` 使用 `feed`。
5. `is_active` 設為 `true`。
6. 若要全站顯示，`city`、`district`、`category` 保持空值。
7. 若要區域或類別投放，填入對應的 `city`、`district` 或 `category`。

Feed 會在每 6 張自然情報卡後插入 1 張 SponsoredCard。每筆廣告最多顯示一次，不會在同一批 feed 中循環重複曝光。廣告卡會清楚標示「贊助」，並使用與 PostCard 不同的視覺樣式，避免偽裝成自然情報。

### Sponsored Ads 曝光 / 點擊追蹤 MVP

廣告追蹤使用兩張資料表：

```txt
ad_impressions
ad_clicks
```

追蹤行為：

- SponsoredCard 進入畫面約 50% 時，會寫入一筆 `ad_impressions`。
- 同一張 SponsoredCard 在一次 mount 期間只記錄一次曝光。
- 使用者點擊「查看活動」時，會寫入一筆 `ad_clicks`。
- 匿名使用者也可記錄曝光 / 點擊，`user_id` 會是 `null`。
- 登入使用者會盡量寫入 `user_id`。
- `session_id` 儲存在 browser `localStorage` 的 `foodiefeed_ad_session_id`。
- 追蹤失敗只會 `console.warn`，不會顯示使用者錯誤，也不會阻擋廣告顯示或新分頁跳轉。

RLS：

- public / anon / authenticated 可以 insert `ad_impressions`。
- public / anon / authenticated 可以 insert `ad_clicks`。
- public 不可 select `ad_impressions` / `ad_clicks`。
- admin 可以 select / delete `ad_impressions`。
- admin 可以 select / delete `ad_clicks`。
- 一般 authenticated user 不可讀取追蹤資料。

查看廣告成效：

1. 開啟 Supabase Dashboard -> Table Editor。
2. 查看 `ad_impressions` 的曝光資料。
3. 查看 `ad_clicks` 的點擊資料。

粗略 CTR 查詢：

```sql
select
  sp.id,
  sp.title,
  count(distinct ai.id) as impressions,
  count(distinct ac.id) as clicks,
  case
    when count(distinct ai.id) = 0 then 0
    else round((count(distinct ac.id)::numeric / count(distinct ai.id)::numeric) * 100, 2)
  end as ctr_percent
from sponsored_posts sp
left join ad_impressions ai on ai.ad_id = sp.id
left join ad_clicks ac on ac.ad_id = sp.id
group by sp.id, sp.title
order by sp.id desc;
```

本階段仍不做付款、完整廣告後台、曝光去重、點擊防灌或正式報表。

### Admin 廣告成效檢視 MVP

`profiles.role = 'admin'` 的使用者登入後，Navbar 會顯示「廣告成效」入口。一般使用者不會看到此入口；資料讀取仍由 Supabase RLS 保護。

廣告成效面板會顯示：

- 廣告 ID
- 品牌名稱
- 廣告標題
- 版位
- 狀態：投放中 / 尚未開始 / 已結束 / 停用
- 投放期間
- 曝光數
- 點擊數
- CTR %

目前成效查詢由前端分別讀取 `sponsored_posts`、`ad_impressions`、`ad_clicks` 後聚合，適合作為 MVP。追蹤資料目前只聚合最近 5000 筆 impressions 與最近 5000 筆 clicks。資料量變大後，建議改成 RPC、materialized view、pagination 或後台報表服務。

本階段限制：

- 不做圖表。
- 不做廣告新增 / 編輯 / 刪除後台。
- 不做付款。
- 不做報表匯出。
- 不做正式 BI 分析。

### Supabase Storage

圖片上傳使用 bucket：

```txt
foodie-post-images
```

正式 policy 設定：

- public bucket
- public read
- authenticated upload to `posts/{auth.uid()}/...`
- authenticated delete only from `posts/{auth.uid()}/...`

可使用 migration 建立 bucket 與 policy：

```txt
supabase/migrations/20260429041000_create_foodie_post_images_bucket.sql
```

```txt
supabase/migrations/20260429042000_allow_public_delete_foodie_post_images.sql
```

```txt
supabase/migrations/20260429044000_enforce_ownership_rls.sql
```

也可以在 Supabase Dashboard 手動建立：

1. 到 Storage 建立 bucket：`foodie-post-images`
2. 設定為 public bucket
3. 加入 public read policy
4. 加入 authenticated upload policy，限制 `posts/{auth.uid()}/...`
5. 加入 authenticated delete policy，限制 `posts/{auth.uid()}/...`

刪除情報時：

- `posts` table 會刪除該筆資料。
- `comments` 透過 foreign key `on delete cascade` 自動刪除。
- 如果圖片是上傳到 `foodie-post-images` 的 Storage 圖片，且 object path 以 `posts/` 開頭，會嘗試同步刪除該 Storage object。
- 外部圖片 URL 與 `/placeholder-food.jpg` 不會刪除。
- 如果 Storage cleanup 失敗，post 刪除仍視為成功，但會在 `console.warn` 顯示錯誤。
- 若使用者不是圖片路徑 owner，Storage delete 會被 policy 擋下。

### RLS 注意事項

舊的 MVP public write / update / delete policy 已被正式 ownership-based RLS 取代。前端仍會顯示部分操作入口，但資料庫會以 RLS / Storage policy 作為最終安全邊界。

### 手動 smoke test checklist

1. 啟動本機：

```bash
npm run dev
```

2. 開啟首頁，確認可讀取 Supabase posts。
3. 未登入時嘗試發文，確認顯示「請先登入後再發佈情報」。
4. 未登入時開啟詳情並送出留言，確認顯示「請先登入後再留言」。
5. 未登入時確認不能直接 upload / delete Storage object。
6. 使用 Navbar Email 表單寄送 magic link 並登入。
7. 登入後 Navbar 顯示 user email。
8. 新增一筆情報，確認 `posts.user_id = auth.uid()`。
9. 選擇本機圖片並送出，確認圖片顯示，Storage path 為 `posts/{auth.uid()}/...`。
10. 重新整理頁面，確認圖片仍顯示。
11. 也測試只填圖片 URL，確認 URL 圖片仍可使用。
12. 對該情報按讚，確認 likes 更新。
13. 開啟詳情 modal。
14. 新增留言，確認留言列表立即更新，且 `comments.user_id = auth.uid()`。
15. 回到首頁，確認 PostCard 留言數 +1。
16. 重新整理頁面，確認留言數仍依 comments table 正確計算。
17. 點擊「我的投稿」，確認只看到自己的 posts。
18. 建立或手動修改一篇自己的過期 post，確認首頁不顯示該過期資料。
19. 點擊「我的投稿」，確認仍可看到自己的過期 post。
20. 使用另一個帳號登入，確認「我的投稿」不顯示第一個帳號建立的 post，也看不到第一個帳號的過期 post。
21. 一般使用者確認看不到「Admin 管理」入口。
22. 使用另一個帳號確認不能刪除第一個帳號建立的 post。
23. 確認另一個帳號不能 delete `posts/{第一個帳號 id}/...` 的 Storage object。
24. 手動將測試帳號設為 admin，重新登入後確認 Navbar 顯示「Admin 管理」。
25. 點擊「Admin 管理」，確認可看到所有 posts，包含過期 posts 與 owner metadata。
26. Admin 測試刪除任一 post，確認 DB delete 成功；若 Storage cleanup 被 policy 擋下，console 會顯示 warning。
27. 登出後確認不能再發文、留言、上傳圖片。
28. 回到原作者帳號，開啟「我的投稿」，刪除自己新增的情報。
29. 若該情報使用上傳圖片，確認 Storage 中對應 `posts/{auth.uid()}/...` object 已被清理。
30. 在 `sponsored_posts` 新增 active feed 廣告，確認首頁每 6 張自然情報後插入 1 張標示「贊助」的廣告卡。
31. 設定廣告 `city` / `district` / `category` 後，確認 Feed 篩選條件符合時才顯示。
32. 設定 `target_url` 後，確認「查看活動」會以新分頁開啟。
33. 廣告卡進入畫面後，確認 `ad_impressions` 新增資料。
34. 點擊「查看活動」後，確認 `ad_clicks` 新增資料。
35. 確認一般 public user 無法讀取 `ad_impressions` / `ad_clicks`，admin 才能查看。
36. 使用一般帳號登入，確認 Navbar 不顯示「廣告成效」。
37. 使用 admin 帳號登入，確認 Navbar 顯示「廣告成效」。
38. 點擊「廣告成效」，確認可看到 sponsored posts 的曝光、點擊與 CTR。
39. 若沒有 sponsored posts，確認顯示「目前沒有廣告資料」。

## 驗證指令

```bash
npm run typecheck
npm run build
```
