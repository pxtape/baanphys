"use server";

import { revalidatePath } from "next/cache";
import type { CourseId } from "@/lib/course-catalog";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type ActionResult = { error?: string };
const courseIds = new Set(["pre-posn", "camp-1", "camp-2", "tpho"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function enrollmentInputValid(userId: string, courseId: CourseId) {
  return uuidPattern.test(userId) && courseIds.has(courseId);
}

function setupError() {
  return { error: "ยังไม่ได้ติดตั้งระบบคอร์สในฐานข้อมูล กรุณาตรวจขั้นตอนติดตั้ง" };
}

function mutationError(message: string): ActionResult {
  if (message.includes("CLASSROOM_CONTENT_NOT_READY")) return { error: "เลเวลนี้ยังไม่มีรายการเรียน กรุณารอเพิ่มเนื้อหาก่อนปลดล็อกเลเวลถัดไป" };
  if (message.includes("CLASSROOM_TASKS_INCOMPLETE")) return { error: "นักเรียนยังทำรายการเรียนของเลเวลปัจจุบันไม่ครบ" };
  if (message.includes("CLASSROOM_LEVEL_CHANGED")) return { error: "เลเวลถูกเปลี่ยนไปแล้ว กรุณารีเฟรชหน้าก่อนทำรายการอีกครั้ง" };
  if (message.includes("CLASSROOM_FINAL_LEVEL")) return { error: "นักเรียนได้รับสิทธิ์ถึงเลเวลสุดท้ายแล้ว" };
  if (message.includes("CLASSROOM_COURSE_NOT_READY")) return { error: "คอร์สนี้ยังไม่ได้กำหนดเลเวล กรุณารอเพิ่มหลักสูตรก่อน" };
  if (message.includes("CLASSROOM_NOT_ENROLLED")) return { error: "นักเรียนยังไม่ได้ลงทะเบียนคอร์สนี้" };
  if (message.includes("CLASSROOM_FORBIDDEN")) return { error: "เฉพาะแอดมินเท่านั้นที่จัดการสิทธิ์เรียนได้" };
  return { error: "บันทึกไม่สำเร็จ กรุณาตรวจการเชื่อมต่อและการติดตั้งระบบคอร์ส" };
}

async function getActor(adminOnly: boolean) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.is_anonymous) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" } as const;
  if (adminOnly) {
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError || profile?.role !== "admin") return { error: "เฉพาะแอดมินเท่านั้นที่จัดการสิทธิ์เรียนได้" } as const;
  }
  return { supabase, user } as const;
}

function refreshClassroom() {
  revalidatePath("/courses");
  revalidatePath("/admin/students");
}

export async function setClassroomTask(itemId: string, completed: boolean): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return setupError();
  if (typeof itemId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(itemId) || typeof completed !== "boolean") return { error: "รายการเรียนไม่ถูกต้อง" };
  const actor = await getActor(false);
  if ("error" in actor) return { error: actor.error };
  // The item SELECT and progress INSERT/UPDATE policies independently enforce enrollment and level access.
  const { data: item, error: itemError } = await actor.supabase.from("classroom_items").select("id").eq("id", itemId).maybeSingle();
  if (itemError || !item) return { error: "รายการนี้ยังไม่ปลดล็อก หรือคุณไม่มีสิทธิ์เรียนคอร์สนี้" };
  const { error } = await actor.supabase.from("classroom_progress").upsert({
    user_id: actor.user.id, item_id: itemId, completed,
  }, { onConflict: "user_id,item_id" });
  if (error) return mutationError(error.message);
  refreshClassroom();
  return {};
}

export async function enrollClassroomStudent(userId: string, courseId: CourseId): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return setupError();
  if (!enrollmentInputValid(userId, courseId)) return { error: "ข้อมูลนักเรียนหรือคอร์สไม่ถูกต้อง" };
  const actor = await getActor(true);
  if ("error" in actor) return { error: actor.error };
  const { error } = await actor.supabase.rpc("classroom_enroll_student", { p_user_id: userId, p_course_id: courseId });
  if (error) return mutationError(error.message);
  refreshClassroom();
  return {};
}

export async function advanceClassroomStudent(userId: string, courseId: CourseId): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return setupError();
  if (!enrollmentInputValid(userId, courseId)) return { error: "ข้อมูลนักเรียนหรือคอร์สไม่ถูกต้อง" };
  const actor = await getActor(true);
  if ("error" in actor) return { error: actor.error };
  const { data: enrollment, error: enrollmentError } = await actor.supabase.from("classroom_enrollments").select("unlocked_level").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  if (enrollmentError) return mutationError(enrollmentError.message);
  if (!enrollment) return { error: "นักเรียนยังไม่ได้ลงทะเบียนคอร์สนี้" };
  const { error } = await actor.supabase.rpc("classroom_advance_student", {
    p_user_id: userId, p_course_id: courseId, p_expected_level: enrollment.unlocked_level,
  });
  if (error) return mutationError(error.message);
  refreshClassroom();
  return {};
}

export async function revokeClassroomEnrollment(userId: string, courseId: CourseId): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return setupError();
  if (!enrollmentInputValid(userId, courseId)) return { error: "ข้อมูลนักเรียนหรือคอร์สไม่ถูกต้อง" };
  const actor = await getActor(true);
  if ("error" in actor) return { error: actor.error };
  const { error } = await actor.supabase.rpc("classroom_revoke_student", { p_user_id: userId, p_course_id: courseId });
  if (error) return mutationError(error.message);
  refreshClassroom();
  return {};
}
