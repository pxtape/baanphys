import Link from "next/link";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { PageFrame } from "@/components/AcademyShell";
import { SkillMapBuilder } from "@/components/SkillMapBuilder";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireTeacherOrAdmin } from "@/lib/roles/access";

export default async function NewSkillTreePage() {
  if (!isSupabaseConfigured()) return <PageFrame><main className="mx-auto max-w-3xl px-5 py-16 text-center"><CircleAlert className="mx-auto text-[var(--copper)]"/><h1 className="mt-4 text-xl font-semibold">ยังไม่ได้เชื่อมต่อ Supabase</h1><p className="mt-2 text-sm text-[var(--muted)]">ตั้งค่าฐานข้อมูลก่อนสร้าง Skill Tree</p></main></PageFrame>;
  await requireTeacherOrAdmin("/teacher/skill-trees/new");
  return <PageFrame><main className="mx-auto max-w-7xl px-4 py-7 sm:px-7 sm:py-10"><Link href="/teacher/skill-trees" className="inline-flex items-center gap-2 text-xs text-[var(--muted)]"><ArrowLeft size={14}/>กลับรายการ Skill Tree</Link><div className="my-5 border-b border-[var(--line)] pb-5"><p className="eyebrow">NEW CURRICULUM MAP</p><h1 className="mt-2 text-2xl font-semibold">สร้าง Skill Tree</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">เพิ่มโหนด เชื่อมเส้น prerequisite และจัดแผนที่ได้เหมือนเกม</p></div><SkillMapBuilder/></main></PageFrame>;
}
