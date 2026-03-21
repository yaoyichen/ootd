import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { NavBar } from "./components/NavBar";
import { ToastProvider } from "./components/ToastProvider";

const plusJakarta = localFont({
  src: "../public/fonts/PlusJakartaSans-Variable.woff2",
  display: "swap",
  variable: "--font-plus-jakarta",
  weight: "400 800",
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
        <ToastProvider>
          <div className="pb-20">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
