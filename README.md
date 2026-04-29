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

目前尚未完成前端 admin 管理後台權限 UI；下一階段會補。

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
17. 使用另一個帳號登入，確認不能刪除第一個帳號建立的 post。
18. 確認另一個帳號不能 delete `posts/{第一個帳號 id}/...` 的 Storage object。
19. 登出後確認不能再發文、留言、上傳圖片。
20. 回到原作者帳號，開啟管理後台，刪除自己新增的情報。
21. 若該情報使用上傳圖片，確認 Storage 中對應 `posts/{auth.uid()}/...` object 已被清理。

## 驗證指令

```bash
npm run typecheck
npm run build
```
