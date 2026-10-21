"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateSkillMapDraft } from "@/lib/skill-maps";

export type SkillMapActionState = { error?: string; mapId?: string };

export async function saveSkillMapAction(_previous: SkillMapActionState, formData: FormData): Promise<SkillMapActionState> {
  let parsed: unknown;
  try { parsed = JSON.parse(String(formData.get("draft") ?? "")); }
  catch { return { error: "อ่านข้อมูลแผนที่ไม่สำเร็จ กรุณาลองบันทึกอีกครั้ง" }; }
  const validation = validateSkillMapDraft(parsed);
  if (!validation.data) return { error: validation.error ?? "กรุณาตรวจสอบข้อมูลแผนที่" };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profileError || (profile?.role !== "teacher" && profile?.role !== "admin")) return { error: "บัญชีนี้ไม่มีสิทธิ์จัดการ Skill Tree" };

  const map = validation.data;
  const { data: mapId, error } = await supabase.rpc("save_skill_map", {
    p_map_id: map.mapId,
    p_title: map.title,
    p_description: map.description,
    p_readiness_stage: map.readinessStage,
    p_is_published: map.isPublished,
    p_nodes: map.nodes,
    p_edges: map.edges,
  });
  if (error || typeof mapId !== "string") return { error: error?.code === "42501" ? "ไม่มีสิทธิ์แก้ไขแผนที่นี้" : "บันทึกไม่สำเร็จ ตรวจสอบว่ารัน migration ระบบสร้าง Skill Tree แล้ว" };

  revalidatePath("/skill-tree");
  revalidatePath("/teacher/skill-trees");
  revalidatePath(`/skill-tree/map/${mapId}`);
  return { mapId };
}
