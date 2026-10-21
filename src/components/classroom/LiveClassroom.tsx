"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { classroomClient, loadClassroom, loadClassroomStudents } from "@/lib/classroom-browser";
import type { StudentRecord } from "@/lib/course-catalog";
import { StudentClassroom } from "./StudentClassroom";
import { ClassroomAdmin } from "./ClassroomAdmin";
import { ClassroomContent } from "./ClassroomContent";

export function LiveClassroom({ admin = false, content = false }: { admin?: boolean; content?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadClassroom>>>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [error, setError] = useState("");
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
  async function signOut() { await classroomClient().auth.signOut(); router.replace("/login"); }
  if (!data) return <main className="flex min-h-screen items-center justify-center p-6"><div className="text-center"><p>{error || "กำลังเปิดห้องเรียน…"}</p>{error && <button onClick={() => void refresh()} className="button-primary mt-5">ลองใหม่</button>}<Link href="/login" className="mt-5 block text-xs underline">กลับหน้าเข้าสู่ระบบ</Link></div></main>;
  return <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-5 py-3 text-xs"><span>บ้านฟิสิกส์ · เวอร์ชันทดลอง · {data.user.displayName}</span><nav className="flex flex-wrap items-center gap-4"><Link href="/courses">ห้องเรียน</Link>{data.role === "admin" && <><Link href="/admin/students" className="font-semibold text-[var(--accent)]">นักเรียน</Link><Link href="/admin/content" className="font-semibold text-[var(--accent)]">ชีท / วิดีโอ / HW</Link></>}<button onClick={() => void refresh()} className="underline">รีเฟรช</button><button onClick={() => void signOut()} className="text-[var(--muted)]">ออกจากระบบ</button></nav></div>{error && <p role="alert" className="bg-amber-50 p-3 text-center text-xs">{error}</p>}{admin ? content ? <ClassroomContent courses={data.courses} onChanged={refresh}/> : <ClassroomAdmin students={students} courses={data.courses}/> : <StudentClassroom {...data} directDrive/>}</>;
}
