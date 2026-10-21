"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateLearningItem } from "@/lib/learning-content";

export type LearningContentActionState = { error?: string; success?: string };

export async function saveLearningItemAction(_previous: LearningContentActionState, formData: FormData): Promise<LearningContentActionState> {
  const item = {
    id: String(formData.get("id") ?? "") || null,
    skillId: String(formData.get("skillId") ?? ""),
    title: String(formData.get("title") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    resourceUrl: String(formData.get("resourceUrl") ?? ""),
    weight: Number(formData.get("weight")),
    sortOrder: Number(formData.get("sortOrder")),
    isPublished: formData.get("isPublished") === "on",
  };
  const validation = validateLearningItem(item);
  if (!validation.data) return { error: validation.error ?? "ข้อมูลเนื้อหาไม่ถูกต้อง" };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "teacher" && profile?.role !== "admin") return { error: "บัญชีนี้ไม่มีสิทธิ์จัดการเนื้อหา" };
  const { data: skill } = await supabase.from("skills").select("id,map_id").eq("id", validation.data.skillId).single();
  if (!skill?.map_id) return { error: "ไม่พบทักษะนี้ใน Skill Tree" };
  const { data: map } = await supabase.from("skill_maps").select("id,created_by").eq("id", skill.map_id).single();
  if (!map || (profile.role !== "admin" && map.created_by !== user.id)) return { error: "ครูจัดการได้เฉพาะแผนที่ของตนเอง" };

  const data = validation.data;
  const result = data.id
    ? await supabase.from("skill_learning_items").update({ title: data.title, kind: data.kind, resource_url: data.resourceUrl, weight: data.weight, sort_order: data.sortOrder, is_published: data.isPublished, updated_at: new Date().toISOString() }).eq("id", data.id).eq("skill_id", data.skillId).select("id").maybeSingle()
    : await supabase.from("skill_learning_items").insert({ skill_id: data.skillId, title: data.title, kind: data.kind, resource_url: data.resourceUrl, weight: data.weight, sort_order: data.sortOrder, is_published: data.isPublished, created_by: user.id }).select("id").maybeSingle();
  if (result.error || !result.data?.id) return { error: "บันทึกไม่สำเร็จ กรุณาตรวจสิทธิ์และการติดตั้ง migration เนื้อหาการเรียน" };

  revalidatePath("/skill-tree");
  revalidatePath(`/skill-tree/map/${map.id}`);
  revalidatePath(`/skill-tree/map/${map.id}/skill/${data.skillId}`);
  revalidatePath("/dashboard");
  return { success: data.isPublished ? "บันทึกและเผยแพร่เนื้อหาแล้ว" : "บันทึกฉบับร่างแล้ว" };
}
