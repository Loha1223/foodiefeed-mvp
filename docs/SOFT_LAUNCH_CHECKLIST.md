# FoodieFeed Soft Launch Checklist

這份 checklist 用於小流量 soft launch 前的最後檢查。請逐項勾選，並記錄實際環境與測試結果。

## 0. 基本資訊

- [ ] 測試日期：
- [ ] 測試人：
- [ ] Production URL：
- [ ] Vercel Project：
- [ ] Supabase Project：
- [ ] Git commit SHA：
- [ ] Vercel Deployment URL：
- [ ] GitHub Actions run URL：

## 1. Supabase Migration 檢查

- [ ] 已在 production Supabase 執行所有 migrations。
- [ ] 最後一個已執行 migration 是 `20260429051000_create_sponsored_ad_stats_rpc.sql`。
- [ ] 已執行 `20260429050000_create_sponsored_ad_images_bucket.sql`。
- [ ] 已執行 `20260429051000_create_sponsored_ad_stats_rpc.sql`。
- [ ] 沒有在 production 手動刪除或改寫 migration 內容。
- [ ] `posts` table 存在。
- [ ] `comments` table 存在。
- [ ] `profiles` table 存在。
- [ ] `sponsored_posts` table 存在。
- [ ] `ad_impressions` table 存在。
- [ ] `ad_clicks` table 存在。
- [ ] `post_likes` table 存在。

Read-only check:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'posts',
    'comments',
    'profiles',
    'sponsored_posts',
    'ad_impressions',
    'ad_clicks',
    'post_likes'
  )
order by table_name;
```

Read-only check:

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

## 2. Supabase RLS / Policy 檢查

- [ ] `posts` RLS enabled。
- [ ] `comments` RLS enabled。
- [ ] `profiles` RLS enabled。
- [ ] `sponsored_posts` RLS enabled。
- [ ] `ad_impressions` RLS enabled。
- [ ] `ad_clicks` RLS enabled。
- [ ] `post_likes` RLS enabled。
- [ ] 未登入使用者只能讀取未過期 posts。
- [ ] 未登入使用者不可新增 / 修改 / 刪除 posts。
- [ ] 未登入使用者不可新增 comments。
- [ ] 登入使用者只能新增自己的 posts / comments。
- [ ] 一般使用者只能刪除自己的 posts。
- [ ] Admin 可管理所有 posts。
- [ ] Admin 可管理 sponsored posts。
- [ ] 一般使用者不可讀取 `ad_impressions` / `ad_clicks` / `post_likes` raw data。

Read-only check:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'posts',
    'comments',
    'profiles',
    'sponsored_posts',
    'ad_impressions',
    'ad_clicks',
    'post_likes'
  )
order by tablename;
```

Read-only check:

```sql
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

## 3. Storage Bucket / Policy 檢查

- [ ] Storage bucket `foodie-post-images` 存在。
- [ ] Bucket 為 public read。
- [ ] 匿名使用者不可 upload。
- [ ] 匿名使用者不可 delete。
- [ ] 登入使用者可 upload 到 `posts/{auth.uid()}/...`。
- [ ] 登入使用者只能 delete 自己路徑下的圖片。
- [ ] 刪除 post 後，若圖片是 FoodieFeed Storage URL，會嘗試 cleanup。
- [ ] 外部圖片 URL 與 `/placeholder-food.jpg` 不會被 Storage cleanup 誤刪。
- [ ] Storage bucket `sponsored-ad-images` 存在。
- [ ] `sponsored-ad-images` 為 public read。
- [ ] Admin 可 upload 到 `ads/{auth.uid()}/...`。
- [ ] Admin 可 delete `sponsored-ad-images` 物件。
- [ ] 一般使用者不可 upload/delete `sponsored-ad-images`。

Read-only check:

```sql
select id, name, public
from storage.buckets
where id in ('foodie-post-images', 'sponsored-ad-images')
order by id;
```

Read-only check:

```sql
select policyname, cmd, roles
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;
```

## 3.1 Hero Carousel / Dismiss / Restore / Tracking 檢查

- [ ] 0 則 hero ad：會 fallback 到 Post Hero（若有符合條件貼文），否則不顯示 Hero。
- [ ] 1 則 hero ad：顯示單張 sponsored Hero，不顯示切換控制。
- [ ] 2-3 則 hero ad：可輪播、可上一張/下一張、可用 indicator 切換。
- [ ] 超過 3 則 hero ad：只取排序後前 3 則。
- [ ] hero ad 排序符合 `priority desc, created_at desc`。
- [ ] Hero dismiss 後本次 session 不再顯示 Hero。
- [ ] Hero restore 後可重新顯示 Hero 並恢復輪播。
- [ ] Hero impression 寫入 `ad_impressions` 且 `placement = 'hero'`。
- [ ] Hero CTA click 寫入 `ad_clicks` 且 `placement = 'hero'`。
- [ ] tracking 寫入失敗不阻擋 Hero 顯示與 CTA 跳轉。

## 3.2 圖片裁切工具（Image Cropper）檢查

- [ ] PostModal 限時情報：選擇本機圖片後可套用 **4:3** 裁切。
- [ ] Admin 廣告管理（Hero 版位）：選擇 `placement = hero` 並上傳本機圖片後可套用 **2:1** 裁切。
- [ ] Admin 廣告管理（Feed 版位）：選擇 `placement = feed` 並上傳本機圖片後可套用 **4:3** 裁切。
- [ ] 「使用原圖」流程正常：不套用裁切仍可送出、圖片可顯示。
- [ ] 「取消裁切」流程正常：取消後不應改動既有選圖，且不應造成 UI crash。
- [ ] 套用裁切後可正常上傳並顯示：送出後前台圖片可載入（含重新整理後仍可顯示）。

## 4. Auth Redirect URL 檢查

到 Supabase Dashboard -> Authentication -> URL Configuration 檢查：

- [ ] Site URL 是 production URL。
- [ ] Redirect URLs 包含 `http://localhost:3000`。
- [ ] Redirect URLs 包含 `http://localhost:3001`。
- [ ] Redirect URLs 包含 Vercel production URL。
- [ ] 若使用自訂網域，Redirect URLs 包含自訂網域。
- [ ] 若允許 Preview Deployments，已明確加入 preview URL pattern 或指定 URL。
- [ ] 若不允許 Preview Deployments，團隊已知道 preview 無法測 magic link。

## 5. Vercel Env 檢查

到 Vercel Project -> Settings -> Environment Variables 檢查：

- [ ] `NEXT_PUBLIC_SUPABASE_URL` 已設定。
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已設定。
- [ ] `NEXT_PUBLIC_SITE_URL` 已設定為 production URL。
- [ ] Production environment 已設定上述 env。
- [ ] Preview environment 已依團隊策略設定上述 env。
- [ ] 沒有設定 Supabase `service_role` key。
- [ ] 沒有把 `.env.local` commit 到 repo。

## 6. Vercel Deployment 檢查

- [ ] 最新 production deployment 成功。
- [ ] Production deployment 對應預期 Git commit SHA。
- [ ] Vercel build log 無 error。
- [ ] 首頁 `/` 可開啟。
- [ ] `/robots.txt` 可開啟。
- [ ] `/sitemap.xml` 可開啟。
- [ ] 主要資源沒有 404。
- [ ] Browser console 沒有阻擋功能的 CSP error。

## 7. GitHub Actions CI 檢查

- [ ] 最新 `main` 的 GitHub Actions `FoodieFeed CI` 通過。
- [ ] CI 有執行 `npm ci`。
- [ ] CI 有執行 `npm run typecheck`。
- [ ] CI 有執行 `npm run build`。
- [ ] CI 未使用 Supabase secret。
- [ ] 若 CI 失敗，暫緩 production deploy 或合併。

## 8. Admin 帳號檢查

- [ ] 至少有一個 production admin 帳號。
- [ ] Admin 帳號可用 magic link 登入。
- [ ] Admin 登入後可看到 `Admin 管理`。
- [ ] Admin 登入後可看到 `廣告成效`。
- [ ] Admin 登入後可看到 `廣告管理`。
- [ ] 一般使用者看不到 admin-only 入口。

Read-only check:

```sql
select id, role, created_at
from public.profiles
where role = 'admin'
order by created_at desc;
```

Write test，僅在測試資料上執行：

```sql
insert into public.profiles (id, role)
values ('替換成測試 auth.users.id', 'admin')
on conflict (id) do update set role = 'admin';
```

## 9. SEO / Robots / Sitemap 檢查

- [ ] `NEXT_PUBLIC_SITE_URL` 是正式 production URL。
- [ ] HTML metadata title 正確。
- [ ] HTML metadata description 正確。
- [ ] Open Graph URL 是 production URL。
- [ ] `/robots.txt` 允許 `/`。
- [ ] `/robots.txt` 包含 sitemap URL。
- [ ] `/sitemap.xml` 包含首頁 URL。
- [ ] 若使用自訂網域，sitemap URL 是自訂網域。

## 10. Security Headers 檢查

使用 browser devtools、`curl -I` 或線上 header checker 檢查：

- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` 已限制 camera / microphone / geolocation / payment。
- [ ] `Strict-Transport-Security` 存在。
- [ ] `Content-Security-Policy` 存在。
- [ ] CSP 沒有阻擋 Supabase API。
- [ ] CSP 沒有阻擋 Supabase Storage 圖片。
- [ ] CSP 沒有阻擋外部 `image_url` 圖片。
- [ ] Magic link 登入流程未被 CSP 破壞。

Read-only check:

```bash
curl -I https://你的-production-url
```

## 11. Custom SMTP 決策

- [ ] 已確認 Supabase 內建 email provider rate limit。
- [ ] Soft launch 預期登入人數：
- [ ] 本次 soft launch 是否暫緩 Custom SMTP：是 / 否
- [ ] 若暫緩，已接受 magic link 可能遇到寄信限制。
- [ ] 若必做，已設定 Resend / Postmark / SendGrid / Brevo 等 Custom SMTP。
- [ ] 若已設定 Custom SMTP，已測試 magic link 可收到。

## 12. 測試資料清理

- [ ] 刪除明顯測試 posts。
- [ ] 刪除明顯測試 comments。
- [ ] 停用或刪除測試 sponsored posts。
- [ ] 清理不需要的 Storage 測試圖片。
- [ ] 確認測試廣告不會在 production 對 beta user 顯示。
- [ ] 確認必要 demo data 保留。
- [ ] 確認 admin 測試帳號保留或移除策略。

Dangerous，非必要不要跑：

```sql
-- 範例：只在你非常確定 title pattern 是測試資料時使用。
delete from public.posts
where title ilike '%test%';
```

## 13. Beta 上線前最後確認

- [ ] Soft Launch Checklist 全部必要項目已完成。
- [ ] 30 分鐘 Manual QA 必跑清單已通過。
- [ ] Rollback Plan 已閱讀。
- [ ] Vercel rollback 的上一個 healthy deployment 已確認。
- [ ] Supabase production 專案沒有正在進行的危險 SQL 操作。
- [ ] 小流量 beta user 名單已確認。
- [ ] 回報問題的管道已準備。
- [ ] 上線時間與觀察窗口已確認。
- [ ] 上線後第一小時有人看 logs / feedback。
