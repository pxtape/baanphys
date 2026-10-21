"use client";

import { useActionState } from "react";
import { Check, Save } from "lucide-react";
import { reviewHomeworkAction, type HomeworkReviewState } from "@/app/teacher/reviews/actions";

const rubric = [
  ["scoreSetup", "setup", "การตั้งโจทย์ / แผนภาพ"],
  ["scorePrinciples", "principles", "หลักฟิสิกส์และสมการ"],
  ["scoreCalculation", "calculation", "การคำนวณและหน่วย"],
  ["scoreCommunication", "communication", "การอธิบายวิธีคิด"],
] as const;

export function ReviewHomeworkForm({ submissionId, initialScores, initialFeedback, initialPassed }: { submissionId: string; initialScores?: Record<string, number>; initialFeedback?: string; initialPassed?: boolean }) {
  const [state, action, pending] = useActionState<HomeworkReviewState, FormData>(reviewHomeworkAction, {});
  return <form action={action} className="mt-4 border-t border-[var(--line)] pt-4">
    <input type="hidden" name="submissionId" value={submissionId}/>
    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Rubric · 0–5 ต่อเกณฑ์</p>
    <div className="mt-2 grid grid-cols-2 gap-3">{rubric.map(([name, scoreKey, label]) => <label key={name} className="text-[10px] text-[var(--muted)]">{label}<input type="number" name={name} min={0} max={5} required defaultValue={initialScores?.[scoreKey] ?? 0} className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]"/></label>)}</div>
    <label className="mt-3 block text-[10px] text-[var(--muted)]">Feedback<textarea name="feedback" required minLength={3} maxLength={4000} defaultValue={initialFeedback ?? ""} rows={3} className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2 text-xs leading-5 text-[var(--ink)]" placeholder="อธิบายจุดที่ทำได้ดีและสิ่งที่ควรแก้"/></label>
    <label className="mt-3 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="passed" defaultChecked={initialPassed ?? false} className="accent-[var(--accent)]"/>ผ่านทักษะนี้ · นับ HW เข้าความคืบหน้า</label>
    {state.error && <p role="alert" className="mt-3 text-xs text-red-700">{state.error}</p>}{state.success && <p role="status" className="mt-3 text-xs text-[var(--accent)]">{state.success}</p>}
    <button type="submit" disabled={pending} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--ink)] px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{pending ? <Save size={14}/> : <Check size={14}/>}บันทึกผลตรวจ</button>
  </form>;
}
