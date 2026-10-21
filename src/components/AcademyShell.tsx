"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpenCheck, Compass, GraduationCap, LogIn, Timer, Workflow, ClipboardCheck } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { href: "/courses", label: "คอร์สของฉัน", icon: BookOpenCheck },
  { href: "/dashboard", label: "ห้องเรียน", icon: Compass },
  { href: "/skill-tree", label: "แผนที่ค่าย", icon: Workflow },
  { href: "/mock-exam", label: "Mock Exam", icon: Timer },
  { href: "/membership", label: "สมาชิก", icon: GraduationCap },
];

export function AcademyHeader({ active }: { active?: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [canManageCurriculum, setCanManageCurriculum] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  useEffect(() => {
    if (!isSupabaseConfigured()) { setCheckingSession(false); return; }
    const supabase = createClient();
    let alive = true;
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!alive) return;
      setSignedIn(Boolean(user));
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (alive) setCanManageCurriculum(profile?.role === "teacher" || profile?.role === "admin");
      }
      if (alive) setCheckingSession(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) { setSignedIn(Boolean(session)); if (!session) setCanManageCurriculum(false); }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    const { error } = await createClient().auth.signOut();
    if (!error) window.location.assign("/login");
  }

  return <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3 sm:px-8">
      <Link href="/" aria-label="บ้านฟิสิกส์ หน้าแรก" className="flex shrink-0 items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ink)] text-[var(--paper)]"><BookOpenCheck size={19}/></span>
        <span className="leading-tight"><b className="block text-sm tracking-tight">บ้านฟิสิกส์</b><small className="text-[10px] text-[var(--muted)]">P&apos;Tape Physics Academy</small></span>
      </Link>
      <nav aria-label="เมนูหลัก" className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap">
        {navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${active === href ? "bg-[var(--soft)] font-semibold text-[var(--accent)]" : "text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]"}`}><Icon size={14}/><span>{label}</span></Link>)}
        {canManageCurriculum && <Link href="/teacher/skill-trees" aria-current={active === "/teacher/skill-trees" ? "page" : undefined} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${active === "/teacher/skill-trees" ? "bg-[var(--soft)] font-semibold text-[var(--accent)]" : "text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]"}`}><Workflow size={14}/><span>จัดการ Skill Tree</span></Link>}
        {canManageCurriculum && <Link href="/teacher/reviews" aria-current={active === "/teacher/reviews" ? "page" : undefined} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${active === "/teacher/reviews" ? "bg-[var(--soft)] font-semibold text-[var(--accent)]" : "text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]"}`}><ClipboardCheck size={14}/><span>ตรวจการบ้าน</span></Link>}
      </nav>
      {!checkingSession && (signedIn ? <><button type="button" onClick={() => void signOut()} className="hidden shrink-0 items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-white sm:inline-flex">ออกจากระบบ</button><button type="button" aria-label="ออกจากระบบ" onClick={() => void signOut()} className="shrink-0 rounded-lg border border-[var(--line)] px-2.5 py-2 text-[10px] font-semibold text-[var(--ink)] sm:hidden">ออก</button></> : <><Link href="/login" className="hidden shrink-0 items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-white sm:inline-flex"><LogIn size={14}/>เข้าสู่ระบบ</Link><Link href="/login" className="shrink-0 rounded-lg border border-[var(--line)] px-2.5 py-2 text-[10px] font-semibold text-[var(--ink)] sm:hidden">เข้าสู่ระบบ</Link></>)}
    </div>
  </header>;
}

export function AcademyFooter() {
  return <footer className="border-t border-[var(--line)]"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-[11px] text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© 2026 บ้านฟิสิกส์ by P&apos;Tape</span><span>ระดับความพร้อมเป็นเกณฑ์ภายในเพื่อวางแผนการเรียน</span></div></footer>;
}

export function PageFrame({ children, active }: { children: React.ReactNode; active?: string }) {
  return <div className="min-h-screen"><AcademyHeader active={active}/>{children}<AcademyFooter/></div>;
}
