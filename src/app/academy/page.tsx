import Link from "next/link";
import { ArrowDownRight, ArrowRight, Atom, MoveRight, ShieldAlert } from "lucide-react";
import { AcademyFooter, AcademyHeader } from "@/components/AcademyShell";
import { PhysicsIllustration } from "@/components/PhysicsIllustration";

const principles = [
  { number: "01", title: "เริ่มจากพื้นฐานที่แม่น", text: "จัดลำดับหัวข้อจากความเข้าใจพื้นฐาน ไปสู่การประยุกต์ใช้กับโจทย์หลายขั้น" },
  { number: "02", title: "เห็นเหตุผลในทุกสมการ", text: "เชื่อมภาพ แรง และแบบจำลองเข้ากับสมการ ก่อนเลือกวิธีคำนวณ" },
  { number: "03", title: "รู้ว่าควรฝึกอะไรต่อ", text: "ใช้ผลการเรียนและ prerequisite ช่วยวางแผนก้าวถัดไปอย่างมีเป้าหมาย" },
];

export default function Home() {
  return <main className="min-h-screen">
    <AcademyHeader/>
    <section className="relative overflow-hidden border-b border-[var(--line)]">
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1fr_.9fr] lg:gap-10 lg:py-20">
        <div className="relative z-10 max-w-2xl">
          <p className="eyebrow">PHYSICS OLYMPIAD ACADEMY · THAILAND</p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.3] tracking-[-.035em] text-[var(--ink)] sm:text-5xl lg:text-[58px]">เข้าใจฟิสิกส์<br/><span className="text-[var(--accent)]">ไปได้ไกลกว่าเดิม</span></h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-[var(--muted)]">เส้นทางเรียนฟิสิกส์โอลิมปิกที่เริ่มจากหลักการ ฝึกการคิดเป็นระบบ และช่วยให้นักเรียนเห็นเป้าหมายถัดไปของตัวเอง</p>
          <Link href="/diagnostic" className="button-primary mt-8">ทำแบบทดสอบวัดระดับ <ArrowRight size={17}/></Link>
          <p className="mt-4 text-xs text-[var(--muted)]">แบบประเมินเบื้องต้นสำหรับวางแผนการเรียน ไม่ใช่การรับรองคุณสมบัติหรือผลคัดเลือก POSN</p>
          <div className="mt-10 flex items-center gap-3 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-[var(--accent)]"><Atom size={15}/></span><span>Mechanics · Thermal &amp; Waves · Electricity &amp; Magnetism</span></div>
        </div>
        <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
          <div className="absolute right-4 top-3 h-[78%] w-[78%] rounded-full border border-[#DCE5DF]"/>
          <div className="absolute right-12 top-10 h-[62%] w-[62%] rounded-full border border-dashed border-[#DCE5DF]"/>
          <PhysicsIllustration className="relative z-10 w-full"/>
          <div className="absolute bottom-4 left-2 z-20 border-l-2 border-[var(--copper)] bg-[var(--paper)] px-4 py-2"><span className="block text-[10px] uppercase tracking-[.15em] text-[var(--muted)]">Mechanics · Projectile motion</span><span className="mt-1 block font-serif text-lg text-[var(--ink)]">R = u² sin 2θ / g</span></div>
        </div>
      </div>
      <div className="absolute bottom-0 right-0 top-0 z-0 hidden w-[38%] border-l border-[var(--line)] bg-[#F3F5F0] lg:block"/>
    </section>

    <section className="border-b border-[var(--line)] bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 sm:py-16 md:grid-cols-[.72fr_1.28fr]">
        <div><p className="eyebrow">A CLEAR WAY FORWARD</p><h2 className="section-heading mt-3">เรียนอย่างมีระบบ<br/>โดยเข้าใจเหตุผล</h2><p className="mt-4 max-w-sm text-sm leading-7 text-[var(--muted)]">ไม่เร่งจำสูตร เริ่มจากแบบจำลองและหลักการ แล้วต่อยอดไปสู่โจทย์ที่ท้าทายขึ้นทีละขั้น</p></div>
        <div className="divide-y divide-[var(--line)]">
          {principles.map((item) => <article key={item.number} className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[54px_1fr] sm:gap-5"><span className="font-mono text-xs text-[var(--copper)]">{item.number}</span><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">{item.text}</p></div></article>)}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end"><div><p className="eyebrow">YOUR LEARNING MAP</p><h2 className="section-heading mt-3">สามสาขาหลัก<br className="sm:hidden"/> หนึ่งเส้นทางที่ชัดเจน</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">ติดตามทักษะและ prerequisite ใน Mechanics, Thermal &amp; Waves และ Electricity &amp; Magnetism</p></div><Link href="/skill-tree" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline">ดู Skill Tree <MoveRight size={16}/></Link></div>
      <div className="mt-8 grid border-y border-[var(--line)] sm:grid-cols-3 sm:divide-x sm:divide-[var(--line)]">
        {[{ no: "01", title: "Mechanics", thai: "กลศาสตร์", icon: "→" }, { no: "02", title: "Thermal & Waves", thai: "ความร้อนและคลื่น", icon: "∿" }, { no: "03", title: "Electricity & Magnetism", thai: "ไฟฟ้าและแม่เหล็ก", icon: "∿" }].map((item) => <Link href="/skill-tree" key={item.no} className="group flex items-center gap-4 border-b border-[var(--line)] py-5 last:border-b-0 sm:border-0 sm:px-5 sm:first:pl-0"><span className="font-mono text-[10px] text-[var(--copper)]">{item.no}</span><span className="flex-1"><b className="block text-sm font-semibold">{item.title}</b><span className="mt-1 block text-xs text-[var(--muted)]">{item.thai}</span></span><span className="text-lg text-[var(--accent)] transition group-hover:translate-x-1">{item.icon}</span></Link>)}
      </div>
    </section>

    <section className="border-y border-[var(--line)] bg-[var(--ink)] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div><p className="eyebrow !text-[#A9C6BC]">READINESS IS A LEARNING GUIDE</p><h2 className="mt-3 text-2xl font-medium">เริ่มต้นจากจุดที่เราอยู่</h2><p className="mt-2 text-sm leading-6 text-[#CBD4D4]">ระดับความพร้อมเป็นเกณฑ์ภายในของแพลตฟอร์ม ไม่ใช่ระดับคัดเลือกหรือคุณวุฒิ POSN</p></div>
        <Link href="/diagnostic" className="inline-flex shrink-0 items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[#E9EFEB]">ทำแบบทดสอบวัดระดับ <ArrowDownRight size={16}/></Link>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">ACADEMY MEMBERSHIP</p><h2 className="section-heading mt-3">เลือกจังหวะเรียนที่เหมาะกับเรา</h2></div><Link href="/membership" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline">ดูรายละเอียดสมาชิก <ArrowRight size={15}/></Link></div>
      <div className="mt-6 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
        {[["Explorer", "ฟรี"], ["Challenger", "149", "บาท / เดือน"], ["Academy", "990", "บาท / เดือน"], ["Mentorship", "3,990", "บาท / เดือน"]].map(([tier, price, unit]) => <div key={tier} className="flex items-baseline justify-between border-b border-[var(--line)] py-4 lg:block"><span className="text-sm font-semibold">{tier}</span><span className="text-sm text-[var(--muted)] lg:mt-2 lg:block">{price}{unit && <small className="ml-1 text-[10px]">{unit}</small>}</span></div>)}
      </div>
      <div className="mt-5 flex items-start gap-2 text-xs text-[var(--muted)]"><ShieldAlert size={15} className="mt-0.5 shrink-0 text-[var(--copper)]"/><p>แสดงข้อมูลแพ็กเกจเพื่อประกอบการตัดสินใจเท่านั้น ขณะนี้ยังไม่มีระบบชำระเงิน</p></div>
    </section>
    <AcademyFooter/>
  </main>;
}
