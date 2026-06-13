import type { Metadata } from "next";
import { Noto_Sans_Thai, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans-thai",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
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
    // suppressHydrationWarning: the inline no-js script below adds a class to
    // <html> before React hydrates — attribute-level suppression only.
    <html
      lang="th"
      className={`${notoSansThai.variable} ${inter.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={`antialiased font-sans ${notoSansThai.className}`}>
        {/* Gate for scroll-reveal hidden states: without JS the .reveal
            initial opacity-0 never applies, so content stays visible.
            beforeInteractive runs before hydration and is hoisted by Next,
            so it avoids the "script tag inside React component" dev warning. */}
        <Script id="js-gate" strategy="beforeInteractive">
          {`document.documentElement.classList.add('js')`}
        </Script>
        {/* Apply the persisted theme (or OS preference if unset) before paint
            to avoid a light->dark flash. Mirrors the resolution logic in
            ThemeToggle (components/shared/ThemeToggle.tsx). */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`}
        </Script>
        {children}
      </body>
    </html>
  );
}
