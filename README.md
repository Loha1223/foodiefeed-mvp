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

可選：加入測試資料：

```txt
supabase/seed.sql
```

按讚使用 `increment_post_likes` RPC 做 atomic increment，避免多人同時按讚時以 `post.likes + 1` 覆蓋彼此的結果。若按讚失敗，請先確認 RPC migration 已在 Supabase SQL Editor 執行。

### Supabase Storage

圖片上傳使用 bucket：

```txt
foodie-post-images
```

MVP 測試設定：

- public bucket
- public read
- public upload
- public delete for `posts/` images

可使用 migration 建立 bucket 與 MVP policy：

```txt
supabase/migrations/20260429041000_create_foodie_post_images_bucket.sql
```

```txt
supabase/migrations/20260429042000_allow_public_delete_foodie_post_images.sql
```

也可以在 Supabase Dashboard 手動建立：

1. 到 Storage 建立 bucket：`foodie-post-images`
2. 設定為 public bucket
3. 加入 MVP 測試用 public read / public insert policy
4. 若要刪除情報時同步清理圖片，也加入限制 `posts/` 路徑的 public delete policy

正式上線前應改成登入後才能 upload，限制使用者只能寫入自己的路徑，並在後端或 policy 搭配檔案大小與 MIME type 檢查。

刪除情報時：

- `posts` table 會刪除該筆資料。
- `comments` 透過 foreign key `on delete cascade` 自動刪除。
- 如果圖片是上傳到 `foodie-post-images` 的 Storage 圖片，且 object path 以 `posts/` 開頭，會嘗試同步刪除該 Storage object。
- 外部圖片 URL 與 `/placeholder-food.jpg` 不會刪除。
- 如果 Storage cleanup 失敗，post 刪除仍視為成功，但會在 `console.warn` 顯示錯誤。
- 正式上線後 Storage delete policy 應改成 ownership-based。

### MVP RLS 安全提醒

目前 RLS policy 允許 public insert/update/delete，僅適合 MVP 測試。正式上線前應改成登入會員與 ownership policy，避免匿名使用者任意修改或刪除資料。

### 手動 smoke test checklist

1. 啟動本機：

```bash
npm run dev
```

2. 開啟首頁，確認可讀取 Supabase posts。
3. 新增一筆情報。
4. 選擇本機圖片並送出，確認圖片顯示。
5. 重新整理頁面，確認圖片仍顯示。
6. 也測試只填圖片 URL，確認 URL 圖片仍可使用。
7. 對該情報按讚，確認 likes 更新。
8. 開啟詳情 modal。
9. 新增留言，確認留言列表立即更新。
10. 回到首頁，確認 PostCard 留言數 +1。
11. 重新整理頁面，確認留言數仍依 comments table 正確計算。
12. 開啟管理後台，刪除剛新增的情報。
13. 若該情報使用上傳圖片，確認 Storage 中對應 `posts/` object 已被清理。

## 驗證指令

```bash
npm run typecheck
npm run build
```
