"use client";
import { useCallback, useEffect, useState } from "react";
import { classroomClient } from "@/lib/classroom-browser";
import { parseDriveFileId } from "@/lib/drive-link";
import { formatStudyTime, type CourseDefinition } from "@/lib/course-catalog";

type Level = { number: number; title: string; duration_minutes: number | null };
type Item = { id: string; title: string; kind: "video" | "sheet" | "homework"; drive_file_id: string | null; duration_minutes: number | null; recommended_minutes: number | null; instructions: string; sort_order: number; answer_file_id: string | null; solution_file_id: string | null };
const kinds = { video: "วิดีโอ", sheet: "ชีท / เอกสาร", homework: "HW" };
const inputClass = "mt-2 w-full rounded-lg border border-[var(--line)] bg-white p-3 text-sm";

export function ClassroomContent({ courses, onChanged }: { courses: CourseDefinition[]; onChanged: () => Promise<void> }) {
  const [courseId, setCourseId] = useState("pre-posn");
  const [level, setLevel] = useState(1);
  const [levels, setLevels] = useState<Level[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [levelTitle, setLevelTitle] = useState("");
  const [levelDuration, setLevelDuration] = useState("");
  const [count, setCount] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Item["kind"]>("video");
  const [link, setLink] = useState("");
  const [answerLink, setAnswerLink] = useState("");
  const [solutionLink, setSolutionLink] = useState("");
  const [duration, setDuration] = useState("");
  const [recommended, setRecommended] = useState("");
  const [instructions, setInstructions] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const client = classroomClient();
    const [levelResult, itemResult] = await Promise.all([
      client.from("classroom_levels").select("number,title,duration_minutes").eq("course_id", courseId).order("number"),
      client.from("classroom_items").select("*").eq("course_id", courseId).eq("level_number", level).order("sort_order"),
    ]);
    if (levelResult.error || itemResult.error) setMessage("โหลดเนื้อหาไม่ได้ กรุณาลองใหม่");
    else {
      const next = (levelResult.data ?? []) as Level[];
      setLevels(next); setItems((itemResult.data ?? []) as Item[]);
      const current = next.find((row) => row.number === level);
      setLevelTitle(current?.title ?? ""); setLevelDuration(current?.duration_minutes?.toString() ?? "");
    }
    setLoading(false);
  }, [courseId, level]);
  useEffect(() => { void load(); }, [load]);
  function reset() { setAnswerLink(""); setSolutionLink(""); setEditing(null); setTitle(""); setLink(""); setDuration(""); setRecommended(""); setInstructions(""); }
  function minutes(value: string) { return value.trim() ? Number(value) : null; }
  async function initializeCourse(event: React.FormEvent) {
    event.preventDefault(); const amount = Number(count);
    if (!Number.isInteger(amount) || amount < 1 || amount > 200) return;
    setBusy(true); setMessage("");
    try {
      const { error } = await classroomClient().from("classroom_levels").insert(Array.from({ length: amount }, (_, i) => ({ course_id: courseId, number: i + 1, title: `Level ${i + 1} · รอรายละเอียด` })));
      if (error) throw error;
      const result = await classroomClient().from("classroom_courses").update({ level_count: amount }).eq("id", courseId);
      if (result.error) throw result.error;
      await load(); await onChanged(); setMessage(`เตรียม ${amount} เลเวลแล้ว เพิ่มบทเรียนได้เลย`);
    } catch { setMessage("เตรียมเลเวลไม่ได้ กรุณารีเฟรชแล้วลองใหม่"); }
    finally { setBusy(false); }
  }
  async function saveLevel(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const { error } = await classroomClient().from("classroom_levels").update({ title: levelTitle.trim(), duration_minutes: minutes(levelDuration) }).eq("course_id", courseId).eq("number", level);
      if (error) throw error;
      await onChanged(); setMessage("บันทึกชื่อบทและเวลาแล้ว");
    } catch { setMessage("บันทึกหัวข้อไม่ได้ กรุณาลองใหม่"); }
    finally { setBusy(false); }
  }
  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    const driveId = parseDriveFileId(link);
    if (!driveId) { setMessage("กรุณาแปะลิงก์ไฟล์จาก Google Drive หรือ Google Docs ที่ถูกต้อง ไม่ใช่ลิงก์โฟลเดอร์"); return; }
    const answerId = answerLink.trim() ? parseDriveFileId(answerLink) : null;
    const solutionId = solutionLink.trim() ? parseDriveFileId(solutionLink) : null;
    if (kind !== "video" && ((answerLink.trim() && !answerId) || (solutionLink.trim() && !solutionId))) { setMessage("กรุณาใส่ลิงก์เฉลย Google Drive ที่ถูกต้อง"); return; }
    setBusy(true); setMessage("");
    try {
      const old = items.find((row) => row.id === editing);
      const { error } = await classroomClient().from("classroom_items").upsert({
        id: editing ?? `item_${crypto.randomUUID().replace(/-/g, "")}`, course_id: courseId, level_number: level,
        answer_file_id: kind === "video" ? null : answerId, solution_file_id: kind === "video" ? null : solutionId, title: title.trim(), kind, drive_file_id: driveId, duration_minutes: minutes(duration), recommended_minutes: minutes(recommended), instructions: instructions.trim(), sort_order: old?.sort_order ?? Math.max(0, ...items.map((row) => row.sort_order)) + 1,
      });
      if (error) throw error;
      reset(); await load(); setMessage(editing ? "แก้ไขรายการแล้ว" : "เพิ่มรายการแล้ว นักเรียนที่มีสิทธิ์จะเห็นทันที");
    } catch { setMessage("บันทึกรายการไม่ได้ กรุณาตรวจข้อมูลและลองใหม่"); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8"><p className="eyebrow">CLASSROOM CONTENT</p><h1 className="mt-3 text-3xl font-semibold">เพิ่มชีท วิดีโอ และการบ้าน</h1><p className="mt-3 text-sm leading-7 text-[var(--muted)]">เลือกคอร์สกับเลเวล แล้ววางลิงก์ Google Drive นักเรียนจะเห็นเฉพาะเนื้อหาที่ได้รับสิทธิ์</p>
    <div className="mt-6 grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 sm:grid-cols-2"><label className="text-xs font-medium">คอร์ส<select value={courseId} disabled={busy} onChange={(e) => { setCourseId(e.target.value); setLevel(1); setMessage(""); reset(); }} className={inputClass}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label className="text-xs font-medium">เลเวล<select value={level} disabled={busy || !levels.length} onChange={(e) => { setLevel(Number(e.target.value)); setMessage(""); reset(); }} className={inputClass}>{levels.length ? levels.map((row) => <option key={row.number} value={row.number}>Level {row.number} — {row.title}</option>) : <option value={1}>ยังไม่มีเลเวล</option>}</select></label></div>
    {message && <p role="status" className="mt-5 rounded-xl bg-[var(--soft)] p-4 text-sm leading-7">{message}</p>}
    {loading ? <p className="py-10 text-sm text-[var(--muted)]">กำลังโหลดเนื้อหา…</p> : !levels.length ? <form onSubmit={initializeCourse} className="mt-6 max-w-lg rounded-2xl border border-[var(--line)] bg-white p-6"><h2 className="font-semibold">เตรียมเลเวลของคอร์สนี้ก่อน</h2><label className="mt-4 block text-xs">จำนวนเลเวล<input required type="number" min={1} max={200} value={count} onChange={(e) => setCount(e.target.value)} className={inputClass}/></label><button disabled={busy} className="button-primary mt-4">{busy ? "กำลังเตรียม…" : "สร้างเลเวล"}</button></form> : <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.1fr_.9fr]"><div className="space-y-6">
      <form onSubmit={saveLevel} className="rounded-2xl border border-[var(--line)] bg-white p-6"><h2 className="font-semibold">หัวข้อ Level {level}</h2><label className="mt-4 block text-xs">ชื่อหัวข้อ<input required maxLength={200} value={levelTitle} onChange={(e) => setLevelTitle(e.target.value)} className={inputClass}/></label><label className="mt-4 block text-xs">เวลารวมของเลเวล (นาที · เว้นไว้ได้)<input type="number" min={1} max={60000} value={levelDuration} onChange={(e) => setLevelDuration(e.target.value)} className={inputClass}/></label><button disabled={busy} className="mt-4 rounded-lg border border-[var(--line)] px-4 py-3 text-xs font-semibold">บันทึกหัวข้อ</button></form>
      <form onSubmit={saveItem} className="rounded-2xl border border-[var(--line)] bg-white p-6"><h2 className="font-semibold">{editing ? "แก้ไขรายการเรียน" : "เพิ่มรายการเรียน"}</h2><label className="mt-4 block text-xs">ประเภท<select value={kind} onChange={(e) => setKind(e.target.value as Item["kind"])} className={inputClass}>{Object.entries(kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="mt-4 block text-xs">ชื่อรายการ<input required maxLength={500} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น วิดีโอ 1 — การเคลื่อนที่แนวตรง" className={inputClass}/></label><label className="mt-4 block text-xs">ลิงก์ไฟล์ Google Drive<input required type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/file/d/.../view" className={inputClass}/></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs">ความยาว / เวลาทำ (นาที)<input type="number" min={1} max={60000} value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass}/></label><label className="text-xs">เวลาแนะนำ (นาที)<input type="number" min={1} max={60000} value={recommended} onChange={(e) => setRecommended(e.target.value)} className={inputClass}/></label></div>{kind !== "video" && <fieldset className="mt-5 rounded-xl border border-[var(--line)] p-4"><legend className="px-2 text-sm font-semibold">เฉลย · เปิดดูได้ทันที</legend><label className="block text-xs">Answer only (เว้นไว้ได้)<input type="url" value={answerLink} onChange={(e) => setAnswerLink(e.target.value)} className={inputClass}/></label><label className="mt-4 block text-xs">Full solution (เว้นไว้ได้)<input type="url" value={solutionLink} onChange={(e) => setSolutionLink(e.target.value)} className={inputClass}/></label></fieldset>}<label className="mt-4 block text-xs">คำแนะนำเพิ่มเติม<textarea maxLength={5000} rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} className={inputClass}/></label><p className="mt-3 text-[11px] leading-6 text-[var(--muted)]">ต้องตั้งสิทธิ์แชร์ใน Google Drive ให้นักเรียนด้วย การเปิดคอร์สในเว็บไม่เปลี่ยนสิทธิ์ไฟล์ Google</p><div className="mt-5 flex gap-4"><button disabled={busy} className="button-primary disabled:opacity-50">{busy ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}</button>{editing && <button type="button" onClick={reset} className="text-xs">ยกเลิก</button>}</div></form>
    </div><section className="rounded-2xl border border-[var(--line)] bg-white p-6"><h2 className="font-semibold">รายการใน Level {level} ({items.length})</h2>{!items.length && <p className="mt-5 text-sm leading-7 text-[var(--muted)]">ยังไม่มีรายการ เพิ่มวิดีโอหรือชีทแรกได้เลย</p>}<div className="mt-4 divide-y divide-[var(--line)]">{items.map((item) => <article key={item.id} className="py-5"><p className="text-[10px] font-semibold text-[var(--accent)]">{kinds[item.kind]}</p><h3 className="mt-2 text-sm font-semibold">{item.title}</h3><p className="mt-2 text-xs text-[var(--muted)]">{formatStudyTime(item.duration_minutes)}</p><p className="mt-2 whitespace-pre-line text-xs leading-6 text-[var(--muted)]">{item.instructions}</p><div className="mt-3 flex gap-5 text-xs"><button onClick={() => { setAnswerLink(item.answer_file_id ? `https://drive.google.com/file/d/${item.answer_file_id}/view` : ""); setSolutionLink(item.solution_file_id ? `https://drive.google.com/file/d/${item.solution_file_id}/view` : ""); setEditing(item.id); setTitle(item.title); setKind(item.kind); setLink(item.drive_file_id ? `https://drive.google.com/file/d/${item.drive_file_id}/view` : ""); setDuration(item.duration_minutes?.toString() ?? ""); setRecommended(item.recommended_minutes?.toString() ?? ""); setInstructions(item.instructions); setMessage(""); }} className="font-semibold text-[var(--accent)] underline">แก้ไข</button>{item.drive_file_id && <a href={`https://drive.google.com/file/d/${item.drive_file_id}/view`} target="_blank" rel="noreferrer" className="text-[var(--muted)] underline">ตรวจไฟล์ต้นฉบับ ↗</a>}</div></article>)}</div></section></div>}
  </main>;
}
