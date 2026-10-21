import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleHelp, LockKeyhole } from "lucide-react";
import { PageFrame } from "@/components/AcademyShell";
import { LearningItems, type LearningItemRecord, type LearningItemStatus } from "@/components/LearningItems";
import type { HomeworkSubmissionRow } from "@/components/HomeworkSubmission";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import katex from "katex";

export default async function SkillDetailPage({ params }: { params: Promise<{ id: string; skillId: string }> }) {
  if (!isSupabaseConfigured()) return <PageFrame active="/skill-tree"><main className="mx-auto max-w-3xl px-5 py-16 text-center"><h1 className="text-xl font-semibold">เชื่อมต่อฐานข้อมูลก่อน</h1><p className="mt-2 text-sm text-[var(--muted)]">รายละเอียด Skill Tree ต้องโหลดจาก Supabase</p></main></PageFrame>;
  const { id, skillId } = await params;
  const supabase = await createClient();
  const [{ data: map }, { data: skill }, { data: relations }, { data: { user } }] = await Promise.all([
    supabase.from("skill_maps").select("id,title,is_published,created_by").eq("id", id).single(),
    supabase.from("skills").select("id,title,subtitle,subject,formula").eq("id", skillId).eq("map_id", id).is("archived_at", null).single(),
    supabase.from("skill_prerequisites").select("prerequisite_skill_id").eq("map_id", id).eq("skill_id", skillId),
    supabase.auth.getUser(),
  ]);
  if (!map?.is_published || !skill) notFound();
  const prerequisites = relations?.length ? await supabase.from("skills").select("id,title").in("id", relations.map((row) => row.prerequisite_skill_id)) : { data: [] };
  const formula = skill.formula ? katex.renderToString(skill.formula, { throwOnError: false, output: "html" }) : null;

  let role: string | null = null;
  let items: LearningItemRecord[] = [];
  let progress: LearningItemStatus[] = [];
  const submissions: Record<string, HomeworkSubmissionRow[]> = {};
  let contentError = false;
  let prerequisiteLocked = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    role = profile?.role ?? null;
    const canManage = (role === "teacher" && map.created_by === user.id) || role === "admin";
    if (!canManage && relations?.length) {
      const prerequisiteIds = relations.map((row) => row.prerequisite_skill_id);
      const [{ data: legacyDone }, { data: prerequisiteItems }, { data: itemDone }] = await Promise.all([
        supabase.from("user_skill_progress").select("skill_id").eq("user_id", user.id).eq("status", "completed").in("skill_id", prerequisiteIds),
        supabase.from("skill_learning_items").select("id,skill_id,weight").in("skill_id", prerequisiteIds).eq("is_published", true),
        supabase.from("user_learning_item_progress").select("item_id,status").eq("user_id", user.id),
      ]);
      const completedSkills = new Set((legacyDone ?? []).map((row) => row.skill_id));
      const completedItems = new Set((itemDone ?? []).filter((row) => row.status === "completed").map((row) => row.item_id));
      prerequisiteLocked = prerequisiteIds.some((prerequisiteId) => {
        if (completedSkills.has(prerequisiteId)) return false;
        const units = (prerequisiteItems ?? []).filter((row) => row.skill_id === prerequisiteId);
        return !units.length || !units.every((row) => completedItems.has(row.id));
      });
    }
    if (!prerequisiteLocked) {
      const query = supabase.from("skill_learning_items").select("id,skill_id,title,kind,resource_url,weight,sort_order,is_published").eq("skill_id", skillId).order("sort_order").order("created_at");
      const { data: itemRows, error: itemsError } = canManage ? await query : await query.eq("is_published", true);
      if (itemsError) contentError = true;
      items = (itemRows as LearningItemRecord[] | null) ?? [];
      if (items.length) {
        const publishedIds = items.filter((item) => item.is_published).map((item) => item.id);
        if (publishedIds.length) {
          const { data: progressRows, error: progressError } = await supabase.from("user_learning_item_progress").select("item_id,status").eq("user_id", user.id).in("item_id", publishedIds);
          if (progressError) contentError = true;
          progress = (progressRows as LearningItemStatus[] | null) ?? [];
        }
        const homeworkIds = items.filter((item) => item.kind === "homework" && item.is_published).map((item) => item.id);
        if (!canManage && homeworkIds.length) {
          const { data: submissionRows, error: submissionsError } = await supabase.from("homework_submissions").select("id,item_id,status,score,max_score,feedback,passed,submitted_at,reviewed_at").eq("user_id", user.id).in("item_id", homeworkIds).order("created_at", { ascending: false });
          if (submissionsError) contentError = true;
          for (const row of (submissionRows ?? []) as (HomeworkSubmissionRow & { item_id: string })[]) {
            submissions[row.item_id] = [...(submissions[row.item_id] ?? []), row];
          }
        }
      }
    }
  }
  const canManage = Boolean(user && ((role === "teacher" && map.created_by === user.id) || role === "admin"));

  return <PageFrame active="/skill-tree"><main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12"><Link href={`/skill-tree/map/${id}`} className="inline-flex items-center gap-2 text-xs text-[var(--muted)]"><ArrowLeft size={14}/>กลับแผนที่ {map.title}</Link><div className="mt-6 border-b border-[var(--line)] pb-6"><p className="eyebrow">{map.title} · {skill.subject}</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{skill.title}</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{skill.subtitle}</p></div>
    {prerequisiteLocked ? <div className="mt-5 flex items-start gap-3 border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-4 py-4"><LockKeyhole size={15} className="mt-0.5 shrink-0 text-[var(--copper)]"/><div><p className="text-xs font-semibold">เนื้อหานี้ยังล็อกอยู่</p><p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">เรียนเนื้อหาของ prerequisite ให้ครบก่อน แล้วจึงเปิดบทนี้ได้</p></div></div> : contentError ? <div role="alert" className="mt-5 border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-4 py-3 text-xs leading-6">โหลดเนื้อหาไม่ได้ ตรวจว่าได้รัน migration `202610160003_skill_learning_content.sql` แล้ว</div> : <LearningItems mapId={id} skillId={skillId} items={items} progress={progress} submissions={submissions} signedIn={Boolean(user)} canManage={canManage}/>}
    {!user && <section className="mt-4 flex items-start gap-3 border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-4 py-4"><LockKeyhole size={15} className="mt-0.5 shrink-0 text-[var(--copper)]"/><div><p className="text-xs font-semibold">เนื้อหาสำหรับนักเรียนที่เข้าสู่ระบบ</p><p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">แผนที่ยังเปิดให้ดูได้ แต่ชีทและวิดีโอจะแสดงหลังเข้าสู่ระบบ</p><Link href={`/login?next=${encodeURIComponent(`/skill-tree/map/${id}/skill/${skillId}`)}`} className="mt-2 inline-flex text-xs font-semibold text-[var(--accent)]">เข้าสู่ระบบ <ArrowLeft size={12} className="ml-1 rotate-180"/></Link></div></section>}
    {formula && <section className="mt-4 border-l-2 border-[var(--accent)] bg-white px-5 py-4"><p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">สมการที่เกี่ยวข้อง</p><span className="mt-2 block text-base" dangerouslySetInnerHTML={{ __html: formula }}/></section>}
    <section className="mt-4 border-l-2 border-[var(--copper)] bg-white px-5 py-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-[var(--muted)]"><CircleHelp size={13}/>พื้นฐานที่ควรผ่านก่อน</div><p className="mt-2 text-sm">{prerequisites.data?.map((row) => row.title).join(" · ") || "ไม่มี prerequisite"}</p></section>
    <p className="mt-6 text-[10px] leading-5 text-[var(--muted)]">คะแนนความคืบหน้าคิดจากน้ำหนักเนื้อหาที่เรียนจบ การบ้านจะนับว่าผ่านเมื่อครูตรวจงาน</p></main></PageFrame>;
}
