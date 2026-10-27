"use client";

import Link from "next/link";
import { StudentPlanEditor } from "./StudyDashboard";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Check, ChevronRight, GraduationCap, LockKeyhole, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { advanceClassroomStudent, enrollClassroomStudent, revokeClassroomEnrollment } from "@/app/courses/actions";
import { createClassroomStudent } from "@/app/admin/students/actions";
import { COURSES, DEMO_COMPLETED_ITEM_IDS, DEMO_ITEMS, type CourseDefinition, type CourseId, type Enrollment, type StudentRecord } from "@/lib/course-catalog";

type Props = { demo?: boolean; students: StudentRecord[]; setupRequired?: boolean; courses?: CourseDefinition[] };

export function ClassroomAdmin({ demo = false, students: initialStudents, setupRequired = false, courses = COURSES }: Props) {
  const [students, setStudents] = useState(initialStudents);
  const [selectedId, setSelectedId] = useState(initialStudents[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const selected = students.find((student) => student.id === selectedId);
  const visible = students.filter((student) => `${student.displayName} ${student.username}`.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => { if (!demo) setStudents(initialStudents); }, [demo, initialStudents]);

  const refreshDemo = useCallback(() => {
    if (!demo) return;
    try {
      const created: StudentRecord[] = JSON.parse(localStorage.getItem("baanphys:demo:students") ?? "[]");
      setStudents([...initialStudents, ...created].map((student) => {
        const stored = localStorage.getItem(`baanphys:demo:enrollments:${student.id}`);
        return { ...student, enrollments: stored ? JSON.parse(stored) as Enrollment[] : student.enrollments };
      }));
      const storedCompleted = localStorage.getItem(`baanphys:demo:completed:${selectedId}`);
      setCompleted(storedCompleted ? JSON.parse(storedCompleted) as string[] : selectedId === "demo-student-001" ? DEMO_COMPLETED_ITEM_IDS : []);
    } catch { setMessage("อ่านข้อมูลตัวอย่างไม่ได้ ลองรีเฟรชหน้านี้"); }
  }, [demo, initialStudents, selectedId]);

  useEffect(() => {
    refreshDemo();
    window.addEventListener("storage", refreshDemo);
    window.addEventListener("focus", refreshDemo);
    window.addEventListener("baanphys:demo:update", refreshDemo);
    return () => {
      window.removeEventListener("storage", refreshDemo);
      window.removeEventListener("focus", refreshDemo);
      window.removeEventListener("baanphys:demo:update", refreshDemo);
    };
  }, [refreshDemo]);

  function saveDemoEnrollments(student: StudentRecord, enrollments: Enrollment[]) {
    localStorage.setItem(`baanphys:demo:enrollments:${student.id}`, JSON.stringify(enrollments));
    setStudents((previous) => previous.map((row) => row.id === student.id ? { ...row, enrollments } : row));
    window.dispatchEvent(new Event("baanphys:demo:update"));
  }

  async function changeEnrollment(courseId: CourseId, operation: "enroll" | "advance" | "revoke") {
    if (!selected || busy || setupRequired) return;
    setMessage("");
    const enrollment = selected.enrollments.find((row) => row.courseId === courseId);
    const course = courses.find((row) => row.id === courseId)!;
    if (operation === "enroll" && course.levelCount === null) {
      setMessage("คอร์สนี้รอรายละเอียดหลักสูตร ก่อนเปิดให้นักเรียนเรียน"); return;
    }
    if (demo) {
      try {
        if (operation === "enroll") {
          saveDemoEnrollments(selected, [...selected.enrollments, { studentId: selected.id, courseId, unlockedLevel: 1 }]);
          setMessage(`เปิด ${course.title} ให้ ${selected.displayName} แล้ว · ข้อมูลตัวอย่าง`);
        } else if (operation === "revoke") {
          saveDemoEnrollments(selected, selected.enrollments.filter((row) => row.courseId !== courseId));
          setMessage(`ปิดสิทธิ์ ${course.title} แล้ว · ข้อมูลตัวอย่าง`);
        } else if (enrollment) {
          const tasks = DEMO_ITEMS.filter((item) => item.courseId === courseId && item.levelNumber === enrollment.unlockedLevel);
          if (!tasks.length || tasks.some((item) => !completed.includes(item.id))) {
            setMessage(`Level ${enrollment.unlockedLevel} ยังทำรายการไม่ครบ ให้ลองติ๊กวิดีโอและ HW ในหน้าตัวอย่างนักเรียนก่อน`); return;
          }
          if (enrollment.unlockedLevel >= (course.levelCount ?? 0)) { setMessage("เปิดครบทุกเลเวลแล้ว"); return; }
          saveDemoEnrollments(selected, selected.enrollments.map((row) => row.courseId === courseId ? { ...row, unlockedLevel: row.unlockedLevel + 1 } : row));
          setMessage(`ปลดล็อก Level ${enrollment.unlockedLevel + 1} ให้ ${selected.displayName} แล้ว · ข้อมูลตัวอย่าง`);
        }
      } catch { setMessage("บันทึกตัวอย่างไม่ได้ เบราว์เซอร์อาจปิดการจัดเก็บข้อมูล"); }
      return;
    }
    setBusy(true);
    try {
      const action = operation === "enroll" ? enrollClassroomStudent : operation === "advance" ? advanceClassroomStudent : revokeClassroomEnrollment;
      const result = await action(selected.id, courseId);
      if (result.error) { setMessage(result.error); return; }
      const next = operation === "enroll" ? [...selected.enrollments, { studentId: selected.id, courseId, unlockedLevel: 1 }]
        : operation === "revoke" ? selected.enrollments.filter((row) => row.courseId !== courseId)
        : selected.enrollments.map((row) => row.courseId === courseId ? { ...row, unlockedLevel: row.unlockedLevel + 1 } : row);
      setStudents((previous) => previous.map((student) => student.id === selected.id ? { ...student, enrollments: next } : student));
      setMessage(operation === "advance" ? `ปลดล็อก Level ${(enrollment?.unlockedLevel ?? 0) + 1} แล้ว` : operation === "enroll" ? "เปิดสิทธิ์คอร์สแล้ว" : "ปิดสิทธิ์คอร์สแล้ว");
    } catch { setMessage("บันทึกไม่สำเร็จ กรุณาลองใหม่"); }
    finally { setBusy(false); }
  }

  async function createStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || setupRequired) return;
    setBusy(true); setMessage("");
    try {
      if (demo) {
        const all = students.map((student) => student.username.toLowerCase());
        if (all.includes(username.trim().toLowerCase())) { setMessage("Username นี้มีอยู่ในตัวอย่างแล้ว"); return; }
        const student: StudentRecord = { id: `demo-${Date.now()}`, displayName: displayName.trim(), username: username.trim().toLowerCase(), enrollments: [] };
        const created = students.filter((row) => !initialStudents.some((original) => original.id === row.id));
        localStorage.setItem("baanphys:demo:students", JSON.stringify([...created, student]));
        setStudents((previous) => [...previous, student]); setSelectedId(student.id);
        setMessage("เพิ่มนักเรียนตัวอย่างแล้ว ยังไม่ได้สร้างบัญชีเข้าสู่ระบบจริง");
      } else {
        const result = await createClassroomStudent({ username, password, displayName });
        if (result.error || !result.student) { setMessage(result.error ?? "สร้างบัญชีไม่สำเร็จ"); return; }
        setStudents((previous) => [...previous, { ...result.student!, enrollments: [] }]);
        setSelectedId(result.student.id); setMessage("สร้างบัญชีนักเรียนแล้ว เลือกคอร์สที่ต้องการเปิดสิทธิ์ต่อได้เลย");
      }
      setPassword(""); setUsername(""); setDisplayName(""); setShowCreate(false);
    } catch { setMessage("สร้างบัญชีไม่สำเร็จ กรุณาลองใหม่"); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[var(--paper)]">
    {demo && <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-center text-xs leading-6 text-amber-900">โหมดตัวอย่าง · ข้อมูลจำลองเก็บเฉพาะเบราว์เซอร์นี้ ไม่มีบัญชีหรือสิทธิ์เรียนจริง <Link className="ml-3 underline underline-offset-4" href="/preview/classroom">ลองฝั่งนักเรียน →</Link></div>}
    <header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ink)] text-white"><BookOpen size={20}/></span><span><b className="block text-sm">บ้านฟิสิกส์</b><span className="text-[10px] tracking-widest text-[var(--muted)]">CLASSROOM ADMIN</span></span></Link>
      <div className="flex items-center gap-5 text-xs"><span className="flex items-center gap-2 text-[var(--accent)]"><ShieldCheck size={15}/>ผู้ดูแลระบบ</span><Link className="flex items-center gap-1 text-[var(--muted)] hover:underline" href={demo ? "/preview/classroom" : "/courses"}>ไปห้องเรียน <ArrowUpRight size={14}/></Link></div>
    </div></header>
    <div className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">TEACH AT YOUR OWN PACE</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">ดูแลทุกก้าวของนักเรียน</h1><p className="mt-3 text-sm leading-7 text-[var(--muted)]">เลือกนักเรียน → เลือกคอร์ส → กดปลดล็อกเลเวลถัดไป หลังพูดคุยกันทาง LINE</p></div><button onClick={() => setShowCreate(!showCreate)} disabled={setupRequired} className="button-primary disabled:opacity-50"><UserPlus size={16}/>เพิ่มนักเรียน</button></div>
      {setupRequired && <div role="status" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">ระบบบัญชีและฐานข้อมูลคอร์สยังไม่พร้อมใช้งานจริง ให้ตั้งค่าตามคู่มือในโฟลเดอร์ docs ก่อนเปิดให้นักเรียนเข้าเรียน <Link href="/preview/admin" className="ml-2 underline">ดูตัวอย่างหลังบ้าน</Link></div>}
      {message && <div role="status" aria-live="polite" className="mt-6 rounded-xl border border-teal-200 bg-teal-50 px-5 py-4 text-sm leading-7 text-teal-900">{message}</div>}
      {showCreate && <form onSubmit={createStudent} className="mt-6 grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-6 sm:grid-cols-3">
        <div className="sm:col-span-3"><h2 className="font-semibold">{demo ? "เพิ่มนักเรียนตัวอย่าง" : "สร้างบัญชีนักเรียน"}</h2><p className="mt-1 text-xs leading-6 text-[var(--muted)]">{demo ? "ใช้ลองจัดสิทธิ์เท่านั้น ไม่สร้างรหัสผ่านหรือบัญชีจริง" : "คุณเป็นผู้แจ้ง Username และรหัสเริ่มต้นให้นักเรียนเป็นรายคน"}</p></div>
        <label className="text-xs font-medium">ชื่อนักเรียน<input required maxLength={100} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-2 w-full rounded-lg border border-[var(--line)] p-3 text-sm"/></label>
        <label className="text-xs font-medium">Username<input required pattern="[a-zA-Z0-9._-]{3,40}" minLength={3} maxLength={40} autoComplete="off" placeholder="เช่น student001" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2 w-full rounded-lg border border-[var(--line)] p-3 text-sm"/></label>
        {!demo && <label className="text-xs font-medium">รหัสผ่านเริ่มต้น (12 ตัวขึ้นไป)<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-[var(--line)] p-3 text-sm"/></label>}
        <div className="flex gap-3 sm:col-span-3"><button disabled={busy} className="button-primary disabled:opacity-50">{busy ? "กำลังสร้าง…" : demo ? "เพิ่มข้อมูลตัวอย่าง" : "สร้างบัญชี"}</button><button type="button" className="px-4 text-sm text-[var(--muted)]" onClick={() => { setShowCreate(false); setPassword(""); }}>ยกเลิก</button></div>
      </form>}
      <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="self-start overflow-hidden rounded-2xl border border-[var(--line)] bg-white"><div className="border-b border-[var(--line)] p-5"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold"><Users size={16}/>นักเรียนทั้งหมด</h2><span className="rounded-full bg-[var(--soft)] px-2.5 py-1 text-xs text-[var(--accent)]">{students.length}</span></div><label className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--paper)] px-3 py-2.5"><Search size={15} className="text-[var(--muted)]"/><input aria-label="ค้นหานักเรียน" placeholder="ค้นหาชื่อหรือ Username" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-xs outline-none"/></label></div>
          <div className="max-h-[520px] overflow-y-auto p-2">{visible.map((student) => <button key={student.id} onClick={() => { setSelectedId(student.id); setMessage(""); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-4 text-left ${student.id === selectedId ? "bg-[var(--soft)]" : "hover:bg-[var(--paper)]"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[var(--accent)]">{student.displayName.slice(0, 1)}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm font-medium">{student.displayName}</b><small className="mt-1 block text-xs text-[var(--muted)]">@{student.username}</small></span><ChevronRight size={15} className="text-[var(--muted)]"/></button>)}{visible.length === 0 && <p className="p-5 text-sm text-[var(--muted)]">{students.length ? "ไม่พบนักเรียนที่ค้นหา" : "เพิ่มนักเรียนคนแรกเพื่อเริ่มจัดสิทธิ์"}</p>}</div>
        </aside>
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-7">
          {selected ? <><div className="flex items-center gap-4 border-b border-[var(--line)] pb-6"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--soft)] text-[var(--accent)]"><GraduationCap size={25}/></span><div><h2 className="text-xl font-semibold">{selected.displayName}</h2><p className="mt-1 text-xs text-[var(--muted)]">@{selected.username} · สิทธิ์คอร์สและเลเวล</p></div></div>
            {!demo && <StudentPlanEditor key={selected.id} userId={selected.id} courses={courses}/>}
              <div className="divide-y divide-[var(--line)]">{courses.map((course) => {
              const enrollment = selected.enrollments.find((row) => row.courseId === course.id);
              const tasks = demo && enrollment ? DEMO_ITEMS.filter((item) => item.courseId === course.id && item.levelNumber === enrollment.unlockedLevel) : [];
              const done = tasks.filter((item) => completed.includes(item.id)).length;
              const maxed = enrollment && course.levelCount !== null && enrollment.unlockedLevel >= course.levelCount;
              return <article key={course.id} className="py-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><h3 className="font-semibold">{course.title}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] ${enrollment ? "bg-[var(--soft)] text-[var(--accent)]" : "bg-gray-100 text-gray-500"}`}>{enrollment ? "เปิดสิทธิ์แล้ว" : "ยังไม่ลงเรียน"}</span></div><p className="mt-2 text-xs text-[var(--muted)]">{enrollment ? `เปิดถึง Level ${enrollment.unlockedLevel}${course.levelCount ? ` / ${course.levelCount}` : ""}` : course.levelCount ? "เริ่มต้นที่ Level 1 เมื่อเปิดสิทธิ์" : "รอรายละเอียดหลักสูตร"}</p></div>
              {enrollment ? <button disabled={busy || setupRequired} onClick={() => void changeEnrollment(course.id, "revoke")} className="text-xs text-[var(--muted)] underline underline-offset-4 disabled:opacity-50">ปิดสิทธิ์คอร์ส</button> : <button disabled={busy || setupRequired || course.levelCount === null} onClick={() => void changeEnrollment(course.id, "enroll")} className="flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--soft)] disabled:cursor-not-allowed disabled:opacity-40"><UserPlus size={14}/>เปิดสิทธิ์คอร์ส</button>}</div>
              {enrollment && <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[var(--paper)] p-4"><div><p className="text-xs font-medium">{maxed ? "เปิดครบทุกเลเวลแล้ว" : `เลเวลถัดไป: Level ${enrollment.unlockedLevel + 1}`}</p><p className="mt-1.5 text-[11px] leading-6 text-[var(--muted)]">{demo ? `รายการ Level ${enrollment.unlockedLevel}: ทำครบ ${done} / ${tasks.length} รายการ` : "ระบบตรวจว่ารายการเลเวลปัจจุบันครบก่อนปลดล็อก"}</p></div><button disabled={busy || setupRequired || Boolean(maxed)} onClick={() => void changeEnrollment(course.id, "advance")} className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-40">{maxed ? <Check size={14}/> : <LockKeyhole size={14}/>}{busy ? "กำลังบันทึก…" : maxed ? "ครบ 31 เลเวล" : `ปลดล็อก Level ${enrollment.unlockedLevel + 1}`}</button></div>}
              </article>;
            })}</div>
          </> : <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center text-[var(--muted)]"><Users size={32}/><p className="text-sm">เลือกหรือเพิ่มนักเรียนเพื่อจัดการสิทธิ์</p></div>}
        </section>
      </div>
      <p className="mt-6 flex items-start gap-2 text-xs leading-7 text-[var(--muted)]"><ShieldCheck size={15} className="mt-1.5 shrink-0"/>นักเรียนติ๊กรายการครบแล้วจะยังไม่ได้เลเวลถัดไป ต้องให้แอดมินปลดล็อกเองทุกครั้ง การพูดคุยกับติวเตอร์ทำผ่าน LINE ตามปกติ</p>
      <Link className="mt-6 inline-flex items-center gap-2 text-xs text-[var(--muted)] hover:underline" href="/"><ArrowLeft size={14}/>กลับหน้าแรก</Link>
    </div>
  </main>;
}
