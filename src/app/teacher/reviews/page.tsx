import Link from "next/link";
import { ArrowLeft, CircleAlert, Inbox, Paperclip } from "lucide-react";
import { PageFrame } from "@/components/AcademyShell";
import { ReviewHomeworkForm } from "@/components/ReviewHomeworkForm";
import { requireTeacherOrAdmin } from "@/lib/roles/access";

type Submission = { id: string; user_id: string; item_id: string; status: string; submitted_at: string | null; rubric_scores: Record<string, number> | null; score: number | null; max_score: number; feedback: string | null; passed: boolean | null };
type Item = { id: string; title: string; skill_id: string };
type Skill = { id: string; title: string; map_id: string };
type FileRow = { id: string; submission_id: string; storage_path: string; original_name: string; mime_type: string; size_bytes: number };
type Profile = { id: string; display_name: string | null; role: string };

export default async function TeacherReviewsPage() {
  const { supabase } = await requireTeacherOrAdmin("/teacher/reviews");
  const { data: rows, error } = await supabase.from("homework_submissions").select("id,user_id,item_id,status,submitted_at,rubric_scores,score,max_score,feedback,passed").in("status", ["submitted", "reviewed"]).order("submitted_at", { ascending: false });
  if (error) return <PageFrame><main className="mx-auto max-w-5xl px-5 py-12"><div role="alert" className="flex items-start gap-3 border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-4 py-4 text-sm leading-6"><CircleAlert size={16} className="mt-1 shrink-0"/>โหลดงานตรวจไม่ได้ กรุณารัน migration `202610160003_skill_learning_content.sql`</div></main></PageFrame>;
  const submissions = (rows as Submission[] | null) ?? [];
  const submissionIds = submissions.map((submission) => submission.id);
  const itemIds = [...new Set(submissions.map((submission) => submission.item_id))];
  const studentIds = [...new Set(submissions.map((submission) => submission.user_id))];
  const [{ data: itemRows }, { data: profiles }, { data: files }] = await Promise.all([
    itemIds.length ? supabase.from("skill_learning_items").select("id,title,skill_id").in("id", itemIds) : Promise.resolve({ data: [] }),
    studentIds.length ? supabase.from("profiles").select("id,display_name,role").in("id", studentIds) : Promise.resolve({ data: [] }),
    submissionIds.length ? supabase.from("homework_submission_files").select("id,submission_id,storage_path,original_name,mime_type,size_bytes").in("submission_id", submissionIds) : Promise.resolve({ data: [] }),
  ]);
  const items = (itemRows as Item[] | null) ?? [];
  const studentProfiles = (profiles as Profile[] | null) ?? [];
  const fileRows = (files as FileRow[] | null) ?? [];
  const skillIds = [...new Set(items.map((item) => item.skill_id))];
  const { data: skillRows } = skillIds.length ? await supabase.from("skills").select("id,title,map_id").in("id", skillIds) : { data: [] };
  const skills = (skillRows as Skill[] | null) ?? [];
  const getSignedUrl = async (path: string) => (await supabase.storage.from("homework-submissions").createSignedUrl(path, 3600)).data?.signedUrl ?? null;
  const signedFiles = await Promise.all(fileRows.map(async (file) => ({ ...file, url: await getSignedUrl(file.storage_path) })));
  const pending = submissions.filter((submission) => submission.status === "submitted");
  const reviewed = submissions.filter((submission) => submission.status === "reviewed");

  function submissionCard(submission: Submission) {
    const item = items.find((row) => row.id === submission.item_id);
    const skill = skills.find((row) => row.id === item?.skill_id);
    const student = studentProfiles.find((row) => row.id === submission.user_id);
    const attachments = signedFiles.filter((file) => file.submission_id === submission.id);
    return <article key={submission.id} className="border-b border-[var(--line)] py-6 first:border-t">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{submission.status === "submitted" ? "รอตรวจ" : "ตรวจแล้ว"} · {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString("th-TH") : ""}</p><h3 className="mt-2 text-base font-semibold">{item?.title ?? "การบ้าน"}</h3><p className="mt-1 text-xs text-[var(--muted)]">{skill?.title ?? "ทักษะ"} · นักเรียน {student?.display_name || submission.user_id.slice(0, 8)}</p></div>{submission.status === "reviewed" && <span className="font-mono text-sm font-semibold">{submission.score}/{submission.max_score} · {submission.passed ? "ผ่าน" : "แก้ไข"}</span>}</div>
      <div className="mt-4 flex flex-wrap gap-2">{attachments.map((file) => file.url ? <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"><Paperclip size={13}/>{file.original_name} · {(file.size_bytes / 1024 / 1024).toFixed(1)} MB</a> : <span key={file.id} className="text-xs text-red-700">เปิดไฟล์ {file.original_name} ไม่ได้</span>)}</div>
      {submission.status === "submitted" ? <ReviewHomeworkForm submissionId={submission.id}/> : <details className="mt-4"><summary className="cursor-pointer text-xs font-semibold text-[var(--accent)]">ดู Feedback / แก้ผลตรวจ</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-6">{submission.feedback}</p><ReviewHomeworkForm submissionId={submission.id} initialScores={submission.rubric_scores ?? {}} initialFeedback={submission.feedback ?? ""} initialPassed={submission.passed ?? false}/></details>}
    </article>;
  }

  return <PageFrame><main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12"><Link href="/teacher/skill-trees" className="inline-flex items-center gap-2 text-xs text-[var(--muted)]"><ArrowLeft size={14}/>กลับหน้าจัดการ Skill Tree</Link><div className="mt-5 border-b border-[var(--line)] pb-6"><p className="eyebrow">TEACHER WORKSPACE</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">ตรวจการบ้าน</h1><p className="mt-2 text-sm text-[var(--muted)]">ไฟล์ส่งงานอยู่ใน private storage · ให้คะแนน rubric 4 ด้านพร้อม feedback</p></div>
    <section className="mt-7"><div className="flex items-center gap-2"><Inbox size={16} className="text-[var(--accent)]"/><h2 className="text-sm font-semibold">รอตรวจ ({pending.length})</h2></div>{pending.length ? pending.map(submissionCard) : <p className="border-y border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">ไม่มีงานค้างตรวจ</p>}</section>
    {reviewed.length > 0 && <section className="mt-10"><h2 className="text-sm font-semibold">ประวัติการตรวจล่าสุด ({reviewed.length})</h2>{reviewed.slice(0, 20).map(submissionCard)}</section>}
  </main></PageFrame>;
}
