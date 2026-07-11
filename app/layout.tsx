import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "열흘날씨 | 기상청 10일 예보",
  description: "기상청 단기·중기예보 데이터를 한눈에 보는 10일 날씨 앱",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
