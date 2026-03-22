import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { NavBar } from "./components/NavBar";
import { ToastProvider } from "./components/ToastProvider";
import { AuthProvider } from "./components/AuthProvider";

const plusJakarta = localFont({
  src: "../public/fonts/PlusJakartaSans-Variable.woff2",
  display: "swap",
  variable: "--font-plus-jakarta",
  weight: "400 800",
});

export const metadata: Metadata = {
  title: "OOTD — 你的智能穿搭衣橱",
  description: "上传单品和照片，一键生成穿搭效果图，每天都有新 look",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className={plusJakarta.variable}>
      <body className="antialiased" style={{ fontFamily: "var(--font-plus-jakarta), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <AuthProvider>
          <NavBar />
          <ToastProvider>
            <div className="pb-20">{children}</div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
