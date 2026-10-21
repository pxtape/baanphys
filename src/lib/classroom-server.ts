import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isCourseId, type CourseId, type CourseLevel, type Enrollment, type LearningItem, type StudentRecord } from "@/lib/course-catalog";

export type ClassroomStudentData = {
  user: { id: string; displayName: string; username: string };
  enrollments: Enrollment[];
  items: LearningItem[];
  completedItemIds: string[];
  courseLevels: Partial<Record<CourseId, CourseLevel[]>>;
  setupRequired: boolean;
};

export type ClassroomAdminData = { students: StudentRecord[]; setupRequired: boolean };

type EnrollmentRow = { user_id: string; course_id: CourseId; unlocked_level: number };
type ItemRow = {
  id: string;
  course_id: CourseId;
  level_number: number;
  kind: "video" | "homework";
  title: string;
  duration_minutes: number | null;
  recommended_minutes: number | null;
  instructions: string;
  drive_file_id: string | null;
};

type LevelRow = { course_id: string; number: number; title: string; duration_minutes: number | null };

function mapEnrollment(row: EnrollmentRow): Enrollment {
  return { studentId: row.user_id, courseId: row.course_id, unlockedLevel: row.unlocked_level };
}

export async function getClassroomStudentData(): Promise<ClassroomStudentData> {
  const empty: ClassroomStudentData = {
    user: { id: "", displayName: "นักเรียน", username: "" },
    enrollments: [], items: [], completedItemIds: [], courseLevels: {}, setupRequired: true,
  };
  if (!isSupabaseConfigured()) return empty;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.is_anonymous) redirect("/login?next=%2Fcourses");

  const [profileResult, enrollmentResult, itemResult, progressResult, levelsResult] = await Promise.all([
    supabase.from("profiles").select("display_name,username").eq("id", user.id).maybeSingle(),
    supabase.from("classroom_enrollments").select("user_id,course_id,unlocked_level").eq("user_id", user.id),
    // Keep Drive IDs out of the page payload. The authenticated media route resolves them per request.
    supabase.from("classroom_items").select("id,course_id,level_number,kind,title,duration_minutes,recommended_minutes,instructions,drive_file_id").order("sort_order"),
    supabase.from("classroom_progress").select("item_id").eq("user_id", user.id).eq("completed", true),
    supabase.from("classroom_levels").select("course_id,number,title,duration_minutes").order("number"),
  ]);
  const setupRequired = Boolean(profileResult.error || enrollmentResult.error || itemResult.error || progressResult.error || levelsResult.error);
  const courseLevels: Partial<Record<CourseId, CourseLevel[]>> = {};
  if (!setupRequired) {
    for (const level of (levelsResult.data ?? []) as LevelRow[]) {
      if (!isCourseId(level.course_id)) continue;
      (courseLevels[level.course_id] ??= []).push({
        number: level.number, title: level.title, section: "",
        durationMinutes: level.duration_minutes, isPlaceholder: level.title.includes("รอ"),
      });
    }
  }
  return {
    user: {
      id: user.id,
      displayName: profileResult.data?.display_name || "นักเรียน",
      username: profileResult.data?.username || user.email?.split("@")[0] || "",
    },
    enrollments: setupRequired ? [] : ((enrollmentResult.data ?? []) as EnrollmentRow[]).map(mapEnrollment),
    items: setupRequired ? [] : ((itemResult.data ?? []) as ItemRow[]).map((item) => ({
      id: item.id, courseId: item.course_id, levelNumber: item.level_number,
      kind: item.kind, title: item.title, durationMinutes: item.duration_minutes,
      recommendedMinutes: item.recommended_minutes, driveFileId: null,
      instructions: item.instructions, hasMedia: Boolean(item.drive_file_id),
    })),
    completedItemIds: setupRequired ? [] : (progressResult.data ?? []).map((item) => String(item.item_id)),
    courseLevels,
    setupRequired,
  };
}

export async function getClassroomAdminData(): Promise<ClassroomAdminData> {
  if (!isSupabaseConfigured()) return { students: [], setupRequired: true };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.is_anonymous) redirect("/login?next=%2Fadmin%2Fstudents");
  const { data: actor, error: actorError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (actorError || actor?.role !== "admin") redirect("/courses?error=forbidden");

  const [profilesResult, enrollmentsResult] = await Promise.all([
    supabase.from("profiles").select("id,display_name,username").eq("role", "student").order("created_at"),
    supabase.from("classroom_enrollments").select("user_id,course_id,unlocked_level"),
  ]);
  if (profilesResult.error || enrollmentsResult.error) return { students: [], setupRequired: true };
  const enrollments = ((enrollmentsResult.data ?? []) as EnrollmentRow[]).map(mapEnrollment);
  return {
    students: (profilesResult.data ?? []).map((profile) => ({
      id: String(profile.id), displayName: profile.display_name || "นักเรียน",
      username: profile.username || "ยังไม่ได้กำหนด username",
      enrollments: enrollments.filter((enrollment) => enrollment.studentId === profile.id),
    })),
    setupRequired: false,
  };
}
