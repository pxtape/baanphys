import Link from "next/link";
import { redirect } from "next/navigation";
import { Atom, ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";
import { getSafeRedirectPath } from "@/lib/auth-redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const nextPath = getSafeRedirectPath(next ?? "/courses");
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect(nextPath);
  }

  return <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-5 py-10"><div className="w-full max-w-md"><Link href="/" className="mb-7 inline-flex items-center gap-2 text-xs text-[var(--muted)]"><ArrowLeft size={14}/> กลับหน้าแรก</Link><div className="rounded-xl border border-[var(--line)] bg-white p-6 sm:p-8"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--soft)] text-[var(--accent)]"><Atom size={22}/></div><h1 className="mt-5 text-xl font-semibold">เข้าสู่บ้านฟิสิกส์</h1><p className="mt-2 text-sm leading-7 text-[var(--muted)]">ใช้ Username และรหัสผ่านที่ได้รับจากผู้ดูแล เพื่อเข้าเรียนคอร์สของคุณ</p><LoginForm nextPath={nextPath}/><p className="mt-6 text-center text-[10px] leading-5 text-[var(--muted)]">บัญชีและสิทธิ์เข้าเรียนจัดการโดยผู้ดูแล</p></div></div></main>;
}
