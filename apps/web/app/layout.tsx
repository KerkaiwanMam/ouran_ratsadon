import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "อุรัณ รัษฎร — Budget Intelligence",
    template: "%s — อุรัณ รัษฎร",
  },
  description:
    "สำรวจงบประมาณแผ่นดินไทยด้วย Treemap Interactive และวิเคราะห์ค่าใช้จ่ายธุรกิจสำหรับ SME",
  openGraph: {
    siteName: "อุรัณ รัษฎร",
    locale: "th_TH",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={notoSansThai.variable} data-scroll-behavior="smooth">
      <body className={`antialiased font-sans ${notoSansThai.className}`}>
        {children}
      </body>
    </html>
  );
}
