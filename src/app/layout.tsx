import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
const studioSans=localFont({src:"./fonts/NotoSansThai-variable.ttf",display:"swap",variable:"--font-studio-sans",weight:"100 900"});

export const metadata: Metadata = {
  title: "บ้านฟิสิกส์ by P'Tape | เรียนฟิสิกส์โอลิมปิก",
  description: "พื้นที่เรียนรู้ฟิสิกส์โอลิมปิกสำหรับนักเรียนไทย เข้าใจหลักการ ฝึกคิดเป็นระบบ และเติบโตในจังหวะของตัวเอง",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th" className={studioSans.variable}><body className="bp-site">{children}</body></html>;
}

