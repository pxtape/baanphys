"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { classroomClient } from "@/lib/classroom-browser";
import { classroomEmail } from "@/lib/classroom-auth";

export function LiveLogin() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const client = classroomClient();
    let active = true;
    async function redirectUser() {
      const { data: { user } } = await client.auth.getUser();
      if (!user || !active) return;
      const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).single();
      if (active) router.replace(profile?.role === "admin" ? "/admin/students" : "/courses");
    }
    void redirectUser();
    const { data: { subscription } } = client.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN") setTimeout(() => void redirectUser(), 0); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [router]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const email = identifier.includes("@") ? identifier.trim() : classroomEmail(identifier);
      if (!email || (emailMode && !identifier.includes("@"))) { setMessage("กรอก Username ให้ถูกต้อง หรือใช้อีเมลบัญชีแอดมินเดิม"); return; }
      if (emailMode) {
        const callback = new URL(window.location.href); callback.hash = ""; callback.search = "";
        const { error } = await classroomClient().auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: callback.toString() } });
        setMessage(error ? "ส่งอีเมลไม่ได้ กรุณาตรวจอีเมลและรอสักครู่ก่อนลองใหม่" : "ส่งลิงก์แล้ว กรุณาเปิดอีเมลและกดลิงก์บนเบราว์เซอร์นี้");
      } else {
        const { error } = await classroomClient().auth.signInWithPassword({ email, password });
        if (error) setMessage("Username หรือรหัสผ่านไม่ถูกต้อง");
        else {
          setPassword("");
          const { data: { user } } = await classroomClient().auth.getUser();
          const { data: profile } = await classroomClient().from("profiles").select("role").eq("id", user!.id).single();
          router.replace(profile?.role === "admin" ? "/admin/students" : "/courses");
        }
      }
    } catch { setMessage("เชื่อมต่อไม่ได้ กรุณาลองใหม่"); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-5 py-10"><section className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-7"><Link href="/" className="text-xs text-[var(--muted)]">← บ้านฟิสิกส์</Link><p className="eyebrow mt-8">BAANPHYS CLASSROOM · BETA</p><h1 className="mt-3 text-2xl font-semibold">เข้าสู่ห้องเรียน</h1><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{emailMode ? "สำหรับบัญชีแอดมินเดิมที่เคยใช้อีเมลเข้าเรียน" : "ใช้ Username และรหัสผ่านที่ได้รับจากติวเตอร์"}</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-xs font-medium">{emailMode ? "อีเมลแอดมินเดิม" : "Username หรืออีเมลแอดมิน"}<input required type={emailMode ? "email" : "text"} autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="mt-2 w-full rounded-lg border border-[var(--line)] p-3 text-sm"/></label>{!emailMode && <label className="block text-xs font-medium">รหัสผ่าน<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-[var(--line)] p-3 text-sm"/></label>}<button disabled={busy} className="button-primary w-full disabled:opacity-50">{busy ? "กำลังดำเนินการ…" : emailMode ? "ส่งลิงก์เข้าอีเมล" : "เข้าสู่ระบบ"}</button></form>{message && <p role="status" className="mt-4 rounded-lg bg-[var(--soft)] p-3 text-xs leading-7">{message}</p>}<button type="button" onClick={() => { setEmailMode(!emailMode); setMessage(""); setPassword(""); }} className="mt-5 text-xs text-[var(--accent)] underline underline-offset-4">{emailMode ? "กลับไปใช้ Username / รหัสผ่าน" : "แอดมินเดิม: เข้าด้วยลิงก์อีเมล"}</button><p className="mt-6 text-[11px] leading-6 text-[var(--muted)]">ไม่มีการสมัครบัญชีเอง ติดต่อผู้ดูแลเพื่อรับสิทธิ์เรียน</p></section></main>;
}
