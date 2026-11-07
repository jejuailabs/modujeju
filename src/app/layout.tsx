import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  style: "normal",
  display: "swap",
  fallback: ["sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "같이제주 | 모두에게 편안한 제주 여행",
    template: "%s · 같이제주",
  },
  description:
    "아이, 반려견, 어르신과 함께하는 제주 여행. 지역과 예산, 동행 조건으로 우리에게 맞는 장소를 찾아보세요.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={pretendard.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={pretendard.className}>{children}</body>
    </html>
  );
}
