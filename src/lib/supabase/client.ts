import { createBrowserClient } from "@supabase/ssr";
import type { GoTrueClient } from "@supabase/auth-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BaanSupabaseClient = Omit<SupabaseClient, "auth"> & { auth: GoTrueClient };

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("ยังไม่ได้ตั้งค่า Supabase กรุณาคัดลอก .env.example เป็น .env.local และใส่ค่าจากโปรเจกต์ของคุณ");
  return createBrowserClient(url, key) as unknown as BaanSupabaseClient;
}
