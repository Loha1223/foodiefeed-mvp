import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "服務條款｜FoodieFeed 味鮮牆",
  description: "FoodieFeed 服務條款與使用規範。",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-stone-50/60 px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-4xl rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
          FoodieFeed 味鮮牆
        </p>
        <h1 className="mt-2 text-2xl font-bold text-stone-950 sm:text-3xl">
          服務條款
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          歡迎使用 FoodieFeed。為了維持資訊品質與社群安全，請先閱讀以下使用規範。
        </p>
        <p className="mt-2 text-xs text-stone-500">最後更新：2026-05-12</p>

        <div className="mt-6 space-y-5 text-sm leading-7 text-stone-700">
          <section>
            <h2 className="text-base font-semibold text-stone-900">一、內容責任</h2>
            <p className="mt-2">
              使用者需對自己發布的內容負責，包含文字、圖片、留言與連結資訊。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-stone-900">二、禁止行為</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>不得發布違法、侵權、惡意、騷擾或誤導性內容。</li>
              <li>不得冒用他人身分、散布不實資訊或濫用互動功能。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-stone-900">三、內容管理</h2>
            <p className="mt-2">
              若內容違反規範或影響平台安全，FoodieFeed 有權移除不適當內容，並視情況限制相關帳號使用。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-stone-900">四、資訊時效與正確性</h2>
            <p className="mt-2">
              美食情報具有時效性，平台不保證所有內容即時、完整或完全正確。使用前請自行判斷與再次確認。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-stone-900">五、贊助內容說明</h2>
            <p className="mt-2">
              平台上的贊助或廣告內容會以「贊助」標示，方便使用者辨識資訊來源。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-stone-900">六、服務調整</h2>
            <p className="mt-2">
              FoodieFeed 可依營運需求調整功能、內容或服務，並於必要時更新本條款。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-stone-900">七、聯絡方式</h2>
            <p className="mt-2">
              Email：<a className="text-red-700 underline" href="mailto:zx831223@gmail.com">zx831223@gmail.com</a>
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
