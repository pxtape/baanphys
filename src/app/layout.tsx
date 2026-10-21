import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "บ้านฟิสิกส์ by P'Tape | เรียนฟิสิกส์โอลิมปิก",
  description: "พื้นที่เรียนรู้ฟิสิกส์โอลิมปิกสำหรับนักเรียนไทย เข้าใจหลักการ ฝึกคิดเป็นระบบ และเติบโตในจังหวะของตัวเอง",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
