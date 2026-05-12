import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "聯絡我們｜FoodieFeed 味鮮牆",
  description: "FoodieFeed 聯絡方式與問題回報說明。",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-stone-50/60 px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-4xl rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
          FoodieFeed 味鮮牆
        </p>
        <h1 className="mt-2 text-2xl font-bold text-stone-950 sm:text-3xl">
          聯絡我們
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          如果你遇到問題、希望下架內容、提出資料刪除請求，或有合作提案，歡迎來信。
        </p>

        <div className="mt-6 space-y-5 text-sm leading-7 text-stone-700">
          <section>
            <h2 className="text-base font-semibold text-stone-900">我們可協助的事項</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>問題回報</li>
              <li>內容下架</li>
              <li>資料刪除請求</li>
              <li>合作洽詢</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-stone-900">聯絡信箱</h2>
            <p className="mt-2">
              Email：<a className="text-red-700 underline" href="mailto:zx831223@gmail.com">zx831223@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-stone-900">來信建議附上資訊</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>問題描述</li>
              <li>截圖</li>
              <li>相關網址</li>
              <li>使用裝置與瀏覽器</li>
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
