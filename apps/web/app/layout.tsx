import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "อุรัณ รัษฎร — Budget Intelligence",
  description: "แปลงเอกสารงบประมาณ PDF/Excel เป็น Dashboard แบบ Real-time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  );
}
