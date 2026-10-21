"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LearningProgressActionState = { error?: string; success?: string };

export async function updateLearningProgressAction(_previous: LearningProgressActionState, formData: FormData): Promise<LearningProgressActionState> {
  const itemId = String(formData.get("itemId") ?? "");
  const mapId = String(formData.get("mapId") ?? "");
  const skillId = String(formData.get("skillId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!itemId || !mapId || !skillId || !["started", "completed"].includes(status)) return { error: "ข้อมูลสถานะการเรียนไม่ถูกต้อง" };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "เข้าสู่ระบบเพื่อบันทึกความคืบหน้า" };
  const { data: item, error: itemError } = await supabase.from("skill_learning_items").select("id,kind,is_published,skill_id").eq("id", itemId).eq("skill_id", skillId).single();
  if (itemError || !item?.is_published) return { error: "ไม่พบเนื้อหาที่เผยแพร่แล้ว" };
  const { data: skill } = await supabase.from("skills").select("map_id").eq("id", skillId).single();
  if (skill?.map_id !== mapId) return { error: "ทักษะนี้ไม่อยู่ในแผนที่ที่ระบุ" };
  if (item.kind === "homework" && status === "completed") return { error: "การบ้านจะนับว่าผ่านหลังครูตรวจงาน" };

  const { data: prerequisites, error: prerequisiteError } = await supabase.from("skill_prerequisites").select("prerequisite_skill_id").eq("map_id", mapId).eq("skill_id", skillId);
  if (prerequisiteError) return { error: "ตรวจ prerequisite ไม่สำเร็จ กรุณาลองใหม่" };
  const requiredIds = (prerequisites ?? []).map((row) => row.prerequisite_skill_id);
  if (requiredIds.length) {
    const [{ data: oldProgress }, { data: prerequisiteItems }, { data: itemProgress }] = await Promise.all([
      supabase.from("user_skill_progress").select("skill_id").eq("user_id", user.id).eq("status", "completed").in("skill_id", requiredIds),
      supabase.from("skill_learning_items").select("id,skill_id,weight").in("skill_id", requiredIds).eq("is_published", true),
      supabase.from("user_learning_item_progress").select("item_id,status").eq("user_id", user.id),
    ]);
    const done = new Set((oldProgress ?? []).map((row) => row.skill_id));
    const doneItems = new Set((itemProgress ?? []).filter((row) => row.status === "completed").map((row) => row.item_id));
    for (const prerequisiteId of requiredIds) {
      if (done.has(prerequisiteId)) continue;
      const units = (prerequisiteItems ?? []).filter((unit) => unit.skill_id === prerequisiteId);
      if (!units.length || !units.every((unit) => doneItems.has(unit.id))) return { error: "ทักษะนี้ยังล็อกอยู่ กรุณาทำ prerequisite ให้ครบก่อน" };
    }
  }

  const { error } = await supabase.from("user_learning_item_progress").upsert({ user_id: user.id, item_id: itemId, status, updated_at: new Date().toISOString() });
  if (error) return { error: "บันทึกความคืบหน้าไม่สำเร็จ กรุณาตรวจ migration และสิทธิ์ Supabase" };
  revalidatePath(`/skill-tree/map/${mapId}`);
  revalidatePath(`/skill-tree/map/${mapId}/skill/${skillId}`);
  revalidatePath("/skill-tree");
  revalidatePath("/dashboard");
  return { success: status === "completed" ? "บันทึกว่าเรียนจบแล้ว" : "อัปเดตสถานะแล้ว" };
}
