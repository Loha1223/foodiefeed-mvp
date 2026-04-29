import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "味鮮牆 FoodieFeed",
  description: "限時美食情報站",
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
