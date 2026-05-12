# FoodieFeed Rollback Plan

這份文件用於 production 發生阻塞問題時，協助快速判斷回滾方式。原則是先恢復使用者可用性，再處理資料修復與根因分析。

## 1. 回滾原則

- 先判斷問題類型：前端部署、Supabase 設定、資料庫 migration、Storage policy、Auth、廣告、tracking 或 likes。
- 優先使用最小影響的暫時停用方式。
- 不要在沒有備份與確認影響範圍前刪除 production data。
- Supabase migration 通常採 forward fix，不建議直接嘗試倒回。
- 若問題會造成資料破壞、權限外洩或大量錯誤，先暫停相關功能，再做修復。
- 所有 incident 都要記錄時間、影響範圍、處理人、操作內容與結果。

## 2. 前端 Vercel 回滾

適用情境：

- 最新前端部署造成白畫面。
- Navbar / Modal / Feed / Admin UI 等前端功能壞掉。
- CSP 或 security headers 擋到必要資源。
- 新功能造成 production 使用者無法完成核心流程。

操作步驟：

1. 到 Vercel Project -> Deployments。
2. 找到上一個已知正常的 production deployment。
3. 點擊該 deployment。
4. 選擇 Promote to Production。
5. 等待 Vercel 完成 promotion。
6. 開 production URL 做 smoke test：
   - 首頁可開。
   - Magic link 可登入。
   - 發文 / 留言 / 按讚可用。
   - Admin 入口沒有阻塞。
7. 在 incident log 記錄 rollback deployment URL 與 commit SHA。

注意：

- Vercel 回滾只回滾前端部署，不會回滾 Supabase migration 或資料。
- 若問題來自資料庫 policy / function，Vercel 回滾通常不能解決。

## 3. Git Commit Revert

適用情境：

- 需要在程式碼層面撤銷某個 commit。
- Vercel 回滾只是暫時恢復，仍需要讓 `main` 回到可部署狀態。

操作步驟：

1. 確認要 revert 的 commit SHA。
2. 在本機建立修復 branch。
3. 執行：

```bash
git revert <commit-sha>
```

4. 解衝突並確認沒有誤刪使用者後續改動。
5. 執行：

```bash
npm run typecheck
npm run build
```

6. 建立 PR，確認 GitHub Actions 通過。
7. 合併後部署。

注意：

- 不要用 `git reset --hard` 處理 shared branch。
- 若 commit 包含 migration，revert 程式碼不等於回滾資料庫。

## 4. Supabase Migration 風險

Supabase production migration 要視為高風險操作。

原則：

- 不建議直接刪除已執行 migration。
- 不建議直接 drop production table / column / function。
- schema 或 policy 修正請建立新的 forward migration。
- 對資料有破壞性的 SQL 必須先備份、先在 staging 或測試 project 驗證。

Read-only check:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema in ('public', 'storage')
order by table_schema, table_name;
```

Read-only check:

```sql
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
```

Dangerous，非必要不要跑：

```sql
-- 範例：不要在未備份、未確認影響範圍前執行破壞性操作。
-- drop table public.some_table;
-- drop policy some_policy on public.some_table;
```

## 5. 新功能壞掉時的暫時停用方式

### 5.1 Sponsored Ads 顯示壞掉

症狀：

- SponsoredCard 造成 feed crash。
- 廣告圖片或連結資料導致前台體驗異常。

暫時處理：

1. 先在 Admin 廣告管理停用問題廣告。
2. 若 Admin UI 無法使用，使用 SQL 停用廣告。

Dangerous，非必要不要跑：

```sql
update public.sponsored_posts
set is_active = false
where id = 替換成問題廣告_id;
```

若需要暫停所有廣告：

Dangerous，非必要不要跑：

```sql
update public.sponsored_posts
set is_active = false
where is_active = true;
```

恢復方式：

- 修正資料或前端後，再由 Admin 廣告管理重新啟用指定廣告。

### 5.2 廣告 Tracking 壞掉

症狀：

- `ad_impressions` / `ad_clicks` insert 大量失敗。
- tracking 造成 Supabase 用量異常。
- Admin 成效面板查詢很慢。

暫時處理：

- 前台 tracking 失敗不應阻擋顯示或跳轉，先確認是否只有 console.warn。
- 若資料量造成壓力，可暫時部署一個前端 hotfix 停止呼叫 tracking helper。
- 若需要資料庫層收斂，使用新的 forward migration 調整 policy 或 constraint。

注意：

- 不要直接刪除 tracking raw data，除非已確認不需要保留成效資料。
- 若要清理大量測試 tracking data，先用 read-only query 確認範圍。

Read-only check:

```sql
select ad_id, count(*) as impressions
from public.ad_impressions
group by ad_id
order by impressions desc
limit 20;
```

Dangerous，非必要不要跑：

```sql
delete from public.ad_impressions
where created_at < now() - interval '30 days';
```

### 5.3 Likes 防重複壞掉

症狀：

- 第一次按讚就失敗。
- 重複按讚仍增加。
- `posts.likes` 與 `post_likes` 明顯不一致。

暫時處理：

1. 先確認 `increment_post_likes` function 是否存在。
2. 確認 `post_likes` unique indexes 是否存在。
3. 若是前端顯示問題，可用 Vercel 回滾。
4. 若是 RPC 問題，建立 forward migration 修正 function。

Read-only check:

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'increment_post_likes';
```

Read-only check:

```sql
select p.id, p.likes, count(pl.id) as post_likes_count
from public.posts p
left join public.post_likes pl on pl.post_id = p.id
group by p.id, p.likes
having p.likes <> count(pl.id)
order by p.id desc;
```

Dangerous，非必要不要跑：

```sql
-- 僅在確認 posts.likes 需要以 post_likes 重算時才考慮。
-- 執行前請先備份並確認是否有舊資料例外。
update public.posts p
set likes = counts.like_count
from (
  select post_id, count(*)::integer as like_count
  from public.post_likes
  group by post_id
) counts
where p.id = counts.post_id;
```

### 5.4 Auth / Magic Link 壞掉

症狀：

- 收不到 magic link。
- 點擊 magic link 後 redirect 失敗。
- 登入後 Navbar 沒顯示 user。

暫時處理：

1. 檢查 Supabase Auth Email provider 是否啟用。
2. 檢查 Site URL 與 Redirect URLs。
   - Site URL 應為 `https://foodiefeed.tw`
   - Redirect URLs 至少包含：
     - `http://localhost:3000`
     - `http://localhost:3001`
     - `https://foodiefeed-mvp.vercel.app`
     - `https://foodiefeed.tw`
     - `https://www.foodiefeed.tw`
3. 檢查 Supabase 內建 email provider rate limit。
4. 若使用 Custom SMTP（Resend），檢查：
   - domain `foodiefeed.tw` 是否仍為 verified
   - sender 是否為 `no-reply@foodiefeed.tw`
   - Resend 後台是否有退信或拒收
5. 若是新前端造成，使用 Vercel 回滾。
6. 若是寄信限制，短期降低邀請流量，正式處理改 Custom SMTP。

### 5.5 Storage 圖片上傳 / 刪除壞掉

症狀：

- 登入使用者無法上傳圖片。
- 圖片 public URL 無法顯示。
- 刪除 post 後 Storage cleanup 失敗。

暫時處理：

- 上傳壞掉時，短期可請使用圖片 URL 或 fallback placeholder。
- 檢查 bucket `foodie-post-images` 是否存在且 public read。
- 檢查 Storage policy 是否允許 authenticated upload 到 `posts/{auth.uid()}/...`。
- Storage cleanup 失敗不應造成 DB delete rollback；先記錄 warning，後續手動清理 orphan objects。

Read-only check:

```sql
select id, name, public
from storage.buckets
where id = 'foodie-post-images';
```

### 5.6 Admin UI 壞掉

症狀：

- Admin panel 開不起來。
- Admin 廣告管理無法新增 / 編輯 / 刪除。
- Admin 廣告成效查詢失敗。

暫時處理：

- 若前端壞掉，使用 Vercel 回滾。
- 管理 posts 或 sponsored ads 可短期回到 Supabase Dashboard / Table Editor 手動處理。
- 不要使用 service_role key 放到前端。

## 6. 資料修復注意事項

- `comment_count` 是前端查詢時聚合，不是 `posts` table 欄位。
- `posts.likes` 是顯示 counter，防重複依據是 `post_likes`。
- 刪除 `sponsored_posts` 會 cascade 刪除相關 `ad_impressions` / `ad_clicks`。
- 刪除 `posts` 會 cascade 刪除 `comments` 與 `post_likes`。
- 刪除 post 後 Storage object cleanup 可能失敗，需視情況手動清理 orphan files。
- 修復 production data 前，先用 read-only query 確認範圍，再備份。

Read-only check:

```sql
select p.id, p.title, p.img
from public.posts p
where p.img like '%/storage/v1/object/public/foodie-post-images/%'
order by p.created_at desc
limit 50;
```

Dangerous，非必要不要跑：

```sql
-- 不建議直接批次刪除 production posts。
-- delete from public.posts where created_at < now() - interval '90 days';
```

## 7. Incident Log Template

請在每次 production incident 建立一筆記錄。

```txt
Incident ID:
發現時間:
回報人:
影響環境:
影響範圍:
嚴重程度:

症狀:
- 

初步判斷:
- 

已採取動作:
- 時間 / 操作人 / 操作內容 / 結果

是否執行 Vercel rollback:
- 是 / 否
- rollback deployment URL:
- rollback commit SHA:

是否執行資料庫操作:
- 是 / 否
- SQL 類型: Read-only check / Write test / Dangerous
- SQL 摘要:

資料修復需求:
- 

根因:
- 

後續改善:
- 

結案時間:
```

## 8. 回復後確認

- [ ] Production URL 可開啟。
- [ ] 未登入可瀏覽首頁。
- [ ] Magic link 登入可用。
- [ ] 發文 / 留言 / 按讚可用。
- [ ] Admin 管理可用。
- [ ] SponsoredCard 不阻塞首頁。
- [ ] Browser console 無 blocking error。
- [ ] Incident log 已更新。
