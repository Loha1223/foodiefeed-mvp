# FoodieFeed Manual QA Runbook

這份 runbook 用於 soft launch 前與 production deploy 後的手動驗收。每個 case 都請填寫記錄，方便追蹤問題與回歸測試。

## 0. 測試記錄

- 測試日期：
- 測試人：
- Production URL：
- Vercel Deployment URL：
- Git commit SHA：
- Supabase Project：
- 測試裝置 / Browser：
- 一般使用者 email：
- Admin 使用者 email：

## 0.1 Beta freeze / Release 前置（Migration / RPC / 權限）檢查

### Case 0.1.1 Final migration 與 routines 存在

目標：確認 production Supabase 已套用最後 migration，且關鍵 routines 存在。

預期結果：

- 最後 migration 應為 `20260429051000_create_sponsored_ad_stats_rpc.sql`。
- routines `is_admin`、`increment_post_likes`、`get_sponsored_ad_stats` 都存在。

Read-only check（SQL）：

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'is_admin',
    'increment_post_likes',
    'get_sponsored_ad_stats'
  )
order by routine_name;
```

記錄：

- 結果：通過 / 失敗
- 實際最後 migration：
- 備註：

### Case 0.1.2 廣告成效資料來源與權限（get_sponsored_ad_stats）

目標：確認 Admin 廣告成效由 `get_sponsored_ad_stats` RPC 取得，且一般使用者不可讀取成效資料。

預期結果：

- Admin 登入後可在「廣告成效」看到資料（資料來源為 `get_sponsored_ad_stats`）。
- 一般使用者看不到「廣告成效」入口。
- 即使繞過前端，一般使用者也不可讀取 ad stats（應被 RLS / routine 權限拒絕）。

記錄：

- 結果：通過 / 失敗
- Admin 測試帳號：
- 一般使用者測試帳號：
- 備註：

## 1. 30 分鐘 Soft Launch 必跑 QA 清單

這份清單是最小必跑版本，目標是在 30 分鐘內確認主要風險沒有阻塞上線。

- [ ] GitHub Actions `FoodieFeed CI` 通過。
- [ ] Vercel production deployment 對應正確 commit。
- [ ] 未登入可開首頁並看到未過期情報。
- [ ] 未登入發文會顯示請先登入。
- [ ] Email magic link 登入成功。
- [ ] 登入後可新增一筆測試情報。
- [ ] 本機圖片可上傳，情報圖片可顯示。
- [ ] 可在 DetailModal 新增留言，留言數即時 +1。
- [ ] 同一使用者重複按同一篇讚會顯示已按過讚，數字不重複增加。
- [ ] 「我的投稿」只顯示自己的投稿，包含剛新增的測試情報。
- [ ] Admin 可看到 `Admin 管理`、`廣告成效`、`廣告管理`。
- [ ] Admin 可刪除測試情報。
- [ ] SponsoredCard 有清楚「贊助」標示。
- [ ] SponsoredCard 點擊後可開新分頁，且不阻擋前台互動。
- [ ] `/robots.txt` 與 `/sitemap.xml` 可開啟。
- [ ] Browser console 沒有阻塞功能的錯誤。
- [ ] 測試資料已清理或標記。

## 2. 未登入使用者測試

### Case 2.1 瀏覽首頁

前置條件：

- 使用無痕視窗或已登出的 browser。
- Production Supabase 至少有一筆未過期 post，或首頁可使用既有資料。

操作步驟：

1. 開啟 production URL。
2. 觀察首頁瀑布流。
3. 點開一張情報卡。
4. 查看留言區。

預期結果：

- 首頁可正常載入。
- 未登入可瀏覽未過期 posts。
- 可開啟 DetailModal。
- 可查看留言。
- 不會看到 admin-only 入口。

記錄：

- 結果：通過 / 失敗
- 異常截圖或 console error：
- 備註：

### Case 2.2 未登入限制

前置條件：

- 使用未登入狀態。

操作步驟：

1. 點擊「發佈情報」。
2. 填寫必要欄位並送出。
3. 嘗試選擇本機圖片後送出。
4. 開啟任一 DetailModal，嘗試送出留言。
5. 點擊「我的投稿」。

預期結果：

- 發文失敗並顯示「請先登入後再發佈情報」或同義訊息。
- 圖片上傳失敗並顯示「請先登入後再上傳圖片」或同義訊息。
- 留言失敗並顯示「請先登入後再留言」或同義訊息。
- 「我的投稿」不會顯示全部 posts，只會提示先登入。
- 頁面不 crash。

記錄：

- 結果：通過 / 失敗
- 錯誤訊息是否清楚：
- 備註：

## 3. 一般登入使用者測試

### Case 3.1 Magic link 登入 / 登出

前置條件：

- Supabase Auth Email provider 已啟用。
- Redirect URL 已包含 production URL。

操作步驟：

1. 在 Navbar 輸入一般使用者 email。
2. 點擊寄送登入連結。
3. 到信箱點擊 magic link。
4. 回到網站確認 Navbar 狀態。
5. 點擊登出。

預期結果：

- 成功收到登入信。
- 點擊 magic link 後回到 production URL。
- Navbar 顯示使用者 email。
- 登出後恢復未登入狀態。

記錄：

- 結果：通過 / 失敗
- 收信時間：
- Redirect URL：
- 備註：

### Case 3.2 一般使用者看不到 Admin 入口

前置條件：

- 已登入一般使用者。
- 該使用者 `profiles.role` 不是 `admin`。

操作步驟：

1. 觀察 Navbar。
2. 嘗試尋找 `Admin 管理`、`廣告成效`、`廣告管理`。

預期結果：

- 一般使用者只看到一般功能與「我的投稿」。
- 不顯示 admin-only 入口。

記錄：

- 結果：通過 / 失敗
- 備註：

## 4. Admin 使用者測試

### Case 4.1 Admin 入口顯示

前置條件：

- 已登入 admin 使用者。
- `public.profiles.role = 'admin'`。

Read-only check:

```sql
select id, role, created_at
from public.profiles
where role = 'admin'
order by created_at desc;
```

操作步驟：

1. 開啟 production URL。
2. 觀察 Navbar。
3. 依序點擊 `Admin 管理`、`廣告成效`、`廣告管理`。

預期結果：

- Admin 可看到三個入口。
- 每個 panel 可開啟。
- 開啟其中一個 panel 時，不會造成主要 feed crash。

記錄：

- 結果：通過 / 失敗
- 備註：

## 5. 發文流程測試

### Case 5.1 使用圖片 URL 發文

前置條件：

- 已登入一般使用者或 admin。
- 準備一個可公開讀取的 `https://` 圖片 URL。

操作步驟：

1. 點擊「發佈情報」。
2. 填寫店家名稱、吸睛標題、縣市、行政區、地址、類別。
3. 填入圖片 URL。
4. 送出。
5. 在首頁確認新情報。

預期結果：

- 發文成功。
- 新情報出現在首頁最前方。
- 圖片正常顯示，或圖片失敗時有 fallback。
- `posts.user_id` 寫入目前登入者。

Read-only check:

```sql
select id, title, user_id, img, created_at
from public.posts
order by created_at desc
limit 5;
```

記錄：

- 結果：通過 / 失敗
- 測試 post id：
- 備註：

### Case 5.2 必填欄位驗證

前置條件：

- 已登入使用者。

操作步驟：

1. 開啟發文 modal。
2. 留空任一必填欄位。
3. 點擊送出。

預期結果：

- Modal 內顯示錯誤文字。
- 不使用 alert。
- 不會建立空資料。

記錄：

- 結果：通過 / 失敗
- 備註：

## 6. 圖片上傳測試

### Case 6.1 本機圖片上傳

前置條件：

- 已登入使用者。
- 準備小於 5MB 的 JPEG / PNG / WebP 圖片。

操作步驟：

1. 開啟發文 modal。
2. 選擇本機圖片。
3. 確認預覽顯示。
4. 填寫必要欄位並送出。
5. 重新整理頁面。

預期結果：

- 圖片上傳成功。
- `post.img` 是 Supabase Storage public URL。
- 圖片路徑包含 `posts/{user.id}/...`。
- 重新整理後圖片仍可顯示。

Read-only check:

```sql
select id, title, img
from public.posts
where img like '%/storage/v1/object/public/foodie-post-images/posts/%'
order by created_at desc
limit 5;
```

記錄：

- 結果：通過 / 失敗
- Storage object path：
- 備註：

### Case 6.2 檔案格式 / 大小限制

前置條件：

- 已登入使用者。
- 準備非圖片檔或超過 5MB 的圖片。

操作步驟：

1. 開啟發文 modal。
2. 選擇不支援的檔案。
3. 選擇超過 5MB 的圖片。

預期結果：

- 顯示清楚錯誤。
- 不會上傳到 Storage。
- 不會造成頁面 crash。

記錄：

- 結果：通過 / 失敗
- 備註：

## 7. 留言流程測試

### Case 7.1 新增留言

前置條件：

- 已登入使用者。
- 存在至少一篇可開啟的 post。

操作步驟：

1. 開啟 DetailModal。
2. 輸入留言。
3. 送出留言。
4. 觀察留言列表與卡片留言數。

預期結果：

- 留言即時出現在列表。
- `comments.user_id` 寫入目前使用者。
- `comment_count` 即時 +1。
- 重新整理後留言數仍正確。

Read-only check:

```sql
select id, post_id, user_id, user_name, content, created_at
from public.comments
order by created_at desc
limit 10;
```

記錄：

- 結果：通過 / 失敗
- 測試 comment id：
- 備註：

### Case 7.2 空留言驗證

前置條件：

- 已登入使用者。

操作步驟：

1. 開啟 DetailModal。
2. 留言欄只輸入空白。
3. 點擊送出。

預期結果：

- Modal 內顯示錯誤。
- 不會新增空留言。

記錄：

- 結果：通過 / 失敗
- 備註：

## 8. 按讚防重複測試

### Case 8.1 匿名 session 去重

前置條件：

- 使用未登入狀態。
- Browser localStorage 可用。

操作步驟：

1. 對同一篇 post 按讚一次。
2. 再按同一篇 post 第二次。
3. 對另一篇 post 按讚一次。

預期結果：

- 第一次按讚成功，likes +1。
- 第二次同 post 顯示「你已經按過讚」，likes rollback。
- 同一匿名 session 可對不同 post 按讚。

Read-only check:

```sql
select post_id, user_id, session_id, count(*) as count
from public.post_likes
group by post_id, user_id, session_id
order by count desc, post_id desc
limit 20;
```

記錄：

- 結果：通過 / 失敗
- 測試 post id：
- 備註：

### Case 8.2 登入 user 去重

前置條件：

- 已登入使用者。

操作步驟：

1. 對同一篇 post 按讚一次。
2. 再按同一篇 post 第二次。
3. 登出後用不同 browser session 測試匿名按讚。

預期結果：

- 登入 user 對同一 post 只能成功一次。
- 重複按讚不會增加 `posts.likes`。
- 登入 user 與匿名 session 去重互不干擾。

記錄：

- 結果：通過 / 失敗
- 備註：

## 9. 我的投稿測試

### Case 9.1 只顯示自己的投稿

前置條件：

- 已登入一般使用者。
- 該使用者至少有一篇投稿。
- 系統中存在其他使用者投稿。

操作步驟：

1. 點擊「我的投稿」。
2. 檢查列表內容。
3. 檢查刪除按鈕。

預期結果：

- 只列出目前使用者自己的 posts。
- 包含自己的已過期 posts。
- 看不到別人的 posts 刪除操作。

記錄：

- 結果：通過 / 失敗
- 備註：

## 10. Admin Posts 管理測試

### Case 10.1 Admin 查看與刪除 posts

前置條件：

- 已登入 admin。
- 有一筆可刪除的測試 post。

操作步驟：

1. 點擊 `Admin 管理`。
2. 確認可看到所有 posts，包含已過期。
3. 刪除測試 post。
4. 回到首頁與資料庫確認。

預期結果：

- Admin 可看到所有 posts。
- 刪除成功後 feed / my / admin lists 都同步移除。
- comments 透過 cascade 刪除。
- 若圖片是 FoodieFeed Storage 圖片，系統會嘗試 cleanup。

Read-only check:

```sql
select id, title, user_id, expiry, created_at
from public.posts
order by created_at desc
limit 20;
```

記錄：

- 結果：通過 / 失敗
- 刪除 post id：
- 備註：

## 11. Sponsored Ads 顯示測試

### Case 11.1 Feed 插入廣告卡

前置條件：

- `sponsored_posts` 至少有一筆 active feed ad。
- Feed 至少有 6 篇自然情報時較容易觀察插入位置。

操作步驟：

1. 開啟首頁。
2. 向下捲動 feed。
3. 找到 SponsoredCard。

預期結果：

- 廣告卡清楚標示「贊助」。
- 廣告樣式與自然情報有區隔。
- 每批 feed 中同一廣告不會過度重複顯示。
- 無自然情報時，不會只顯示廣告。

Read-only check:

```sql
select id, brand_name, title, placement, starts_at, ends_at, is_active, priority
from public.sponsored_posts
order by created_at desc
limit 20;
```

記錄：

- 結果：通過 / 失敗
- 測試 ad id：
- 備註：

### Case 11.2 Hero Carousel 顯示矩陣（0 / 1 / 2-3 / >3）

前置條件：

- 已有 admin 帳號可調整 `placement = hero` 的廣告資料。
- 可準備至少 4 筆 active hero 廣告（用於 >3 驗證）。

操作步驟：

1. 設定 0 筆 active hero ad，重新整理首頁。
2. 設定 1 筆 active hero ad，重新整理首頁。
3. 設定 2~3 筆 active hero ad，重新整理首頁並觀察輪播。
4. 設定超過 3 筆 active hero ad，重新整理首頁並觀察實際可見張數。
5. 調整不同 priority 與 created_at，確認顯示順序。

預期結果：

- 0 筆：fallback 到 Post Hero（若有符合條件貼文），否則不顯示 Hero。
- 1 筆：顯示單張 Hero，無頁數切換需求。
- 2~3 筆：可輪播，且上一張/下一張/indicator 正常。
- >3 筆：只取排序後前 3 筆。
- 排序規則符合 `priority desc, created_at desc`。

記錄：

- 結果：通過 / 失敗
- 各情境 ad id：
- 備註：

### Case 11.3 Hero Carousel 互動（hover/focus pause、dismiss/restore、active CTA）

前置條件：

- 至少 2 筆 active hero ad。

操作步驟：

1. 開啟首頁觀察 Hero 每 5 秒自動切換。
2. 將滑鼠 hover 在 Hero 區塊，觀察是否暫停。
3. 用鍵盤 focus 進入 Hero 互動元素，觀察是否暫停。
4. 點上一張/下一張與 indicator，確認切換。
5. 點擊關閉（dismiss）後，確認 Hero 收合列出現。
6. 點擊「重新顯示」，確認 Hero 回復與輪播恢復。
7. 在不同 active ad 上點 CTA，確認跳轉目標正確。

預期結果：

- hover/focus 可暫停自動輪播。
- 手動切換控制正常。
- dismiss 後本次 session 不再顯示 Hero。
- restore 後 Hero 重新顯示並恢復輪播。
- CTA 永遠對應目前 active ad 的 `target_url`。

記錄：

- 結果：通過 / 失敗
- 異常步驟：
- 備註：

## 12. 廣告曝光 / 點擊 Tracking 測試

### Case 12.1 Impression / Click 寫入

前置條件：

- 首頁有 active SponsoredCard。
- 使用可以開 devtools 的 browser。

操作步驟：

1. 開啟首頁。
2. 捲動到 SponsoredCard，使它至少約一半進入畫面。
3. 等待 2 秒。
4. 點擊「查看活動」。
5. 回 Supabase 檢查 tracking tables。

預期結果：

- `ad_impressions` 新增資料。
- `ad_clicks` 新增資料。
- `session_id` 長度不超過 120。
- `placement` 是 `feed`。
- 點擊可開新分頁。
- tracking 失敗不會阻擋跳轉。

Read-only check:

```sql
select ad_id, placement, page_path, user_id, session_id, created_at
from public.ad_impressions
order by created_at desc
limit 20;
```

Read-only check:

```sql
select ad_id, placement, page_path, target_url, user_id, session_id, created_at
from public.ad_clicks
order by created_at desc
limit 20;
```

記錄：

- 結果：通過 / 失敗
- ad id：
- 備註：

### Case 12.2 Hero placement Tracking

前置條件：

- 至少 2 筆 active hero ad。

操作步驟：

1. 開啟首頁，等 Hero 進入可視範圍。
2. 等待輪播切換到下一張，確認每張都曾可視。
3. 點擊目前 active Hero 的 CTA。
4. 到 Supabase 查詢 `ad_impressions` / `ad_clicks`。

預期結果：

- Hero impression 寫入 `ad_impressions`。
- Hero click 寫入 `ad_clicks`。
- `placement = 'hero'`。
- click 的 `target_url` 對應當下 active ad。
- tracking 失敗不阻擋 UI。

Read-only check:

```sql
select ad_id, placement, page_path, session_id, created_at
from public.ad_impressions
where placement = 'hero'
order by created_at desc
limit 30;
```

Read-only check:

```sql
select ad_id, placement, target_url, page_path, session_id, created_at
from public.ad_clicks
where placement = 'hero'
order by created_at desc
limit 30;
```

記錄：

- 結果：通過 / 失敗
- ad id：
- 備註：

## 13. 廣告成效測試

### Case 13.1 Admin 查看去重成效

前置條件：

- 已登入 admin。
- 至少有一筆 sponsored post。
- 已產生部分 impressions / clicks。

操作步驟：

1. 點擊 `廣告成效`。
2. 查看成效列表。
3. 比對曝光、點擊、CTR。

預期結果：

- 一般 user 看不到入口。
- Admin 可看到成效列表。
- 欄位顯示去重曝光、去重點擊、去重 CTR。
- Panel 上方有 MVP 去重統計提示。
- 無資料時顯示 empty state。
- [ ] 成效資料由 `get_sponsored_ad_stats` RPC 取得（不是由前端拉 raw `ad_impressions` / `ad_clicks` 自行聚合）。
- [ ] 一般使用者不可讀取 ad stats（沒有入口，且繞過前端呼叫也應被拒絕）。

記錄：

- 結果：通過 / 失敗
- 備註：

## 14. 廣告 CRUD 測試

### Case 14.1 新增 / 編輯 / 啟停 / 刪除廣告

前置條件：

- 已登入 admin。
- 準備測試用 `https://` image URL 與 target URL。

操作步驟：

1. 點擊 `廣告管理`。
2. 新增一筆測試廣告。
3. 編輯品牌、標題、priority 或投放時間。
4. 停用廣告。
5. 再啟用廣告。
6. 刪除測試廣告。

預期結果：

- 新增成功後列表即時更新。
- 編輯成功後列表顯示新內容。
- 停用後前台不再顯示該廣告。
- 啟用且投放期間有效時前台可顯示。
- 刪除前有確認訊息。
- 刪除 sponsored post 後，相關 impressions / clicks 透過 cascade 移除。
- [ ] 更新廣告圖片後：若舊圖片來自 `sponsored-ad-images`（且符合系統安全條件），系統會 **嘗試** 清理舊 object（best-effort）。
- [ ] 刪除廣告後：若圖片來自 `sponsored-ad-images`（且符合系統安全條件），系統會 **嘗試** 清理該 object（best-effort）。
- [ ] 外部 `image_url`（非 `sponsored-ad-images`）不應被刪除。
- [ ] cleanup 失敗不阻斷廣告 update/delete：廣告資料仍應成功更新/刪除（可能只在 console/log 留下 warning）。

Write test，僅在測試資料上執行：

```sql
select id, brand_name, title, is_active, starts_at, ends_at
from public.sponsored_posts
where title ilike '%測試%'
order by created_at desc;
```

記錄：

- 結果：通過 / 失敗
- 測試 ad id：
- 舊 sponsored-ad-images object path（若有）：
- 備註：

### Case 14.2 Admin 廣告圖片上傳與裁切

前置條件：

- 已登入 admin。
- 準備 JPG / PNG / WebP 測試圖。

操作步驟：

1. 在廣告管理選擇 `placement = hero`，上傳本機圖片並裁切 2:1。
2. 送出後確認 `image_url` 指向 `sponsored-ad-images` public URL。
3. 將 `placement` 改為 `feed`，上傳本機圖片並裁切 4:3。
4. 測試「使用原圖」。
5. 測試「取消裁切」不應改動既有選圖。
6. 使用一般 user 帳號嘗試上傳廣告圖片。

預期結果：

- Hero 廣告可套用 2:1 裁切，Feed 可套用 4:3 裁切。
- 使用原圖與取消裁切行為正確。
- `image_url` 為 `sponsored-ad-images` 的 public URL。
- 一般 user 無法上傳廣告圖片（被權限拒絕）。

Read-only check:

```sql
select id, title, placement, image_url, created_at
from public.sponsored_posts
order by created_at desc
limit 20;
```

記錄：

- 結果：通過 / 失敗
- 測試 ad id：
- 備註：

### Case 14.3 共用圖片裁切工具（Post / Admin）

前置條件：

- 一般 user 與 admin 帳號皆可登入。

操作步驟：

1. 一般 user 在 PostModal 上傳圖片，確認預設 4:3 裁切。
2. admin 在廣告管理 `placement = hero` 上傳圖片，確認 2:1。
3. admin 在廣告管理 `placement = feed` 上傳圖片，確認 4:3。
4. 各情境測試 zoom slider 與位置選擇。
5. 測試「使用原圖」與「取消裁切」。

預期結果：

- PostModal 固定 4:3。
- Admin hero 為 2:1。
- Admin feed 為 4:3。
- 使用原圖 / 取消裁切行為一致且不 crash。

記錄：

- 結果：通過 / 失敗
- 裝置 / browser：
- 備註：

## 15. 手機版測試

### Case 15.1 手機 viewport 核心流程

前置條件：

- 使用真機或 browser responsive mode。
- 建議測試寬度：375px、390px、430px。

操作步驟：

1. 開啟首頁。
2. 測試 Navbar、AuthButton、FilterBar。
3. 開啟 PostModal、DetailModal。
4. 開啟我的投稿與 admin panels。
5. 捲動 SponsoredCard。

預期結果：

- 文字不互相重疊。
- Modal 可滾動且可關閉。
- 按鈕可點擊。
- 卡片圖片不破版。
- Admin table 或 cards 可讀。

記錄：

- 結果：通過 / 失敗
- 裝置 / viewport：
- 截圖：
- 備註：

## 16. RLS Negative Test

RLS negative test 請優先用前端或 anon key client 測試。Supabase SQL Editor 通常使用高權限連線，不適合直接模擬匿名使用者的 RLS 結果。

### Case 16.1 未登入不可寫 posts / comments / Storage

前置條件：

- 未登入狀態。

操作步驟：

1. 嘗試發文。
2. 嘗試留言。
3. 嘗試上傳圖片。

預期結果：

- 三者都被前端提示擋下。
- 若繞過前端使用 anon key，RLS / Storage policy 也應拒絕。

Read-only check:

```sql
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
```

記錄：

- 結果：通過 / 失敗
- 備註：

### Case 16.2 一般使用者不可刪除他人 post

前置條件：

- User A 與 User B 各有登入帳號。
- User B 有一篇測試 post。

操作步驟：

1. 使用 User A 登入。
2. 確認「我的投稿」不顯示 User B 的 post。
3. 若用前端正常 UI，User A 不應看到刪除入口。
4. 如需進一步驗證，使用 anon/auth client 嘗試刪除 User B post。

預期結果：

- User A 無法從 UI 刪除 User B post。
- 直接呼叫 delete 也應被 RLS 拒絕。
- UI 若有 optimistic delete，失敗後會 rollback。

記錄：

- 結果：通過 / 失敗
- 測試 post id：
- 備註：

## 17. Production Smoke Test

### Case 17.1 Deploy 後快速驗證

前置條件：

- Production deployment 已完成。
- GitHub Actions 通過。

操作步驟：

1. 開啟 production URL。
2. 檢查首頁 feed。
3. 登入一般使用者。
4. 新增測試 post。
5. 新增留言。
6. 按讚兩次，確認第二次被擋。
7. 登入 admin，檢查 Admin 管理、廣告成效、廣告管理。
8. 刪除測試資料。
9. 開啟 `/robots.txt` 與 `/sitemap.xml`。

預期結果：

- 核心流程都可用。
- 測試資料可清理。
- 沒有需要 rollback 的 blocking issue。

記錄：

- 結果：通過 / 失敗
- Blocking issues：
- Non-blocking issues：
- 是否允許 soft launch：是 / 否
