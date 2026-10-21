import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { PageFrame } from "@/components/AcademyShell";

const plans = [
  { name: "Explorer", price: "ฟรี", period: "", note: "เริ่มสำรวจเส้นทางการเรียนรู้" },
  { name: "Challenger", price: "149", period: "บาท / เดือน", note: "สำหรับผู้ที่ต้องการฝึกอย่างสม่ำเสมอ" },
  { name: "Academy", price: "990", period: "บาท / เดือน", note: "สำหรับการเรียนรู้ที่มีโครงสร้างต่อเนื่อง" },
  { name: "Mentorship", price: "3,990", period: "บาท / เดือน", note: "สำหรับผู้ที่ต้องการแนวทางดูแลใกล้ชิด" },
];

export default function MembershipPage() {
  return <PageFrame active="/membership"><main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
    <header className="max-w-2xl border-b border-[var(--line)] pb-7"><p className="eyebrow">ACADEMY MEMBERSHIP</p><h1 className="mt-2 text-3xl font-semibold">แพ็กเกจสมาชิก</h1><p className="mt-3 text-sm leading-7 text-[var(--muted)]">โครงสร้างสมาชิกของบ้านฟิสิกส์ เพื่อให้เลือกแนวทางการเรียนที่เหมาะกับเป้าหมายและจังหวะของตัวเอง</p></header>
    <section aria-label="แพ็กเกจสมาชิก" className="mt-7 divide-y divide-[var(--line)]">
      {plans.map((plan, index) => <article key={plan.name} className="grid gap-4 py-5 sm:grid-cols-[1fr_1.5fr_auto] sm:items-center"><div><p className="font-mono text-[10px] text-[var(--copper)]">0{index + 1}</p><h2 className="mt-1 text-base font-semibold">{plan.name}</h2></div><p className="text-xs leading-6 text-[var(--muted)]">{plan.note}</p><p className="text-lg font-semibold sm:text-right">{plan.price}{plan.period && <small className="ml-1 text-[10px] font-normal text-[var(--muted)]">{plan.period}</small>}</p></article>)}
    </section>
    <p className="mt-5 flex items-start gap-2 border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-4 py-3 text-xs leading-6 text-[var(--muted)]"><ShieldAlert size={15} className="mt-1 shrink-0 text-[var(--copper)]"/>ขณะนี้แสดงโครงสร้างและราคาเพื่อให้ข้อมูลเท่านั้น ยังไม่มีระบบสมัครสมาชิกหรือชำระเงินจริง</p>
    <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3"><Link href="/diagnostic" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline">เริ่มจากแบบทดสอบวัดระดับ <ArrowRight size={15}/></Link><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]">ไปห้องเรียน <ArrowRight size={15}/></Link></div>
  </main></PageFrame>;
}
