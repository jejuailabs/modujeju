import type { Metadata } from "next";
import "./globals.css";
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
    <html lang="ko" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
