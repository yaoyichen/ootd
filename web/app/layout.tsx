import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { NavBar } from "./components/NavBar";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

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
    <html lang="zh" className={plusJakarta.variable}>
      <body className="antialiased" style={{ fontFamily: "var(--font-plus-jakarta), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <NavBar />
        <div className="pb-20">{children}</div>
      </body>
    </html>
  );
}
