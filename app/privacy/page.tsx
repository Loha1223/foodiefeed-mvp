import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隱私權政策｜FoodieFeed 味鮮牆",
  description: "FoodieFeed 隱私權政策與資料使用說明。",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-stone-50/60 px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-4xl rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
          FoodieFeed 味鮮牆
        </p>
        <h1 className="mt-2 text-2xl font-bold text-stone-950 sm:text-3xl">
          隱私權政策
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          我們重視你的個人資料與使用安全。本頁說明 FoodieFeed 在 MVP
          階段如何蒐集、使用與保護資料。
        </p>
        <p className="mt-2 text-xs text-stone-500">最後更新：2026-05-12</p>

        <div className="mt-6 space-y-5 text-sm leading-7 text-stone-700">
          <section>
            <h2 className="text-base font-semibold text-stone-900">一、我們會蒐集的資料</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Email 登入資訊（Magic Link 驗證所需）</li>
              <li>使用者投稿內容（店家、標題、地點、地址、分類等）</li>
              <li>使用者上傳圖片</li>
              <li>留言內容</li>
              <li>按讚與互動紀錄</li>
              <li>廣告曝光與點擊紀錄</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-stone-900">二、資料使用目的</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>提供登入與帳號識別功能</li>
              <li>顯示與管理使用者投稿內容</li>
              <li>維護網站安全與防止濫用行為</li>
              <li>改善產品體驗與內容品質</li>
              <li>查看廣告成效與服務營運狀態</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-stone-900">三、第三方服務</h2>
            <p className="mt-2">
              FoodieFeed 目前使用以下第三方服務支援網站運作：
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Supabase（資料庫、驗證、儲存）</li>
              <li>Vercel（網站部署與託管）</li>
              <li>Resend（Email 寄送）</li>
              <li>Cloudflare（DNS 與網路層服務）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-stone-900">
              四、資料刪除與內容下架請求
            </h2>
            <p className="mt-2">
              若你希望刪除個人資料、請求內容下架，或對資料使用有疑問，請來信聯絡我們。我們會在合理時間內協助處理。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-stone-900">五、聯絡方式</h2>
            <p className="mt-2">
              Email：<a className="text-red-700 underline" href="mailto:zx831223@gmail.com">zx831223@gmail.com</a>
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
