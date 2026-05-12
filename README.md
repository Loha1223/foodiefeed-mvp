# 味鮮牆 FoodieFeed

FoodieFeed 是一個在地化、具備時間急迫性的限時美食情報站。使用者可以分享快閃店、當日限定餐點、期間限定優惠與在地美食情報。

## 本機開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3000。

沒有 `.env.local` 時，首頁會使用 mockPosts fallback，仍可正常啟動。

## CI / QA Gate

GitHub Actions 會在以下情境自動執行最低限度品質檢查：

- push 到 `main`
- pull request 到 `main`

Workflow：`.github/workflows/ci.yml`

CI 會依序執行：

```bash
npm ci
npm run typecheck
npm run build
```

CI 使用 Node.js 20 與 npm cache。workflow 不包含 Supabase secret，也不需要真實 Supabase env 才能完成 build。

本機提交前建議手動執行：

```bash
npm run typecheck
npm run build
```

Pre-push local checklist：

1. `npm run typecheck`
2. `npm run build`
3. 本機手動測首頁、發文、留言、按讚、Admin、Sponsored Ads。
4. `git status` 確認 `.env.local` 未被提交。

若 CI 失敗，不建議合併或部署。Vercel 部署前仍建議確認 GitHub Actions 通過。

CI 目前不測真實 Supabase CRUD、Auth、Storage、RLS 或 E2E flow；這些仍需依照 smoke test checklist 手動驗證。

## Soft Launch / QA Docs

- [Soft Launch Checklist](docs/SOFT_LAUNCH_CHECKLIST.md)
- [Manual QA Runbook](docs/MANUAL_QA_RUNBOOK.md)
- [Rollback Plan](docs/ROLLBACK_PLAN.md)

上述 checklist / runbook 已納入：

- `20260429050000_create_sponsored_ad_images_bucket.sql` 檢核
- `sponsored-ad-images` bucket / policy 權限檢核
- Hero carousel（0/1/2-3/>3）、dismiss / restore、`placement = 'hero'` tracking 檢核

## Production Environment（正式環境基準）

- Production URL：`https://foodiefeed.tw`
- `https://www.foodiefeed.tw` 需轉址至 `https://foodiefeed.tw`
- Supabase Auth Site URL：`https://foodiefeed.tw`
- Supabase Custom SMTP provider：Resend
- Sender：`FoodieFeed 味鮮牆 <no-reply@foodiefeed.tw>`

## Supabase 設定與測試

### .env.local

在專案根目錄建立 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
NEXT_PUBLIC_SITE_URL=你的正式網站 URL
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

```txt
supabase/migrations/20260429048000_harden_ad_tracking.sql
```

```txt
supabase/migrations/20260429049000_harden_post_likes.sql
```

```txt
supabase/migrations/20260429050000_create_sponsored_ad_images_bucket.sql
```

```txt
supabase/migrations/20260429051000_create_sponsored_ad_stats_rpc.sql
```

可選：加入測試資料：

```txt
supabase/seed.sql
```

按讚使用 `increment_post_likes` RPC 做 atomic increment 與 user/session 去重，避免多人同時按讚時以 `post.likes + 1` 覆蓋彼此的結果，也避免同一使用者或同一匿名 session 對同一 post 重複灌讚。若按讚失敗，請先確認 likes RPC migrations 已在 Supabase SQL Editor 執行。

### Supabase Auth

本階段使用 Email magic link / OTP 登入。請到 Supabase Dashboard 設定：

1. Authentication -> Providers
2. 確認 Email provider 已啟用
3. Authentication -> URL Configuration
4. Site URL 設定為 `https://foodiefeed.tw`
5. Redirect URLs 加入：

```txt
http://localhost:3000
http://localhost:3001
https://foodiefeed-mvp.vercel.app
https://foodiefeed.tw
https://www.foodiefeed.tw
```

本階段狀態：

- 前端已要求登入後才能發文、留言、上傳圖片。
- `posts.user_id` 會記錄發文者。
- `comments.user_id` 會記錄留言者。
- Storage 上傳路徑會使用 `posts/{user.id}/{timestamp}-{random}.{ext}`。
- RLS 已收斂為 ownership-based policy。

## Production Config Checklist

### Vercel Environment Variables

Production 與 Preview 環境都建議設定：

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
```

正式環境建議值：

```txt
NEXT_PUBLIC_SITE_URL=https://foodiefeed.tw
```

若尚未設定，程式會 fallback 到：

```txt
https://foodiefeed-mvp.vercel.app
```

### Supabase Auth Redirect URLs

請到 Supabase Dashboard -> Authentication -> URL Configuration 確認：

- `http://localhost:3000`
- `http://localhost:3001`
- `https://foodiefeed-mvp.vercel.app`
- `https://foodiefeed.tw`
- `https://www.foodiefeed.tw`
- 若使用 Vercel Preview Deployments，需明確決定是否允許 preview URL 登入

### Security Headers

`next.config.mjs` 已加入基礎 security headers：

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy`

目前 CSP 是可部署的溫和版本：

- 允許 `self` scripts/styles。
- 暫保留 `unsafe-inline` / `unsafe-eval`，避免破壞 Next.js runtime。
- `img-src` 允許 `self`、`data:`、`blob:`、`https:`，支援 Supabase Storage 與外部 `image_url`。
- `connect-src` 允許 Supabase HTTPS / WSS，以及 localhost dev websocket。
- `frame-ancestors 'none'` 防止被 iframe 嵌入。

若未來收緊 CSP，需逐步驗證：

- Supabase Auth / API / Storage
- Vercel production assets
- 外部 `PostCard` / `SponsoredCard` 圖片 URL
- Magic link 登入流程

HSTS 適合正式 HTTPS 網域。若改用自訂網域，需先確認全站 HTTPS 正常，再保留 preload 設定。

### SEO

已加入：

- `metadataBase`
- `openGraph.url`
- `openGraph.siteName`
- `app/robots.ts`
- `app/sitemap.ts`

目前 sitemap 只列首頁，因為 posts 尚未有獨立 detail route。正式自訂網域上線時，請同步更新 `NEXT_PUBLIC_SITE_URL`。

### Custom SMTP

正式環境已使用 Resend：

- Provider：Resend
- Verified domain：`foodiefeed.tw`
- Sender：`no-reply@foodiefeed.tw`
- 建議定期檢查 Resend 後台寄送成功率、退信與封鎖事件

### Cloudflare DNS（正式環境）

請確認 DNS 設定包含：

- `A`：`foodiefeed.tw` -> `76.76.21.21`
- `CNAME`：`www` -> `cname.vercel-dns.com`
- Resend 驗證所需 `TXT` / `MX` / `DMARC` records 已正確生效

### Post-deploy QA

每次 production deploy 後建議檢查：

- Magic link 登入
- 發文
- 圖片裁切（PostModal 4:3 / Admin hero 2:1 / Admin feed 4:3）
- 留言
- 按讚防重複
- Hero carousel
- SponsoredCard 曝光 / 點擊
- Admin 廣告管理
- Admin 廣告成效
- `/robots.txt`
- `/sitemap.xml`

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
- likes 使用 `increment_post_likes` RPC，仍允許匿名與登入者執行，但會透過 `post_likes` 做 user/session 去重。

既有 `user_id is null` 的 posts / comments：

- 仍可被公開讀取。
- 不會被一般登入使用者視為自己的內容。
- 不能由一般使用者刪除。
- 若需要清理，請使用 admin 帳號或 SQL 手動處理。

### Likes 防濫用 MVP

按讚資料使用：

```txt
post_likes
```

`posts.likes` 仍保留作為前台顯示 counter；`post_likes` 用於防止重複按讚。

設計：

- 登入使用者以 `post_id + user_id` 去重。
- 匿名訪客以 `post_id + session_id` 去重。
- 匿名 session id 儲存在 browser `localStorage` 的 `foodiefeed_like_session_id`。
- `session_id` 最長 120 字元。
- 一般使用者不可直接 select / insert `post_likes`。
- `post_likes` 寫入只透過 `increment_post_likes` security definer RPC。
- admin 可 select / delete `post_likes`，用於稽核或清理。
- 若已按過讚，RPC 會回 `already_liked`，前端顯示「你已經按過讚」，且 optimistic like 會 rollback。

新版 `increment_post_likes(post_id, session_id, metadata)`：

- `auth.uid()` 存在時，以 `user_id` 判斷是否已按讚。
- 未登入時，`session_id` 必填，並以 `session_id` 判斷是否已按讚。
- 新 like 會先寫入 `post_likes`，再將 `posts.likes + 1`。
- unique index 會阻止同時重複 insert，避免 race condition 重複加讚。
- post 不存在時回 `post_not_found`。

限制：

- localStorage session 可被清除。
- 尚未做 unlike。
- 尚未做 IP / device fingerprint / CAPTCHA。
- 尚未做完整 rate limit。
- 這是 MVP 級防濫用，不是完整反作弊系統。

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
- `placement`：目前支援 `feed`、`hero`、`detail`。
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

### 全站圖片規格與廣告圖片上傳

Storage buckets：

- `foodie-post-images`：限時情報圖片，由登入使用者上傳。
- `sponsored-ad-images`：廣告圖片，由 admin 上傳。

Admin 廣告管理支援兩種圖片來源：

- 上傳本機圖片到 `sponsored-ad-images`。
- 手動輸入 `image_url`。

若同時選擇本機圖片並填寫 `image_url`，本機圖片會優先，上傳成功後會把 public URL 寫入 `sponsored_posts.image_url`。若兩者都沒有，前台會使用 `/placeholder-food.jpg` fallback。

廣告圖片上傳規格：

- 支援 JPG、PNG、WebP。
- 單檔最大 5MB。
- Storage path：`ads/{user.id}/{timestamp}-{random}.{ext}`。
- 僅 admin 可 upload / delete，權限由 Supabase Storage policy 與 `public.is_admin()` 保護。

建議尺寸：

- 限時情報圖片：1200 × 900，4:3。
- Hero Banner：1200 × 600，橫式圖片，2:1 或 16:9。
- Feed 廣告卡：1200 × 900，4:3。

圖片裁切工具：

- 發佈限時情報選擇本機圖片後，可先套用 4:3 裁切。
- Admin 廣告管理選擇本機圖片後，會依 placement 提供裁切比例：
  - `hero`：2:1
  - `feed`：4:3
  - `detail`：本階段先使用 4:3
- 裁切後會產生新的 File，再走既有 Storage upload function。
- 使用者也可以選擇「使用原圖」，保留原始圖片上傳。
- MVP 裁切工具使用原生 canvas，提供位置選擇與縮放，不支援自由拖曳。

前台 `PostCard`、`SponsoredCard`、`HeroBanner` 會以 `object-cover` 顯示圖片，容器比例不同時邊緣可能被裁切。請避免把重要文字、Logo 或優惠資訊貼近圖片邊緣。

本階段限制：

- 不做圖片壓縮。
- 不做旋轉或高階圖片編輯。
- Hero 輪播目前僅支援 sponsored hero（最多 3 則），不支援自然貼文輪播。
- 手機版裁切工具為基本可用。
- 廣告圖片 cleanup 採 best-effort：更新或刪除廣告時會嘗試清理符合安全條件的舊圖，但失敗不會 rollback 廣告資料操作。

Sponsored ad image cleanup：

- 更新廣告圖片時，若舊圖來自 `sponsored-ad-images` bucket 且 object path 以 `ads/` 開頭，會在 `sponsored_posts` 更新成功後嘗試刪除舊圖。
- 刪除廣告時，若該廣告圖片來自 `sponsored-ad-images` bucket 且 object path 以 `ads/` 開頭，會在 `sponsored_posts` 刪除成功後嘗試刪除圖片。
- 外部 `image_url` 不會刪除。
- `/placeholder-food.jpg` 或其他本機 placeholder 不會刪除。
- 非 `sponsored-ad-images` bucket 的圖片不會刪除。
- 非 `ads/` path 的 Storage object 不會刪除。
- Cleanup 失敗只會在 console 顯示 warning，不會阻擋廣告更新或刪除。
- 仍可能出現 orphan images；正式營運後建議補 scheduled cleanup、orphan scanner 或 Storage usage dashboard。

### 首頁 Hero Banner MVP

首頁會顯示 Hero Banner。顯示優先序：

1. 優先顯示 active `sponsored_posts` 中 `placement = 'hero'` 的廣告，最多取 3 則。
2. 若沒有可用 hero sponsored ad，fallback 到目前 active posts 中的熱門情報。
3. 若沒有 hero ad 且沒有 active post，不顯示 Hero Banner，首頁仍正常顯示。

Sponsored Hero：

- 清楚標示「贊助｜本週推薦」。
- 使用 `brand_name`、`title`、`description`、`image_url`、`target_url`。
- 多則 hero sponsored ads 會依 `priority desc`、`created_at desc` 排序，最多顯示 3 則。
- 每 5 秒自動切換一則。
- 使用者 hover 或 focus 在 Hero 區塊時會暫停自動輪播。
- 使用者可用上一張 / 下一張按鈕與圓點 indicator 手動切換。
- 每則 hero sponsored ad 在本次 mounted session 只記一次 impression。
- 曝光會寫入 `ad_impressions`，`placement = 'hero'`。
- 點擊 CTA 會寫入 `ad_clicks`，`placement = 'hero'`。
- 可從 Admin 廣告管理新增，將 `placement` 設為 `hero`。

Post Hero：

- 標示「熱門情報」，不可標示為贊助。
- 不記錄廣告 tracking。
- 點擊 Banner 或「查看情報」會開啟既有 DetailModal。
- 從目前篩選後的 active posts 挑選。
- 品質門檻：貼文必須未過期、符合目前 filter，且 `title`、`name`、`city`、`district`、`address` 都存在。
- 互動門檻：`comment_count >= 1` 或 `likes >= 5`。
- 排序依序為 `comment_count desc`、`likes desc`、`created_at desc`。
- 若小流量階段沒有符合門檻的 post，Post Hero 會不顯示，這是預期行為。

使用者行為：

- 使用者可手動關閉 Hero Banner。
- 關閉後會寫入 browser `sessionStorage`，本次 session 不再顯示 Sponsored Hero carousel、Post Hero 或 Hero loading skeleton。
- 點擊「重新顯示」後，會清除 session dismiss 狀態並恢復 Hero；如果有多則 sponsored hero，輪播會從第一則開始。
- 新的 browser session 也可再次顯示 Hero。

限制：

- 本階段只輪播 sponsored hero，不輪播自然貼文。
- 同時間只顯示一則 Hero 畫面。
- 不做 A/B test。
- 不做拖曳手勢。
- 不做複雜動畫套件。
- 不做進階熱門演算法權重。
- 不做 post detail route。

Hero 營運注意事項：

- Admin 廣告管理中 `placement = hero` 代表首頁橫幅 Banner。
- 同時有多則 active hero ads 時，依 `priority desc`、`created_at desc` 排序輪播，最多顯示 3 則。
- Hero 圖片建議使用橫幅比例，避免主視覺被裁切。
- `target_url` 可空；空值時 Sponsored Hero 不顯示 CTA。
- 若沒有可用 hero ad，系統會嘗試使用符合品質門檻的 Post Hero fallback。

Hero QA 建議：

1. 建立一筆 active `placement = hero` 的 sponsored post，確認首頁顯示 Sponsored Hero。
2. 確認 Sponsored Hero 標示「贊助｜本週推薦」。
3. 捲動或重新整理後確認 `ad_impressions.placement = 'hero'`。
4. 點擊 CTA 後確認 `ad_clicks.placement = 'hero'`。
5. 建立 2 至 3 筆 active `placement = hero` 的 sponsored posts，確認每 5 秒自動輪播。
6. 確認 hover / focus Hero 區塊時自動輪播暫停。
7. 確認上一張 / 下一張與圓點 indicator 可切換。
8. 停用所有 hero ads 後，確認 fallback 到符合門檻的 Post Hero。
9. 確認 Post Hero 標示「熱門情報」，且不寫入廣告 tracking。
10. 點擊 Post Hero 後確認開啟 DetailModal。
11. 點擊關閉後，確認本次 session 不再顯示 Hero 或 Hero skeleton；點擊重新顯示後 Hero 恢復。

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

防濫用 MVP：

- public insert 仍保留，因為匿名訪客也要能記錄曝光 / 點擊。
- `ad_id` 必須存在。
- `placement` 限制為 `feed` / `hero` / `detail`，目前前端使用 `feed` 與 `hero`；`detail` 版位為預留。
- `page_path` 最長 300 字元。
- `target_url` 最長 500 字元，且若有值必須以 `http://` 或 `https://` 開頭。
- `session_id` 最長 120 字元。
- 前端送出 tracking 前會截斷過長的 `page_path` / `target_url` / `session_id`，並限制 metadata 維持小型。

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

本階段仍不做付款、完整廣告後台、點擊防灌或正式報表。

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

目前成效查詢由 `get_sponsored_ad_stats()` RPC 在資料庫端聚合，不再由前端拉最近 5000 筆 raw `ad_impressions` / `ad_clicks` 後聚合。

Admin 成效數字採去重估算：

- impressions：以 `ad_id + session_id + created_at 日期` 去重。
- clicks：以 `ad_id + session_id + created_at 日期` 去重。
- `session_id is null` 的舊資料會 fallback 使用 row id，避免全部合併。
- CTR = 去重點擊 / 去重曝光 * 100。
- RPC 使用 `security definer`，會先檢查 `public.is_admin()`；非 admin 呼叫會被拒絕。

這不是正式 anti-fraud，也不代表精準商業結算數據。資料量更大後，建議改成 materialized view、日期區間查詢、pagination 或 analytics pipeline。

本階段限制：

- 不做圖表。
- 廣告成效面板不負責新增 / 編輯 / 刪除廣告；這些操作請使用「廣告管理」入口。
- 不做付款。
- 不做日期區間篩選。
- 不做匯出。
- 不做正式 anti-fraud。
- 不做 materialized view。
- 不做正式 BI 分析。
- 仍可被進階 bot 灌水。
- localStorage session 可被清除。
- click tracking 不保證 100% 成功。
- 未做 IP / user-agent / rate limit / CAPTCHA。

### Admin 廣告管理 MVP

`profiles.role = 'admin'` 的使用者登入後，Navbar 會顯示「廣告管理」入口。一般使用者不會看到此入口；新增、編輯、刪除仍由 `sponsored_posts` 的 admin RLS policy 保護。

廣告管理目前支援：

- 查看所有 `sponsored_posts`。
- 新增 sponsored post。
- 編輯 sponsored post。
- 啟用 / 停用 sponsored post。
- 刪除 sponsored post。

表單欄位：

- 基本資訊：`brand_name`、`title`、`description`
- 素材與連結：`image_url`、`target_url`
- 投放條件：`city`、`district`、`category`、`placement`
- 投放設定：`starts_at`、`ends_at`、`priority`、`is_active`

表單驗證：

- `brand_name` 必填。
- `title` 必填。
- `ends_at` 必填。
- `ends_at` 必須晚於 `starts_at`。
- `image_url` 若有值，必須是有效的 `http://` 或 `https://` URL。
- `target_url` 若有值，必須是有效的 `http://` 或 `https://` URL。
- `priority` 必須是數字。
- `placement` 空白時預設使用 `feed`；目前支援 `feed`、`hero`、`detail`，其中 `hero` 會顯示在首頁 Hero Banner。

素材與時間：

- 可上傳本機圖片到 Supabase Storage，也可手動輸入 `image_url`。
- 若同時選擇本機圖片並填寫 `image_url`，本機圖片優先。
- `image_url` 可空白，前台 SponsoredCard 會使用 `/placeholder-food.jpg`。
- 廣告管理表單會提供 image preview；若圖片無法預覽，前台仍會使用 fallback。
- `starts_at` / `ends_at` 以目前瀏覽器時區輸入，儲存後由 Supabase 轉為時間戳。

狀態判斷：

- `is_active = false`：停用
- `now < starts_at`：尚未開始
- `now > ends_at`：已結束
- 其他：投放中

列表功能：

- 可搜尋 `brand_name` / `title` / `city` / `district` / `category`。
- 可依狀態篩選：全部、投放中、尚未開始、已結束、停用。
- 會顯示 image_url / target_url 是否存在。

刪除 `sponsored_posts` 時，對應的 `ad_impressions` 與 `ad_clicks` 會因 foreign key `on delete cascade` 一併刪除。若該廣告圖片來自 `sponsored-ad-images` bucket 的 `ads/` path，系統也會在刪除 DB row 成功後嘗試清理 Storage object；外部 URL、placeholder、其他 bucket 或非 `ads/` path 一律不刪。Storage cleanup 失敗只會 `console.warn`，不會 rollback 廣告刪除。

本階段仍不做付款、報表匯出、點擊 / 曝光去重、廣告審核流程或操作紀錄。正式營運前建議補上廣告審核、操作 audit log、素材管理、付款狀態與投放預算控管。

### Supabase Storage

圖片上傳使用 buckets：

```txt
foodie-post-images
sponsored-ad-images
```

`foodie-post-images` policy 設定：

- public bucket
- public read
- authenticated upload to `posts/{auth.uid()}/...`
- authenticated delete only from `posts/{auth.uid()}/...`

`sponsored-ad-images` policy 設定：

- public bucket
- public read
- authenticated admin upload to `ads/{auth.uid()}/...`
- authenticated admin delete
- 一般 authenticated user 不可 upload / delete

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

```txt
supabase/migrations/20260429050000_create_sponsored_ad_images_bucket.sql
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
12. 對該情報按讚，確認 likes 更新，且 `post_likes` 寫入資料。
13. 同一匿名 session 對同一 post 再按一次，確認不再 +1，並顯示「你已經按過讚」。
14. 同一匿名 session 對不同 post 按讚，確認可成功。
15. 登入後對同一 post 重複按讚，確認第二次不再 +1。
16. 開啟詳情 modal。
17. 新增留言，確認留言列表立即更新，且 `comments.user_id = auth.uid()`。
18. 回到首頁，確認 PostCard 留言數 +1。
19. 重新整理頁面，確認留言數仍依 comments table 正確計算。
20. 點擊「我的投稿」，確認只看到自己的 posts。
21. 建立或手動修改一篇自己的過期 post，確認首頁不顯示該過期資料。
22. 點擊「我的投稿」，確認仍可看到自己的過期 post。
23. 使用另一個帳號登入，確認「我的投稿」不顯示第一個帳號建立的 post，也看不到第一個帳號的過期 post。
24. 一般使用者確認看不到「Admin 管理」入口。
25. 使用另一個帳號確認不能刪除第一個帳號建立的 post。
26. 確認另一個帳號不能 delete `posts/{第一個帳號 id}/...` 的 Storage object。
27. 手動將測試帳號設為 admin，重新登入後確認 Navbar 顯示「Admin 管理」。
28. 點擊「Admin 管理」，確認可看到所有 posts，包含過期 posts 與 owner metadata。
29. Admin 測試刪除任一 post，確認 DB delete 成功；若 Storage cleanup 被 policy 擋下，console 會顯示 warning。
30. 登出後確認不能再發文、留言、上傳圖片。
31. 回到原作者帳號，開啟「我的投稿」，刪除自己新增的情報。
32. 若該情報使用上傳圖片，確認 Storage 中對應 `posts/{auth.uid()}/...` object 已被清理。
33. 在 `sponsored_posts` 新增 active feed 廣告，確認首頁每 6 張自然情報後插入 1 張標示「贊助」的廣告卡。
34. 設定廣告 `city` / `district` / `category` 後，確認 Feed 篩選條件符合時才顯示。
35. 設定 `target_url` 後，確認「查看活動」會以新分頁開啟。
36. 廣告卡進入畫面後，確認 `ad_impressions` 新增資料。
37. 點擊「查看活動」後，確認 `ad_clicks` 新增資料。
38. 確認一般 public user 無法讀取 `ad_impressions` / `ad_clicks`，admin 才能查看。
39. 使用一般帳號登入，確認 Navbar 不顯示「廣告成效」。
40. 使用 admin 帳號登入，確認 Navbar 顯示「廣告成效」。
41. 點擊「廣告成效」，確認可看到 sponsored posts 的曝光、點擊與 CTR。
42. 若沒有 sponsored posts，確認顯示「目前沒有廣告資料」。
43. 使用一般帳號登入，確認 Navbar 不顯示「廣告管理」。
44. 使用 admin 帳號登入，確認 Navbar 顯示「廣告管理」。
45. 點擊「廣告管理」，新增一筆 sponsored post，確認首頁可顯示 active ad。
46. 編輯 sponsored post，確認列表資料更新。
47. 停用 sponsored post，確認首頁不再顯示該 ad。
48. 重新啟用 sponsored post，確認首頁可再次顯示。
49. 刪除 sponsored post，確認該筆廣告移除，相關 `ad_impressions` / `ad_clicks` 也因 cascade 移除。
50. 在廣告管理輸入錯誤 `target_url`，確認無法送出並顯示 inline error。
51. 在廣告管理輸入錯誤 `image_url`，確認顯示 URL 錯誤；若 URL 格式正確但圖片載入失敗，確認顯示預覽失敗提示。
52. 設定 `starts_at` 晚於 `ends_at`，確認無法送出。
53. 使用搜尋與狀態篩選，確認列表可依 brand / title / city / district / category 與投放狀態篩選。
54. 確認 SponsoredCard 圖片載入失敗時會 fallback 到 `/placeholder-food.jpg`，且曝光 / 點擊 tracking 仍可運作。
55. 確認過長 `page_path` / `target_url` / `session_id` 會被前端截斷，資料庫 constraint 會拒絕不符合格式的 tracking payload。
56. 確認「廣告成效」顯示的是去重曝光、去重點擊與去重 CTR。

## 驗證指令

```bash
npm run typecheck
npm run build
```
