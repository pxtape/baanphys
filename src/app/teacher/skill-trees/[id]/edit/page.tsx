import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { PageFrame } from "@/components/AcademyShell";
import { SkillMapBuilder } from "@/components/SkillMapBuilder";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireTeacherOrAdmin } from "@/lib/roles/access";
import type { EditableSkillNode, SkillMapDraft } from "@/lib/skill-maps";

export default async function EditSkillTreePage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return <PageFrame><main className="mx-auto max-w-3xl px-5 py-16 text-center"><CircleAlert className="mx-auto text-[var(--copper)]"/><h1 className="mt-4 text-xl font-semibold">ยังไม่ได้เชื่อมต่อ Supabase</h1><p className="mt-2 text-sm text-[var(--muted)]">ตั้งค่าฐานข้อมูลก่อนแก้ไข Skill Tree</p></main></PageFrame>;
  const { id } = await params;
  const { supabase } = await requireTeacherOrAdmin(`/teacher/skill-trees/${id}/edit`);
  const [{ data: map, error: mapError }, { data: skills, error: skillError }, { data: relations, error: edgeError }] = await Promise.all([
    supabase.from("skill_maps").select("id,title,description,readiness_stage,is_published").eq("id", id).single(),
    supabase.from("skills").select("id,title,subtitle,subject,formula,position_x,position_y").eq("map_id", id).is("archived_at", null),
    supabase.from("skill_prerequisites").select("prerequisite_skill_id,skill_id").eq("map_id", id),
  ]);
  if (mapError || !map) notFound();
  if (skillError || edgeError) return <PageFrame><main className="mx-auto max-w-3xl px-5 py-16"><div role="alert" className="border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-4 py-4 text-sm leading-6">โหลดรายละเอียดแผนที่ไม่สำเร็จ ตรวจสอบ migration และสิทธิ์ใน Supabase</div></main></PageFrame>;

  const nodes: EditableSkillNode[] = (skills ?? []).map((skill) => ({ id: skill.id, title: skill.title, subtitle: skill.subtitle ?? "", subject: skill.subject ?? "mechanics", formula: skill.formula ?? "", x: skill.position_x ?? 0, y: skill.position_y ?? 0 }));
  const draft: SkillMapDraft = {
    mapId: map.id,
    title: map.title,
    description: map.description ?? "",
    readinessStage: map.readiness_stage,
    isPublished: map.is_published,
    nodes,
    edges: (relations ?? []).map((edge) => ({ source: edge.prerequisite_skill_id, target: edge.skill_id })),
  };

  return <PageFrame><main className="mx-auto max-w-7xl px-4 py-7 sm:px-7 sm:py-10"><Link href="/teacher/skill-trees" className="inline-flex items-center gap-2 text-xs text-[var(--muted)]"><ArrowLeft size={14}/>กลับรายการ Skill Tree</Link><div className="my-5 border-b border-[var(--line)] pb-5"><p className="eyebrow">EDIT CURRICULUM MAP</p><h1 className="mt-2 text-2xl font-semibold">แก้ไข Skill Tree</h1><p className="mt-2 text-sm text-[var(--muted)]">การนำโหนดออกจะเก็บความคืบหน้านักเรียนในฐานข้อมูลไว้</p></div><SkillMapBuilder initial={draft}/></main></PageFrame>;
}
