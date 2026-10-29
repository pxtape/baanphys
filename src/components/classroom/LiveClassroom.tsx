"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { classroomClient, loadClassroom, loadClassroomStudents } from "@/lib/classroom-browser";
import type { StudentRecord } from "@/lib/course-catalog";
import {StudentProfile} from "./StudentProfile";
import { StudentClassroom } from "./StudentClassroom";
import {StudentAdminHub} from "./StudentAdminHub";
import {CalendarOverview} from "./CalendarOverview";
import { TutorCalendar } from "./TutorCalendar";
import { ClassroomContent } from "./ClassroomContent";

export function LiveClassroom({ admin = false, content = false, calendar = false, studentCalendar = false, studentProfile = false }: { admin?: boolean; content?: boolean; calendar?: boolean; studentCalendar?:boolean;studentProfile?:boolean }) {
  const router = useRouter();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadClassroom>>>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [error, setError] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const next = await loadClassroom();
      if (!next) { router.replace("/login"); return; }
      if (admin && next.role !== "admin") { router.replace("/courses"); return; }
      if (admin) setStudents(await loadClassroomStudents());
      setData(next); setError("");
    } catch { setError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่"); }
  }, [admin, router]);
  useEffect(() => { void refresh(); const focus = () => void refresh(); window.addEventListener("focus", focus); return () => window.removeEventListener("focus", focus); }, [refresh]);
  async function setSelfAccess(courseId: string, level: number) {
    if (accessBusy) return;
    setAccessBusy(true); setError("");
    try {
      const result = await classroomClient().rpc("classroom_set_self_access", { p_course_id: courseId, p_level: level });
      if (result.error) throw result.error;
      await refresh();
    } catch { setError("ปรับสิทธิ์ทดลองเรียนไม่ได้ กรุณาลองใหม่"); }
    finally { setAccessBusy(false); }
  }
  async function signOut() { await classroomClient().auth.signOut(); router.replace("/login"); }
  if (!data) return <main className="flex min-h-screen items-center justify-center p-6"><div className="text-center"><p>{error || "กำลังเปิดห้องเรียน…"}</p>{error && <button onClick={() => void refresh()} className="button-primary mt-5">ลองใหม่</button>}<Link href="/login" className="mt-5 block text-xs underline">กลับหน้าเข้าสู่ระบบ</Link></div></main>;
  return <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-5 py-3 text-xs"><span>บ้านฟิสิกส์ · เวอร์ชันทดลอง · {data.user.displayName}</span><nav className="flex flex-wrap items-center gap-4"><Link href="/courses">{data.role === "admin" ? "ดูแบบนักเรียน / สิทธิ์ตัวเอง" : "ห้องเรียน"}</Link><Link href="/profile">โปรไฟล์ของฉัน</Link><Link href="/calendar">ปฏิทินของฉัน</Link>{data.role === "admin" && <><Link href="/admin/students" className="font-semibold text-[var(--accent)]">นักเรียน</Link><Link href="/admin/calendar" className="font-semibold text-[var(--accent)]">ปฏิทินติวเตอร์</Link><Link href="/admin/content" className="font-semibold text-[var(--accent)]">ชีท / วิดีโอ / HW</Link></>}<button onClick={() => void refresh()} className="underline">รีเฟรช</button><button onClick={() => void signOut()} className="text-[var(--muted)]">ออกจากระบบ</button></nav></div>{error && <p role="alert" className="bg-amber-50 p-3 text-center text-xs">{error}</p>}{admin ? calendar ? <TutorCalendar tutorId={data.user.id} students={students} courses={data.courses}/> : content ? <ClassroomContent courses={data.courses} onChanged={refresh}/> : <StudentAdminHub students={students} courses={data.courses} tutorId={data.user.id} onChanged={refresh}/> : studentProfile ? <StudentProfile {...data} onChanged={refresh} items={data.items.filter(item=>data.enrollments.some(e=>e.courseId===item.courseId&&item.levelNumber<=e.unlockedLevel))}/> : studentCalendar ? <CalendarOverview userId={data.user.id}/> : <>{data.role === "admin" && <section aria-label="สิทธิ์ทดลองเรียนของแอดมิน" className="mx-auto my-5 max-w-6xl rounded-xl border border-teal-200 bg-teal-50 p-5"><h2 className="font-semibold">ดูแบบนักเรียน · บัญชีของฉัน</h2><p className="mt-2 text-sm leading-7">เลือกสิทธิ์คอร์สและเลเวลของตัวเองเพื่อทดลองเรียน คอร์สและเลเวลที่ยังไม่เปิดจะถูกล็อกเหมือนฝั่งนักเรียน สิทธิ์แอดมินยังอยู่ และการติ๊กงานจะบันทึกเฉพาะบัญชีคุณ</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{data.courses.map(course => <label key={course.id} className="text-sm font-medium">{course.title}<select aria-label={`สิทธิ์ของฉัน ${course.title}`} disabled={accessBusy || !course.levelCount} value={data.enrollments.find(e => e.courseId === course.id)?.unlockedLevel ?? 0} onChange={event => void setSelfAccess(course.id, Number(event.target.value))} className="mt-2 w-full rounded-lg border border-teal-200 bg-white p-3"><option value={0}>{course.levelCount ? "ยังไม่ลงเรียน / ล็อกคอร์ส" : "รอเตรียมหลักสูตร"}</option>{Array.from({length:course.levelCount ?? 0},(_,i)=><option key={i+1} value={i+1}>เปิดถึง Level {i+1}</option>)}</select></label>)}</div><p role="status" className="mt-3 text-xs text-teal-800">{accessBusy ? "กำลังบันทึกสิทธิ์…" : "เปลี่ยนสิทธิ์ได้ทันที รายชื่อคุณจะปรากฏในหลังบ้านเมื่อเปิดใช้ครั้งแรก"}</p><Link href="/admin/students" className="mt-4 inline-block text-sm font-semibold underline">กลับหลังบ้าน →</Link></section>}<StudentClassroom {...data} items={data.role === "admin" ? data.items.filter(item => data.enrollments.some(e => e.courseId === item.courseId && item.levelNumber <= e.unlockedLevel)) : data.items} directDrive/></>}</>;
}
