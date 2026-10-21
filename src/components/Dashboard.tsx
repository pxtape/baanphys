"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CircleHelp, Clock3, Network, RotateCcw, ShieldCheck, Target } from "lucide-react";
import { PageFrame } from "@/components/AcademyShell";
import { getCurriculumForProgress, getStageLabel, type ReadinessStage } from "@/lib/curriculum";
import { calculateWeightedLearningProgress, isLearningStage, learningStageLabels, type LearningStage } from "@/lib/student-learning";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type ViewState = "demo" | "loading" | "signed-out" | "connected" | "error";
type Progress = { skill_id: string; status: string };
type Attempt = { readiness_stage: ReadinessStage; score: number; total_questions: number; completed_at: string };
type FocusMap = { id: string; title: string };
type FocusItem = { id: string; skill_id: string; weight: number };
type ItemProgress = { item_id: string; status: string };

export function Dashboard() {
  const configured = isSupabaseConfigured();
  const [view, setView] = useState<ViewState>(configured ? "loading" : "demo");
  const [name, setName] = useState("นักเรียน");
  const progress = useMemo<Progress[]>(() => configured ? [] : [{ skill_id: "vectors", status: "completed" }, { skill_id: "kinematics", status: "in_progress" }], [configured]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [focusStage, setFocusStage] = useState<LearningStage | null>(null);
  const [focusMaps, setFocusMaps] = useState<FocusMap[]>([]);
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);
  const [focusItemProgress, setFocusItemProgress] = useState<ItemProgress[]>([]);
  const skills = useMemo(() => getCurriculumForProgress(progress), [progress]);
  const masteredCount = skills.filter((skill) => skill.status === "mastered").length;
  const currentSkill = skills.find((skill) => skill.status === "in_progress") ?? skills.find((skill) => skill.status === "available");
  const focusStats = calculateWeightedLearningProgress(focusItems, focusItemProgress);

  useEffect(() => {
    if (!configured) return;
    let alive = true;
    void (async () => {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!alive) return;
      if (authError || !user) { setView("signed-out"); return; }
      const [{ data: profile, error: profileError }, { data: attemptRow, error: attemptError }, { data: goal, error: goalError }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).single(),
        supabase.from("assessment_attempts").select("readiness_stage,score,total_questions,completed_at").eq("user_id", user.id).eq("assessment_type", "diagnostic").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("student_learning_goals").select("target_readiness_stage").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!alive) return;
      if (profileError || attemptError || goalError) { setView("error"); return; }

      let mapsForFocus: FocusMap[] = [];
      let itemsForFocus: FocusItem[] = [];
      let itemProgressForFocus: ItemProgress[] = [];
      const target = goal?.target_readiness_stage;
      if (isLearningStage(target)) {
        const { data: maps, error: mapsError } = await supabase.from("skill_maps").select("id,title").eq("readiness_stage", target).eq("is_published", true).order("created_at");
        if (mapsError) { if (alive) setView("error"); return; }
        mapsForFocus = (maps as FocusMap[] | null) ?? [];
        if (mapsForFocus.length) {
          const { data: mapSkills, error: mapSkillsError } = await supabase.from("skills").select("id").in("map_id", mapsForFocus.map((map) => map.id)).is("archived_at", null);
          if (mapSkillsError) { if (alive) setView("error"); return; }
          const skillIds = (mapSkills ?? []).map((skill) => skill.id);
          if (skillIds.length) {
            const { data: learningItems, error: itemsError } = await supabase.from("skill_learning_items").select("id,skill_id,weight").in("skill_id", skillIds).eq("is_published", true);
            if (itemsError) { if (alive) setView("error"); return; }
            itemsForFocus = (learningItems as FocusItem[] | null) ?? [];
            if (itemsForFocus.length) {
              const { data: itemProgress, error: itemProgressError } = await supabase.from("user_learning_item_progress").select("item_id,status").eq("user_id", user.id);
              if (itemProgressError) { if (alive) setView("error"); return; }
              itemProgressForFocus = (itemProgress as ItemProgress[] | null) ?? [];
            }
          }
        }
        setFocusStage(target);
      }
      setName(profile?.display_name || user.email?.split("@")[0] || "นักเรียน");
      setAttempt((attemptRow as Attempt | null) ?? null);
      setFocusMaps(mapsForFocus);
      setFocusItems(itemsForFocus);
      setFocusItemProgress(itemProgressForFocus);
      setView("connected");
    })();
    return () => { alive = false; };
  }, [configured]);

  if (view === "loading") return <main className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">กำลังโหลดห้องเรียน…</main>;
  if (view === "signed-out") return <PageFrame active="/dashboard"><main className="mx-auto max-w-3xl px-5 py-16 text-center sm:py-24"><ShieldCheck className="mx-auto text-[var(--accent)]" size={28}/><h1 className="mt-5 text-2xl font-semibold">เข้าสู่ระบบเพื่อดูห้องเรียน</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[var(--muted)]">ผลวัดระดับและความคืบหน้าจะเชื่อมกับบัญชี Supabase ของคุณ</p><Link href="/login?next=/dashboard" className="button-primary mt-6">เข้าสู่ระบบ <ArrowRight size={16}/></Link></main></PageFrame>;
  if (view === "error") return <PageFrame active="/dashboard"><main className="mx-auto max-w-3xl px-5 py-16 text-center"><h1 className="text-2xl font-semibold">ยังโหลดข้อมูลห้องเรียนไม่ได้</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]">ตรวจสอบว่าได้รัน migration ล่าสุดสำหรับ Skill Tree และเป้าหมายการเรียนใน Supabase แล้ว ระบบจะไม่แสดงข้อมูลตัวอย่างแทนข้อมูลจริง</p><Link href="/skill-tree" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">ไปเลือกเส้นทาง <ArrowRight size={15}/></Link></main></PageFrame>;

  const latestResult = view === "demo" ? "Camp 1" : getStageLabel(attempt?.readiness_stage);
  const demoProgressPct = Math.round((masteredCount / skills.length) * 100);
  const progressPct = view === "demo" ? demoProgressPct : focusStats.percent;
  const nextMap = focusMaps[0];

  return <PageFrame active="/dashboard"><main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
    {view === "demo" && <div className="mb-8 flex items-start gap-2 border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-4 py-3 text-xs leading-6 text-[var(--muted)]"><CircleHelp size={15} className="mt-1 shrink-0 text-[var(--copper)]"/><p><b className="text-[var(--ink)]">ตัวอย่างหน้าห้องเรียน</b> · ตัวเลขด้านล่างเป็นข้อมูลตัวอย่าง ไม่ได้บันทึกในฐานข้อมูล</p></div>}
    <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">STUDENT DASHBOARD</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">สวัสดี, {name}</h1><p className="mt-2 text-sm text-[var(--muted)]">ภาพรวมเป้าหมายและก้าวถัดไปในการเรียนฟิสิกส์</p></div><Link href={focusStage ? "/skill-tree" : "/diagnostic"} className="inline-flex items-center gap-2 self-start rounded-md border border-[var(--line)] bg-white px-3.5 py-2.5 text-xs font-semibold hover:border-[var(--accent)]">{focusStage ? <><Target size={14}/> เปลี่ยนเป้าหมาย</> : attempt ? <><RotateCcw size={14}/> ทำแบบประเมินอีกครั้ง</> : <><Target size={14}/> ทำแบบทดสอบวัดระดับ</>}</Link></div>

    <section className="grid gap-8 border-b border-[var(--line)] py-7 md:grid-cols-[.8fr_1.2fr] md:gap-12">
      <div className="border-l-2 border-[var(--accent)] pl-4"><p className="text-xs text-[var(--muted)]">ผลวัดระดับล่าสุด</p><p className="mt-2 text-3xl font-semibold tracking-tight">{latestResult}</p><p className="mt-2 max-w-xs text-xs leading-5 text-[var(--muted)]">{attempt ? `ผลแบบประเมินล่าสุด ${attempt.score}/${attempt.total_questions} ข้อ` : view === "demo" ? "ผลตัวอย่าง · ไม่ใช่ผลประเมินจริง" : "ทำแบบทดสอบเพื่อสำรวจจุดเริ่มต้น"}</p><p className="mt-2 text-[10px] text-[var(--copper)]">เกณฑ์ภายในเพื่อวางแผนการเรียน ไม่ใช่คุณวุฒิ POSN</p></div>
      <div><div className="flex items-end justify-between gap-3"><div><p className="text-xs text-[var(--muted)]">{view === "demo" ? "ความคืบหน้าตัวอย่าง" : "ความคืบหน้าเนื้อหาในเป้าหมาย"}</p><p className="mt-1 text-sm font-semibold">{view === "demo" ? `ผ่านแล้ว ${masteredCount} จาก ${skills.length} ทักษะ` : focusStage ? focusStats.percent === null ? `ยังไม่มีเนื้อหาที่เผยแพร่ · ${learningStageLabels[focusStage]}` : `เนื้อหาตามน้ำหนัก · ${learningStageLabels[focusStage]}` : "เลือกเป้าหมายเพื่อเริ่มติดตาม"}</p></div>{progressPct !== null && <span className="font-mono text-sm text-[var(--accent)]">{progressPct}%</span>}</div>{progressPct !== null && <div className="mt-3 h-1.5 w-full bg-[#E7EBE6]"><div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${progressPct}%` }}/></div>}<p className="mt-2 text-[10px] text-[var(--muted)]">{view === "demo" ? "ตัวเลขตัวอย่าง" : focusStage ? "น้ำหนักภายในแต่ละทักษะจะปรับตามสัดส่วนที่ครูกำหนด · HW นับเมื่อครูตรวจผ่าน" : "แผนที่อื่นยังเปิดดูได้จากหน้าแผนที่ค่าย"}</p></div>
    </section>

    <section className="grid gap-8 border-b border-[var(--line)] py-7 md:grid-cols-[1fr_auto] md:items-center"><div><p className="eyebrow">NEXT STEP</p>{view === "demo" ? <><h2 className="mt-2 text-lg font-semibold">{currentSkill?.title ?? "ทำแบบทดสอบวัดระดับ"}</h2><p className="mt-1 text-sm text-[var(--muted)]">{currentSkill?.subtitle ?? "เริ่มจากแบบประเมินสั้นเพื่อช่วยแนะนำเส้นทาง"}</p></> : focusStage ? <><h2 className="mt-2 text-lg font-semibold">{nextMap ? `เรียนต่อ: ${nextMap.title}` : "รอครูเผยแพร่แผนที่สำหรับเป้าหมายนี้"}</h2><p className="mt-1 text-sm text-[var(--muted)]">เป้าหมายของคุณคือ {learningStageLabels[focusStage]} · เลือกดูแผนที่อื่นได้ทุกเมื่อ</p></> : <><h2 className="mt-2 text-lg font-semibold">เลือกว่ากำลังเตรียมตัวเพื่ออะไร</h2><p className="mt-1 text-sm text-[var(--muted)]">เป้าหมายที่เลือกจะเชื่อมกับความคืบหน้าบนห้องเรียนนี้</p></>}</div><Link href={view === "demo" ? currentSkill ? "/skill-tree" : "/diagnostic" : "/skill-tree"} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline">{view === "demo" && !currentSkill ? "เริ่มแบบทดสอบ" : focusStage ? "ไปยังแผนที่ค่าย" : "เลือกเป้าหมาย"} <ArrowRight size={16}/></Link></section>

    <section className="grid gap-5 py-7 sm:grid-cols-2"><Link href="/skill-tree" className="group flex items-start gap-4 border-b border-[var(--line)] pb-5 sm:border-b-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--line)] text-[var(--accent)]"><Network size={18}/></span><span><b className="block text-sm">แผนที่ค่ายฟิสิกส์</b><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">ดูแผนที่ทุกค่าย พร้อมเน้นเส้นทางเป้าหมายของคุณ</span><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">เปิดแผนที่ <ArrowRight size={13} className="transition group-hover:translate-x-1"/></span></span></Link><Link href="/mock-exam" className="group flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--line)] text-[var(--copper)]"><Clock3 size={18}/></span><span><b className="block text-sm">Timed Mock Exam</b><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">ฝึกทำข้อสอบจับเวลาและทบทวนคำอธิบายหลังส่งคำตอบ</span><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">ดูข้อสอบจำลอง <ArrowRight size={13} className="transition group-hover:translate-x-1"/></span></span></Link></section>
    <div className="flex items-center gap-2 border-t border-[var(--line)] pt-4 text-[10px] text-[var(--muted)]"><BookOpen size={13}/>{view === "demo" ? "ตัวอย่างความคืบหน้าไม่ใช่ข้อมูลบัญชีจริง" : "แผนที่อื่นยังดูได้ทั้งหมด · เป้าหมายนี้ใช้กำหนดจุดโฟกัสในห้องเรียน"}</div>
  </main></PageFrame>;
}
