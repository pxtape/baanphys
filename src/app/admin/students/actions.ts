"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { classroomEmail, normalizeClassroomUsername } from "@/lib/classroom-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function createClassroomStudent(input: { username: string; password: string; displayName: string }): Promise<{
  error?: string;
  student?: { id: string; displayName: string; username: string };
}> {
  if (!input || typeof input.username !== "string" || typeof input.password !== "string" || typeof input.displayName !== "string") return { error: "ข้อมูลบัญชีไม่ครบถ้วน" };
  const username = normalizeClassroomUsername(input.username);
  const email = classroomEmail(input.username);
  const displayName = input.displayName.trim();
  if (!username || !email) return { error: "Username ต้องมี 3–40 ตัว ใช้ a–z, 0–9, จุด, ขีดกลาง หรือขีดล่าง และเริ่มกับจบด้วยตัวอักษรหรือตัวเลข" };
  if (input.password.length < 12 || input.password.length > 128) return { error: "รหัสผ่านต้องยาว 12–128 ตัวอักษร" };
  if (!displayName || displayName.length > 100) return { error: "กรุณาระบุชื่อนักเรียนไม่เกิน 100 ตัวอักษร" };
  if (!isSupabaseConfigured()) return { error: "ยังไม่ได้ตั้งค่าระบบบัญชีนักเรียน" };

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "กรุณาเข้าสู่ระบบด้วยบัญชีแอดมิน" };
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== "admin") return { error: "เฉพาะแอดมินเท่านั้นที่สร้างบัญชีนักเรียนได้" };

    // This privileged client is constructed only after verifying the caller's role.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !url) return { error: "ผู้ดูแลต้องตั้งค่า SUPABASE_SERVICE_ROLE_KEY ที่เซิร์ฟเวอร์ก่อนสร้างบัญชี" };
    const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { display_name: displayName, username },
    });
    if (error || !data.user) return { error: "สร้างบัญชีไม่สำเร็จ Username อาจถูกใช้แล้ว กรุณาตรวจสอบแล้วลองใหม่" };
    revalidatePath("/admin");
    revalidatePath("/admin/students");
    return { student: { id: data.user.id, displayName, username } };
  } catch {
    return { error: "เชื่อมต่อระบบบัญชีไม่ได้ กรุณาลองใหม่อีกครั้ง" };
  }
}
