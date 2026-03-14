import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OOTD — AI 虚拟试穿",
  description: "上传人像和单品，AI 生成你穿上效果图",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className="antialiased">{children}</body>
    </html>
  );
}
