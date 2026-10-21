"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileUp, LockKeyhole, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type HomeworkSubmissionRow = { id: string; status: "draft" | "submitted" | "reviewed"; score: number | null; max_score: number; feedback: string | null; passed: boolean | null; submitted_at: string | null; reviewed_at: string | null };

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxFiles = 8;
const maxFileBytes = 10 * 1024 * 1024;
const maxTotalBytes = 25 * 1024 * 1024;

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "solution";
}

export function HomeworkSubmission({ itemId, submissions }: { itemId: string; submissions: HomeworkSubmissionRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const activeSubmission = submissions.find((submission) => submission.status === "submitted");
  const formatter = useMemo(() => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }), []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess("");
    const form = event.currentTarget;
    const input = form.elements.namedItem("files") as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (!files.length || files.length > maxFiles) { setError(`เลือกไฟล์ 1–${maxFiles} ไฟล์`); return; }
    if (files.some((file) => !allowedTypes.has(file.type) || file.size > maxFileBytes)) { setError("รองรับ PDF หรือรูป JPG, PNG, WebP ขนาดไม่เกิน 10 MB ต่อไฟล์"); return; }
    if (total > maxTotalBytes) { setError("ขนาดรวมต้องไม่เกิน 25 MB ต่อครั้ง"); return; }

    setBusy(true);
    const supabase = createClient();
    let submissionId: string | null = null;
    const uploaded: string[] = [];
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
      const { data: created, error: createError } = await supabase.from("homework_submissions").insert({ user_id: user.id, item_id: itemId, status: "draft" }).select("id").single();
      if (createError || !created) throw new Error("เริ่มส่งงานไม่สำเร็จ ตรวจสอบ migration และสิทธิ์บัญชี");
      submissionId = created.id;
      const draftId = created.id;

      const filesToRecord: { submission_id: string; storage_path: string; original_name: string; mime_type: string; size_bytes: number }[] = [];
      for (const file of files) {
        const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
        const path = `${user.id}/${draftId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("homework-submissions").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error(`อัปโหลดไฟล์ ${file.name} ไม่สำเร็จ: ${uploadError.message}`);
        uploaded.push(path);
        filesToRecord.push({ submission_id: draftId, storage_path: path, original_name: safeName(file.name), mime_type: file.type, size_bytes: file.size });
      }
      const { error: fileRecordError } = await supabase.from("homework_submission_files").insert(filesToRecord);
      if (fileRecordError) throw new Error("บันทึกรายชื่อไฟล์ไม่สำเร็จ กรุณาลองส่งอีกครั้ง");
      const { error: submitError } = await supabase.from("homework_submissions").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", submissionId).eq("status", "draft");
      if (submitError) throw new Error("ส่งงานไม่สำเร็จ กรุณาตรวจสถานะการเชื่อมต่อแล้วลองใหม่");
      setSuccess("ส่งงานแล้ว ครูจะตรวจและแจ้งผลในห้องเรียน");
      form.reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ส่งงานไม่สำเร็จ กรุณาลองใหม่");
      if (uploaded.length) await supabase.storage.from("homework-submissions").remove(uploaded);
      if (submissionId) {
        await supabase.from("homework_submission_files").delete().eq("submission_id", submissionId);
        await supabase.from("homework_submissions").delete().eq("id", submissionId).eq("status", "draft");
      }
    } finally { setBusy(false); }
  }

  return <section className="mt-4 border-t border-[var(--line)] pt-4">
    {submissions.length > 0 && <div className="mb-4 space-y-2">{submissions.map((submission) => <article key={submission.id} className="border border-[var(--line)] bg-[#fbfcfa] px-3 py-3 text-xs"><div className="flex items-center gap-2 font-semibold">{submission.status === "reviewed" ? submission.passed ? <CheckCircle2 size={14} className="text-[var(--accent)]"/> : <AlertCircle size={14} className="text-[var(--copper)]"/> : <FileUp size={14} className="text-[var(--copper)]"/>}{submission.status === "reviewed" ? submission.passed ? "ตรวจแล้ว · ผ่าน" : "ตรวจแล้ว · แก้ไขและส่งใหม่" : "ส่งแล้ว · รอครูตรวจ"}{submission.score !== null && <span className="ml-auto font-mono">{submission.score}/{submission.max_score}</span>}</div>{submission.submitted_at && <p className="mt-1 text-[10px] text-[var(--muted)]">ส่งเมื่อ {formatter.format(new Date(submission.submitted_at))}</p>}{submission.feedback && <p className="mt-2 whitespace-pre-wrap leading-5">{submission.feedback}</p>}</article>)}</div>}
    {activeSubmission ? <p className="flex items-start gap-2 border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-3 py-3 text-xs leading-5"><LockKeyhole size={14} className="mt-0.5 shrink-0"/>รอครูตรวจงานก่อนส่งครั้งถัดไป</p> : <form onSubmit={submit} className="space-y-3">
      <div><label htmlFor={`hw-files-${itemId}`} className="text-xs font-semibold">ส่งคำตอบที่เขียนด้วยลายมือ</label><input id={`hw-files-${itemId}`} name="files" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} className="mt-2 block w-full text-xs file:mr-3 file:border-0 file:bg-[var(--soft)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[var(--accent)]"/><p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">PDF หรือรูป JPG/PNG/WebP · สูงสุด {maxFiles} ไฟล์ · ไม่เกิน 10 MB ต่อไฟล์ และ 25 MB ต่อครั้ง</p></div>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}{success && <p role="status" className="text-xs text-[var(--accent)]">{success}</p>}
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-[var(--ink)] px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Upload size={14}/>{busy ? "กำลังอัปโหลด…" : "ส่ง HW ให้ครูตรวจ"}</button>
    </form>}
  </section>;
}
