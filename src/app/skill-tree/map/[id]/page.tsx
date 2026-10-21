import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { PageFrame } from "@/components/AcademyShell";
import { SkillMapViewer } from "@/components/SkillMapViewer";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { EditableSkillNode, SkillMapEdge } from "@/lib/skill-maps";

export default async function SkillMapPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return <PageFrame active="/skill-tree"><main className="mx-auto max-w-3xl px-5 py-16 text-center"><CircleAlert className="mx-auto text-[var(--copper)]"/><h1 className="mt-4 text-xl font-semibold">เชื่อมต่อ Supabase ก่อนเปิดแผนที่</h1><p className="mt-2 text-sm text-[var(--muted)]">แผนที่ที่ครูสร้างจะปรากฏที่นี่หลังตั้งค่าฐานข้อมูล</p></main></PageFrame>;
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: map, error: mapError }, { data: skills, error: skillError }, { data: relations, error: edgeError }, { data: { user } }] = await Promise.all([
    supabase.from("skill_maps").select("id,title,description,readiness_stage,is_published").eq("id", id).single(),
    supabase.from("skills").select("id,title,subtitle,subject,formula,position_x,position_y").eq("map_id", id).is("archived_at", null),
    supabase.from("skill_prerequisites").select("prerequisite_skill_id,skill_id").eq("map_id", id),
    supabase.auth.getUser(),
  ]);
  if (mapError || !map || !map.is_published) notFound();
  if (skillError || edgeError) return <PageFrame active="/skill-tree"><main className="mx-auto max-w-3xl px-5 py-16"><div role="alert" className="border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-4 py-4 text-sm leading-6">โหลดทักษะในแผนที่ไม่สำเร็จ กรุณาตรวจสอบ migration ใน Supabase</div></main></PageFrame>;

  let progress: { skill_id: string; status: string }[] = [];
  if (user) {
    const unitQuery = (skills ?? []).length ? supabase.from("skill_learning_items").select("id,skill_id,weight").in("skill_id", (skills ?? []).map((skill) => skill.id)).eq("is_published", true) : Promise.resolve({ data: [], error: null });
    const [{ data: legacyProgress }, { data: units, error: unitsError }, { data: unitProgress, error: unitProgressError }] = await Promise.all([
      supabase.from("user_skill_progress").select("skill_id,status").eq("user_id", user.id),
      unitQuery,
      supabase.from("user_learning_item_progress").select("item_id,status").eq("user_id", user.id),
    ]);
    if (unitsError || unitProgressError) return <PageFrame active="/skill-tree"><main className="mx-auto max-w-3xl px-5 py-16"><div role="alert" className="border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-4 py-4 text-sm leading-6">โหลดความคืบหน้าเนื้อหาไม่ได้ กรุณารัน migration `202610160003_skill_learning_content.sql` ใน Supabase</div></main></PageFrame>;
    const legacy = new Map((legacyProgress ?? []).map((row) => [row.skill_id, row.status]));
    const completedUnits = new Set((unitProgress ?? []).filter((row) => row.status === "completed").map((row) => row.item_id));
    const startedUnits = new Set((unitProgress ?? []).map((row) => row.item_id));
    progress = (skills ?? []).flatMap((skill) => {
      const skillUnits = (units ?? []).filter((unit) => unit.skill_id === skill.id);
      if (skillUnits.length && skillUnits.every((unit) => completedUnits.has(unit.id))) return [{ skill_id: skill.id, status: "completed" }];
      if (skillUnits.some((unit) => startedUnits.has(unit.id))) return [{ skill_id: skill.id, status: "in_progress" }];
      const status = legacy.get(skill.id);
      return status ? [{ skill_id: skill.id, status }] : [];
    });
  }
  const nodes: EditableSkillNode[] = (skills ?? []).map((skill) => ({ id: skill.id, title: skill.title, subtitle: skill.subtitle ?? "", subject: skill.subject ?? "mechanics", formula: skill.formula ?? "", x: skill.position_x ?? 0, y: skill.position_y ?? 0 }));
  const edges: SkillMapEdge[] = (relations ?? []).map((edge) => ({ source: edge.prerequisite_skill_id, target: edge.skill_id }));

  return <PageFrame active="/skill-tree"><main className="mx-auto max-w-7xl px-4 py-7 sm:px-7 sm:py-10"><Link href="/skill-tree" className="inline-flex items-center gap-2 text-xs text-[var(--muted)]"><ArrowLeft size={14}/>แผนที่ทั้งหมด</Link><div className="my-5 border-b border-[var(--line)] pb-5"><p className="eyebrow">{map.readiness_stage} · PHYSICS LEARNING MAP</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{map.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{map.description || "สำรวจทักษะและพื้นฐานที่ควรผ่านก่อน"}</p></div>{user && <p className="mb-3 text-xs text-[var(--muted)]">สถานะความคืบหน้าจากบัญชีของคุณ</p>}<SkillMapViewer mapId={map.id} nodes={nodes} edges={edges} progress={progress}/><p className="mt-4 text-[10px] leading-5 text-[var(--muted)]">ระดับในแผนที่ใช้วางแผนการเรียนภายใน ไม่ใช่คุณวุฒิหรือผลคัดเลือก POSN</p></main></PageFrame>;
}
