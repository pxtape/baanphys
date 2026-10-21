"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type HomeworkReviewState = { error?: string; success?: string };

export async function reviewHomeworkAction(_previous: HomeworkReviewState, formData: FormData): Promise<HomeworkReviewState> {
  const submissionId = String(formData.get("submissionId") ?? "");
  const scores = {
    setup: Number(formData.get("scoreSetup")),
    principles: Number(formData.get("scorePrinciples")),
    calculation: Number(formData.get("scoreCalculation")),
    communication: Number(formData.get("scoreCommunication")),
  };
  const feedback = String(formData.get("feedback") ?? "").trim();
  const passed = formData.get("passed") === "on";
  if (!submissionId || Object.values(scores).some((score) => !Number.isInteger(score) || score < 0 || score > 5)) return { error: "ให้คะแนนแต่ละเกณฑ์ตั้งแต่ 0–5" };
  if (feedback.length < 3 || feedback.length > 4000) return { error: "Feedback ต้องมี 3–4,000 ตัวอักษร" };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "teacher" && profile?.role !== "admin") return { error: "บัญชีนี้ไม่มีสิทธิ์ตรวจการบ้าน" };
  const { error } = await supabase.rpc("review_homework_submission", {
    p_submission_id: submissionId,
    p_scores: scores,
    p_feedback: feedback,
    p_passed: passed,
  });
  if (error) return { error: error.message.includes("not authorized") ? "ครูตรวจได้เฉพาะแผนที่ที่ตนเองดูแล" : "บันทึกผลตรวจไม่สำเร็จ กรุณาตรวจ migration และสิทธิ์ Supabase" };
  revalidatePath("/teacher/reviews");
  revalidatePath("/skill-tree");
  revalidatePath("/dashboard");
  return { success: passed ? "ตรวจแล้วและปลดล็อกความคืบหน้าของ HW" : "บันทึก Feedback แล้ว · ยังไม่ผ่าน" };
}
