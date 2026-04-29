import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FoodieFeed 味鮮牆｜限時美食情報站",
  description: "探索快閃店、期間限定餐點、在地優惠與即時美食情報。",
  openGraph: {
    title: "FoodieFeed 味鮮牆｜限時美食情報站",
    description: "探索快閃店、期間限定餐點、在地優惠與即時美食情報。",
    type: "website",
    locale: "zh_TW",
  },
  twitter: {
    card: "summary",
    title: "FoodieFeed 味鮮牆｜限時美食情報站",
    description: "探索快閃店、期間限定餐點、在地優惠與即時美食情報。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
