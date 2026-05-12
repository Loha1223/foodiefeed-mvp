# FoodieFeed Production Monitoring Runbook

本文件用於 FoodieFeed 正式環境的基礎監控與事件處理 SOP。  
目前階段先使用既有平台能力（Vercel / Supabase / Resend / Search Console），不額外導入監控套件。

正式環境：

- 站點：`https://foodiefeed.tw`
- 主要登入：Supabase Auth Magic Link
- 郵件：Supabase Custom SMTP（Resend）

---

## 1. 每日監控項目

### 1.1 Vercel

- **Deployments**
  - 檢查最新 production deploy 是否成功
  - 確認是否有異常回滾或連續失敗部署
- **Logs**
  - 檢查 Runtime / Function logs 是否有 error 峰值
  - 關注與首頁、Auth、API 請求相關錯誤
- **Analytics / Speed Insights**
  - 觀察頁面效能是否明顯退化
  - 留意 CLS/LCP/INP 突增與流量異常

### 1.2 Supabase

- **Auth Logs**
  - 觀察 magic link 發送與登入流程是否異常
  - 檢查是否有大量失敗登入或異常頻率
- **Database Logs**
  - 檢查錯誤查詢、RPC 失敗、權限拒絕是否增加
  - 關注 `get_sponsored_ad_stats` 相關錯誤
- **Storage**
  - 觀察 bucket 使用量是否異常增加
  - 追蹤圖片上傳/刪除是否出現異常模式

### 1.3 Resend

- **Resend Logs**
  - 檢查寄送成功率、failed、bounce、blocked
  - 關注 magic link 郵件是否可穩定送達

### 1.4 Google Search Console

- 檢查 `foodiefeed.tw` 資源狀態
- 確認 sitemap 狀態持續為成功
- 觀察索引頁數是否有不合理下降

---

## 2. 重要事件監控

發生以下事件時，需建立 incident 記錄並追蹤：

- Magic Link 寄送失敗
- 使用者登入失敗
- 圖片上傳失敗
- 發文失敗
- 留言失敗
- 按讚失敗
- 廣告 tracking 異常
- 廣告成效 RPC 錯誤
- Vercel deployment failed

建議記錄欄位：

- 發生時間
- 影響範圍（全部 / 部分使用者）
- 相關部署版本（commit SHA / deployment URL）
- 初步原因與處理動作
- 是否需啟動回滾

---

## 3. 事件嚴重度分級（P0 / P1 / P2 / P3）

- **P0**
  - 網站無法開啟
  - 登入全面失效
  - 資料錯亂（重大資料完整性風險）
- **P1**
  - 發文、圖片、留言、按讚等核心功能失效
- **P2**
  - 局部 UI 或單一功能異常（有替代流程）
- **P3**
  - 文案、視覺、低影響問題

建議處理時效：

- P0：立即處理（以分鐘計）
- P1：優先處理（以小時計）
- P2：排入近期修復
- P3：排入例行優化

---

## 4. 發生問題時的處理順序

1. **先確認 Vercel deployment**
   - 是否剛發生部署失敗或異常部署
   - 是否可用上一個 healthy deployment 回復
2. **再確認 Supabase logs**
   - Auth / Database / Storage 是否出現集中錯誤
3. **再確認 Resend logs**
   - magic link 郵件是否大量失敗、退信或被拒
4. **再確認 Cloudflare DNS / domain 狀態**
   - `foodiefeed.tw` 與 `www` 解析是否正常
5. **必要時啟動回滾流程**
   - 依 `docs/ROLLBACK_PLAN.md` 執行

---

## 5. 每週檢查項目

- Search Console sitemap 狀態（是否仍為成功）
- `robots.txt` 是否可開啟且未阻擋首頁
- Resend bounce / failed 是否異常升高
- Supabase Storage 使用量趨勢
- 廣告成效是否異常（曝光 / 點擊 / CTR 異常跳動）
- 是否有 orphan image 風險（清理策略是否需要啟動）

---

## 6. 未來可導入工具（非本階段）

- Sentry（前端與例外追蹤）
- UptimeRobot（站點可用性監控）
- Better Stack（log / incident 管理）
- PostHog / Plausible（產品分析）
- Supabase scheduled cleanup（自動清理 orphan image）

---

## 7. 操作備註

- 本階段不新增監控 SDK，不修改程式碼。
- 先以「可觀測 + 可回滾 + 可追蹤」為目標。
- 每次 incident 都要有紀錄，便於後續建立正式 on-call 流程。
