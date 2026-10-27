import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CLASSROOM_URL, CLASSROOM_PUBLIC_KEY } from "@/lib/classroom-public";
import { COURSES, type CourseId, type CourseLevel, type Enrollment, type LearningItem, type StudentRecord } from "@/lib/course-catalog";

let singleton: SupabaseClient | undefined;
export function classroomClient() {
  return singleton ??= createClient(CLASSROOM_URL, CLASSROOM_PUBLIC_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit", storageKey: "baanphys.auth.v1" } });
}

export async function loadClassroom() {
  const client = classroomClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || user.is_anonymous) return null;
  const [profile, account, courses, levels, enrollments, items, progress] = await Promise.all([
    client.from("profiles").select("role,display_name").eq("id", user.id).single(),
    client.from("classroom_accounts").select("username,display_name").eq("user_id", user.id).maybeSingle(),
    client.from("classroom_courses").select("*"),
    client.from("classroom_levels").select("*").order("number"),
    client.from("classroom_enrollments").select("*").eq("user_id", user.id),
    client.from("classroom_items").select("*").order("sort_order"),
    client.from("classroom_progress").select("item_id").eq("user_id", user.id).eq("completed", true),
  ]);
  for (const result of [profile, account, courses, levels, enrollments, items, progress]) if (result.error) throw new Error("โหลดข้อมูลห้องเรียนไม่สำเร็จ กรุณาลองใหม่");
  const courseLevels: Partial<Record<CourseId, CourseLevel[]>> = {};
  for (const level of levels.data ?? []) (courseLevels[level.course_id as CourseId] ??= []).push({ number: level.number, title: level.title, durationMinutes: level.duration_minutes, questionCount: level.question_count, section: "", isPlaceholder: level.title.includes("รอ") });
  return {
    role: profile.data?.role as string,
    user: { id: user.id, displayName: account.data?.display_name ?? profile.data?.display_name ?? "นักเรียน", username: account.data?.username ?? user.email ?? "" },
    courses: COURSES.map((course) => { const db = courses.data?.find((row) => row.id === course.id); return { ...course, levelCount: db?.level_count ?? null }; }),
    enrollments: (enrollments.data ?? []).map((row) => ({ studentId: row.user_id, courseId: row.course_id, unlockedLevel: row.unlocked_level })) as Enrollment[],
    items: (items.data ?? []).map((row) => ({ id: row.id, courseId: row.course_id, levelNumber: row.level_number, kind: row.kind, title: row.title, durationMinutes: row.duration_minutes, recommendedMinutes: row.recommended_minutes, driveFileId: row.drive_file_id, hasMedia: Boolean(row.drive_file_id), instructions: row.instructions, answerFileId: row.answer_file_id, solutionFileId: row.solution_file_id })) as LearningItem[],
    completedItemIds: (progress.data ?? []).map((row) => String(row.item_id)), courseLevels,
  };
}

export async function loadClassroomStudents(): Promise<StudentRecord[]> {
  const client = classroomClient();
  const [accounts, enrollments] = await Promise.all([client.from("classroom_accounts").select("*").order("created_at"), client.from("classroom_enrollments").select("*")]);
  if (accounts.error || enrollments.error) throw new Error("โหลดรายชื่อนักเรียนไม่ได้");
  return (accounts.data ?? []).map((row) => ({ id: row.user_id, displayName: row.display_name, username: row.username, enrollments: (enrollments.data ?? []).filter((e) => e.user_id === row.user_id).map((e) => ({ studentId: e.user_id, courseId: e.course_id, unlockedLevel: e.unlocked_level })) }));
}

export function classroomMutationError(message: string) {
  if (message.includes("TASKS_INCOMPLETE")) return "นักเรียนยังติ๊กรายการเลเวลปัจจุบันไม่ครบ";
  if (message.includes("CONTENT_NOT_READY")) return "ยังไม่มีเนื้อหาในเลเวลปัจจุบัน กรุณาเพิ่มเนื้อหาก่อน";
  if (message.includes("LEVEL_CHANGED")) return "เลเวลเปลี่ยนแล้ว กรุณารีเฟรชหน้าก่อนทำรายการอีกครั้ง";
  if (message.includes("FINAL_LEVEL")) return "เปิดครบทุกเลเวลแล้ว";
  if (message.includes("COURSE_NOT_READY")) return "คอร์สนี้ยังไม่ได้เตรียมเลเวล ให้เพิ่มในหน้าจัดการเนื้อหาก่อน";
  return "บันทึกไม่ได้ กรุณาตรวจสิทธิ์และลองอีกครั้ง";
}
export async function setClassroomTask(itemId: string, completed: boolean) {
  const client = classroomClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่" };
  const { error } = await client.from("classroom_progress").upsert({ user_id: user.id, item_id: itemId, completed, updated_at: new Date().toISOString() });
  return error ? { error: classroomMutationError(error.message) } : {};
}
async function enrollmentRpc(name: string, userId: string, courseId: CourseId, expected?: number) {
  const { error } = await classroomClient().rpc(name, { p_user_id: userId, p_course_id: courseId, ...(expected === undefined ? {} : { p_expected_level: expected }) });
  return error ? { error: classroomMutationError(error.message) } : {};
}
export async function enrollClassroomStudent(userId: string, courseId: CourseId) { return enrollmentRpc("classroom_enroll_student", userId, courseId); }
export async function revokeClassroomEnrollment(userId: string, courseId: CourseId) { return enrollmentRpc("classroom_revoke_student", userId, courseId); }
export async function advanceClassroomStudent(userId: string, courseId: CourseId) {
  const { data, error } = await classroomClient().from("classroom_enrollments").select("unlocked_level").eq("user_id", userId).eq("course_id", courseId).single();
  if (error || !data) return { error: "ไม่พบสิทธิ์คอร์สนี้ กรุณารีเฟรช" };
  return enrollmentRpc("classroom_advance_student", userId, courseId, data.unlocked_level);
}
export async function createClassroomStudent(input: { username: string; password: string; displayName: string }): Promise<{error?:string;student?:{id:string;displayName:string;username:string}}> {
  const { data, error } = await classroomClient().functions.invoke("classroom-admin", { body: input });
  if (error) {
    try { const body = await error.context?.json(); if (body?.error) return { error: body.error }; } catch { /* generic error below */ }
    return { error: "สร้างบัญชีไม่ได้ กรุณาตรวจเซสชันและลองใหม่" };
  }
  return data;
}
