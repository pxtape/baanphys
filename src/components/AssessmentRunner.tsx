"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Clock3, RotateCcw, ShieldCheck } from "lucide-react";
import { PageFrame } from "@/components/AcademyShell";
import { getReadinessStage, getStageLabel, type AssessmentQuestion } from "@/lib/curriculum";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type AssessmentType = "diagnostic" | "mock_exam";
type Phase = "checking" | "signed-out" | "auth-error" | "intro" | "taking" | "saving" | "review";

export function AssessmentRunner({ type, title, subtitle, durationSeconds, questions }: {
  type: AssessmentType;
  title: string;
  subtitle: string;
  durationSeconds: number;
  questions: AssessmentQuestion[];
}) {
  const configured = isSupabaseConfigured();
  const [phase, setPhase] = useState<Phase>("checking");
  const [demo, setDemo] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState("pre-camp-1");
  const [saved, setSaved] = useState<boolean | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (!configured) { setDemo(true); setPhase("intro"); return; }
    let alive = true;
    void createClient().auth.getUser().then(({ data: { user }, error }) => {
      if (!alive) return;
      if (error) setPhase("auth-error");
      else setPhase(user ? "intro" : "signed-out");
    });
    return () => { alive = false; };
  }, [configured]);

  useEffect(() => {
    if (phase !== "taking") return;
    const timer = window.setInterval(() => setSecondsLeft((remaining) => {
      if (remaining <= 1) { window.clearInterval(timer); return 0; }
      return remaining - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const finish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    setPhase("saving");
    const points = questions.reduce((sum, question) => sum + (answers[question.id] === question.correctIndex ? 1 : 0), 0);
    const readiness = getReadinessStage(points, questions.length);
    setScore(points);
    setStage(readiness);
    if (demo) { setSaved(false); setPhase("review"); return; }

    const { data: { user }, error: authError } = await createClient().auth.getUser();
    if (authError || !user) { setSaved(false); setPhase("review"); return; }
    const { error } = await createClient().from("assessment_attempts").insert({
      user_id: user.id,
      assessment_type: type,
      score: points,
      total_questions: questions.length,
      duration_seconds: durationSeconds - secondsLeft,
      readiness_stage: readiness,
    });
    setSaved(!error);
    setPhase("review");
  }, [answers, demo, durationSeconds, questions, secondsLeft, type]);

  useEffect(() => {
    if (phase === "taking" && secondsLeft === 0) void finish();
  }, [finish, phase, secondsLeft]);

  const start = () => {
    setCurrent(0);
    setAnswers({});
    setSecondsLeft(durationSeconds);
    setSaved(null);
    finished.current = false;
    setPhase("taking");
  };

  const formattedTime = `${Math.floor(secondsLeft / 60).toString().padStart(2, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`;
  const activeQuestion = questions[current];
  const minutes = Math.ceil(durationSeconds / 60);

  return <PageFrame active={type === "mock_exam" ? "/mock-exam" : "/dashboard"}><main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
    <Link href={type === "mock_exam" ? "/dashboard" : "/"} className="inline-flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--ink)]"><ArrowLeft size={14}/>{type === "mock_exam" ? "กลับห้องเรียน" : "กลับหน้าแรก"}</Link>
    <div className="mt-6 border-b border-[var(--line)] pb-6"><p className="eyebrow">{type === "mock_exam" ? "TIMED PRACTICE" : "STARTING POINT"}</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">{subtitle}</p></div>

    {phase === "checking" && <p className="py-14 text-center text-sm text-[var(--muted)]">กำลังตรวจสอบบัญชี…</p>}
    {phase === "signed-out" && <div className="py-14 text-center"><ShieldCheck size={26} className="mx-auto text-[var(--accent)]"/><h2 className="mt-4 text-lg font-semibold">เข้าสู่ระบบก่อนเริ่มทำแบบทดสอบ</h2><p className="mt-2 text-sm text-[var(--muted)]">ผลลัพธ์จะถูกบันทึกในบัญชีของคุณ</p><Link href={`/login?next=/${type === "mock_exam" ? "mock-exam" : "diagnostic"}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">ไปหน้าเข้าสู่ระบบ <ArrowRight size={15}/></Link></div>}
    {phase === "auth-error" && <div role="alert" className="my-10 border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-4 py-4 text-sm"><p>ตรวจสอบบัญชี Supabase ไม่สำเร็จ กรุณาลองอีกครั้งหรือเข้าสู่ระบบใหม่</p><div className="mt-3 flex gap-4 text-xs font-semibold"><button type="button" onClick={() => window.location.reload()} className="text-[var(--accent)] underline">ลองอีกครั้ง</button><Link href={`/login?next=/${type === "mock_exam" ? "mock-exam" : "diagnostic"}`} className="text-[var(--accent)] underline">ไปหน้าเข้าสู่ระบบ</Link></div></div>}

    {phase === "intro" && <section className="py-7">
      <div className="grid gap-5 border-b border-[var(--line)] pb-6 sm:grid-cols-3">
        <div><p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">จำนวนข้อ</p><p className="mt-1 text-base font-semibold">{questions.length} ข้อ</p></div>
        <div><p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">เวลา</p><p className="mt-1 text-base font-semibold">{minutes} นาที</p></div>
        <div><p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">สาขา</p><p className="mt-1 text-base font-semibold">Mechanics · Thermal · E&amp;M</p></div>
      </div>
      <p className="mt-5 flex items-start gap-2 text-xs leading-6 text-[var(--muted)]"><CircleHelp size={14} className="mt-1 shrink-0 text-[var(--copper)]"/>แบบประเมินนี้ใช้แนะนำเส้นทางการเรียน ระดับที่ได้เป็นเกณฑ์ภายใน ไม่ใช่คุณวุฒิหรือผลคัดเลือก POSN{type === "mock_exam" ? " · ส่งคำตอบเพื่อดูเฉลยได้ทุกเมื่อ เวลาเหลือศูนย์ระบบจะส่งคำตอบให้อัตโนมัติ" : " · ใช้เวลาประมาณ 5 นาที"}</p>
      {demo && <p className="mt-4 border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-3 py-2 text-xs text-[var(--muted)]">โหมดตัวอย่าง · สามารถทดลองทำข้อสอบได้ แต่ผลจะไม่ถูกบันทึกในบัญชี</p>}
      <button type="button" onClick={start} className="button-primary mt-7">เริ่มทำแบบทดสอบ <ArrowRight size={16}/></button>
    </section>}

    {phase === "taking" && activeQuestion && <section className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-[var(--line)] pb-4"><p className="text-xs text-[var(--muted)]">ข้อ {current + 1} จาก {questions.length}</p><p aria-live="off" className={`inline-flex items-center gap-2 font-mono text-sm font-semibold ${secondsLeft < 60 ? "text-[#A54932]" : "text-[var(--ink)]"}`}><Clock3 size={15}/>{formattedTime}</p></div>
      <div className="mb-6 h-1 w-full bg-[#E7EBE6]"><div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }}/></div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">{current + 1 < 4 ? "CORE CONCEPTS" : "APPLICATION"}</p>
      <h2 className="mt-3 text-lg font-semibold leading-8">{activeQuestion.prompt}</h2>
      <fieldset className="mt-5 space-y-2"><legend className="sr-only">เลือกคำตอบหนึ่งข้อ</legend>{activeQuestion.options.map((option, index) => <label key={option} className={`flex cursor-pointer items-center gap-3 border px-3.5 py-3 text-sm leading-6 transition ${answers[activeQuestion.id] === index ? "border-[var(--accent)] bg-[var(--soft)]" : "border-[var(--line)] bg-white hover:border-[#AABDB5]"}`}><input type="radio" name={activeQuestion.id} value={index} checked={answers[activeQuestion.id] === index} onChange={() => setAnswers((previous) => ({ ...previous, [activeQuestion.id]: index }))} className="accent-[var(--accent)]"/><span>{option}</span></label>)}</fieldset>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)} className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 py-2.5 text-xs font-semibold disabled:opacity-40"><ArrowLeft size={14}/>ก่อนหน้า</button>{current < questions.length - 1 ? <button type="button" onClick={() => setCurrent((value) => value + 1)} className="button-primary">ข้อถัดไป <ArrowRight size={15}/></button> : <button type="button" onClick={() => void finish()} className="button-primary">ส่งคำตอบ <Check size={15}/></button>}</div>
      <p className="mt-4 text-[10px] text-[var(--muted)]">ตอบแล้ว {Object.keys(answers).length} / {questions.length} ข้อ</p>
    </section>}

    {phase === "saving" && <p className="py-14 text-center text-sm text-[var(--muted)]">กำลังบันทึกผลแบบทดสอบ…</p>}
    {phase === "review" && <section className="py-7">
      <div className="border-l-2 border-[var(--accent)] pl-4"><p className="text-xs text-[var(--muted)]">คะแนนของคุณ</p><p className="mt-1 text-3xl font-semibold">{score} <span className="text-lg font-normal text-[var(--muted)]">/ {questions.length}</span></p><p className="mt-2 text-sm">Readiness stage · <b>{getStageLabel(stage)}</b></p><p className="mt-1 text-[10px] text-[var(--muted)]">เกณฑ์ภายในเพื่อช่วยวางแผน ไม่ใช่คุณวุฒิ POSN</p></div>
      <p className={`mt-5 border-l-2 px-3 py-2 text-xs leading-6 ${saved ? "border-[var(--accent)] bg-[var(--soft)] text-[var(--ink)]" : "border-[var(--copper)] bg-[#F5F1E9] text-[var(--muted)]"}`}>{demo ? "โหมดตัวอย่าง · ผลนี้ไม่ถูกบันทึกในบัญชี" : saved ? "บันทึกผลไว้ในบัญชี Supabase แล้ว" : "แสดงคะแนนจากการทำครั้งนี้ แต่ Supabase ยังไม่ได้ยืนยันการบันทึกผล"}</p>
      <div className="mt-8"><h2 className="text-base font-semibold">เฉลยและคำอธิบาย</h2><div className="mt-3 divide-y divide-[var(--line)]">{questions.map((question, index) => { const correct = answers[question.id] === question.correctIndex; return <article key={question.id} className="py-4"><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${correct ? "bg-[var(--soft)] text-[var(--accent)]" : "bg-[#F5F1E9] text-[var(--copper)]"}`}>{correct ? <Check size={12}/> : <span className="text-[10px]">{index + 1}</span>}</span><div><h3 className="text-sm font-medium">{question.prompt}</h3><p className="mt-1 text-xs leading-6 text-[var(--muted)]">คำตอบ: {question.options[question.correctIndex]} · {question.explanation}</p></div></div></article>; })}</div></div>
      <div className="mt-7 flex flex-wrap gap-3"><Link href={type === "mock_exam" ? "/dashboard" : "/dashboard"} className="button-primary">ไปห้องเรียน <ArrowRight size={15}/></Link><button type="button" onClick={start} className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 py-3 text-xs font-semibold"><RotateCcw size={14}/>ทำอีกครั้ง</button><Link href="/skill-tree" className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 py-3 text-xs font-semibold">ดู Skill Tree <ArrowRight size={14}/></Link></div>
    </section>}
  </main></PageFrame>;
}
