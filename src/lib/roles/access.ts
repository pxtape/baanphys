import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireTeacherOrAdmin(nextPath: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profileError || !profile) redirect("/login?error=profile");
  if (profile.role !== "teacher" && profile.role !== "admin") redirect("/skill-tree?error=forbidden");
  return { supabase, user, role: profile.role };
}
