"use client";

import { useActionState } from "react";
import { ArrowUpRight, Check, FileText, Plus, Save, Video } from "lucide-react";
import { saveLearningItemAction, type LearningContentActionState } from "@/app/teacher/skill-trees/content-actions";
import { updateLearningProgressAction, type LearningProgressActionState } from "@/app/skill-tree/map/[id]/skill/[skillId]/actions";
import type { LearningItemKind } from "@/lib/learning-content";
import { HomeworkSubmission, type HomeworkSubmissionRow } from "@/components/HomeworkSubmission";

export type LearningItemRecord = {
  id: string;
  skill_id: string;
  title: string;
  kind: LearningItemKind;
  resource_url: string;
  weight: number;
  sort_order: number;
  is_published: boolean;
};

export type LearningItemStatus = { item_id: string; status: string };

const kindLabels: Record<LearningItemKind, string> = { sheet: "ชีท", video: "วิดีโอ", homework: "การบ้าน" };

function ContentEditor({ skillId, item }: { skillId: string; item?: LearningItemRecord }) {
  const [state, action, pending] = useActionState<LearningContentActionState, FormData>(saveLearningItemAction, {});
  return <form action={action} className="mt-3 grid gap-3 border-t border-[var(--line)] pt-3 sm:grid-cols-2">
    <input type="hidden" name="id" value={item?.id ?? ""}/><input type="hidden" name="skillId" value={skillId}/>
    <label className="text-[10px] text-[var(--muted)]">ชื่อรายการ<input required minLength={2} maxLength={160} name="title" defaultValue={item?.title ?? ""} placeholder="เช่น ชีทการเคลื่อนที่พื้นฐาน" className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--ink)]"/></label>
    <label className="text-[10px] text-[var(--muted)]">ประเภท<select name="kind" defaultValue={item?.kind ?? "sheet"} className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--ink)]"><option value="sheet">ชีท · Google Drive</option><option value="video">วิดีโอ · YouTube</option><option value="homework">การบ้าน · Google Drive</option></select></label>
    <label className="text-[10px] text-[var(--muted)] sm:col-span-2">ลิงก์เนื้อหา<input required type="url" name="resourceUrl" defaultValue={item?.resource_url ?? ""} placeholder="https://drive.google.com/... หรือ https://youtu.be/..." className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--ink)]"/></label>
    <p className="text-[10px] leading-5 text-[var(--muted)] sm:col-span-2">YouTube แบบ Private ต้องเชิญบัญชี Google ของนักเรียนให้ดูได้ ส่วน Unlisted เปิดได้ด้วยลิงก์และส่งต่อได้ · Google Drive แบบ Restricted ต้องแชร์ไฟล์ให้บัญชีนักเรียนหรือ Google Group แยกต่างหาก</p>
    <label className="text-[10px] text-[var(--muted)]">น้ำหนักในทักษะ (%)<input required type="number" name="weight" min={1} max={100} defaultValue={item?.weight ?? 25} className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--ink)]"/><span className="mt-1 block">ระบบปรับสัดส่วนตามผลรวมน้ำหนักของรายการในทักษะนี้</span></label>
    <label className="text-[10px] text-[var(--muted)]">ลำดับในทักษะ<input required type="number" name="sortOrder" min={0} max={500} defaultValue={item?.sort_order ?? 0} className="mt-1 w-full border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--ink)]"/></label>
    <label className="flex items-center gap-2 self-center text-xs text-[var(--ink)]"><input type="checkbox" name="isPublished" defaultChecked={item?.is_published ?? false} className="accent-[var(--accent)]"/>เผยแพร่ให้นักเรียนที่เข้าสู่ระบบ</label>
    {state.error && <p role="alert" className="text-xs text-red-700 sm:col-span-2">{state.error}</p>}{state.success && <p role="status" className="text-xs text-[var(--accent)] sm:col-span-2">{state.success}</p>}
    <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-60 sm:col-span-2"><Save size={13}/>{pending ? "กำลังบันทึก…" : item ? "บันทึกการแก้ไข" : "เพิ่มเนื้อหา"}</button>
  </form>;
}

function ProgressButton({ item, mapId, skillId, status }: { item: LearningItemRecord; mapId: string; skillId: string; status?: string }) {
  const [state, action, pending] = useActionState<LearningProgressActionState, FormData>(updateLearningProgressAction, {});
  const next = status === "completed" ? "started" : "completed";
  return <form action={action} className="mt-3">
    <input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="mapId" value={mapId}/><input type="hidden" name="skillId" value={skillId}/><input type="hidden" name="status" value={item.kind === "homework" ? "started" : next}/>
    <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--accent)] disabled:opacity-50">{item.kind === "homework" ? status === "started" ? "กำลังทำ HW" : "เริ่มทำ HW" : status === "completed" ? "ทำเครื่องหมายว่ายังไม่จบ" : <><Check size={12}/> {pending ? "กำลังบันทึก…" : "ทำเครื่องหมายว่าเรียนจบ"}</>}</button>
    {state.error && <p role="alert" className="mt-1 text-[10px] text-red-700">{state.error}</p>}{state.success && <p role="status" className="mt-1 text-[10px] text-[var(--accent)]">{state.success}</p>}
  </form>;
}

export function LearningItems({ mapId, skillId, items, progress, submissions, signedIn, canManage }: { mapId: string; skillId: string; items: LearningItemRecord[]; progress: LearningItemStatus[]; submissions: Record<string, HomeworkSubmissionRow[]>; signedIn: boolean; canManage: boolean }) {
  const progressMap = new Map(progress.map((row) => [row.item_id, row.status]));
  const visibleItems = items.filter((item) => item.is_published || canManage);
  const publishedTotal = items.filter((item) => item.is_published).reduce((sum, item) => sum + item.weight, 0);
  const completed = items.filter((item) => item.is_published && progressMap.get(item.id) === "completed").reduce((sum, item) => sum + item.weight, 0);
  const pct = publishedTotal ? Math.round(completed / publishedTotal * 100) : null;

  return <section className="mt-6 border border-[var(--line)] bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">LEARNING CONTENT</p><h2 className="mt-1 text-base font-semibold">เนื้อหาและความคืบหน้า</h2><p className="mt-1 text-xs text-[var(--muted)]">น้ำหนักแต่ละรายการคิดเป็นสัดส่วนภายในทักษะนี้</p></div>{pct !== null && signedIn && <span className="font-mono text-xl font-semibold text-[var(--accent)]">{pct}%</span>}</div>
    {publishedTotal > 0 && signedIn && <div className="mt-3 h-1.5 bg-[#E7EBE6]"><div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }}/></div>}
    {visibleItems.length ? <div className="mt-4 divide-y divide-[var(--line)]">{visibleItems.map((item) => {
      const status = progressMap.get(item.id);
      const Icon = item.kind === "video" ? Video : FileText;
      return <article key={item.id} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Icon size={14} className="text-[var(--accent)]"/><h3 className="text-sm font-semibold">{item.title}</h3><span className="rounded-sm bg-[var(--soft)] px-1.5 py-0.5 text-[9px] text-[var(--accent)]">{kindLabels[item.kind]}</span><span className="text-[10px] text-[var(--muted)]">{item.weight}%</span>{!item.is_published && <span className="text-[9px] text-[var(--copper)]">ฉบับร่าง</span>}</div>
        {signedIn ? <a href={item.resource_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent)] hover:underline">เปิดลิงก์เนื้อหา <ArrowUpRight size={11}/></a> : <p className="mt-1 text-[10px] text-[var(--muted)]">เข้าสู่ระบบเพื่อเปิดเนื้อหาการเรียน</p>}
        {item.kind === "homework" && signedIn && item.is_published && <HomeworkSubmission itemId={item.id} submissions={submissions[item.id] ?? []}/>}
      </div>{signedIn && item.is_published && item.kind !== "homework" && <ProgressButton item={item} mapId={mapId} skillId={skillId} status={status}/>}</article>;
    })}</div> : <p className="mt-4 text-xs leading-6 text-[var(--muted)]">ยังไม่มีเนื้อหาที่เผยแพร่ในทักษะนี้</p>}
    {canManage && <details className="mt-4 border-t border-[var(--line)] pt-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-[var(--accent)]"><Plus size={14}/>เพิ่มเนื้อหาในทักษะนี้</summary><ContentEditor skillId={skillId}/>{items.filter((item) => !item.is_published || canManage).map((item) => <details key={item.id} className="mt-3 border-t border-[var(--line)] pt-3"><summary className="cursor-pointer text-[10px] text-[var(--muted)]">แก้ไข: {item.title} {item.is_published ? "(เผยแพร่)" : "(ร่าง)"}</summary><ContentEditor skillId={skillId} item={item}/></details>)}</details>}
  </section>;
}
