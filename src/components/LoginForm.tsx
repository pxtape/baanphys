"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { classroomEmail } from "@/lib/classroom-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ nextPath = "/courses" }: { nextPath?: string }) {
  const [mode, setMode] = useState<"password" | "email">("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth_callback_failed") {
      setMessage("ลิงก์เข้าสู่ระบบใช้ไม่ได้หรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่เมื่อระบบอนุญาตให้ส่งอีเมลอีกครั้ง");
    }
    if (!configured) return;
    const supabase = createClient();
    let active = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) window.location.replace(nextPath);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) window.location.replace(nextPath);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [configured, nextPath]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!configured) { setMessage("ระบบห้องเรียนยังอยู่ระหว่างตั้งค่า กรุณาติดต่อผู้ดูแล"); return; }
    const accountEmail = mode === "password" ? classroomEmail(username) : email.trim();
    if (!accountEmail) { setMessage("Username ต้องมี 3–40 ตัว ใช้ a–z, 0–9, จุด, ขีดกลาง หรือขีดล่าง และเริ่มกับจบด้วยตัวอักษรหรือตัวเลข"); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "password") {
        const { error } = await supabase.auth.signInWithPassword({ email: accountEmail, password });
        if (error) {
          setMessage(error.message.toLowerCase().includes("rate limit")
            ? "มีการเข้าสู่ระบบหลายครั้ง กรุณารอสักครู่แล้วลองใหม่"
            : "Username หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบหรือติดต่อผู้ดูแล");
          return;
        }
        setPassword("");
        window.location.assign(nextPath);
        return;
      }
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);
      const { error } = await supabase.auth.signInWithOtp({
        email: accountEmail,
        options: { emailRedirectTo: callbackUrl.toString(), shouldCreateUser: false },
      });
      if (error) {
        setMessage(error.message.toLowerCase().includes("rate limit")
          ? "Supabase จำกัดการส่งอีเมลชั่วคราว กรุณารอให้ส่งได้อีกครั้งก่อน แล้วค่อยขอลิงก์ใหม่เพียงครั้งเดียว"
          : "ส่งลิงก์ไม่สำเร็จ กรุณาตรวจสอบว่าใช้อีเมลของบัญชีเดิม หรือติดต่อผู้ดูแล");
        return;
      }
      setMessage("หากอีเมลนี้มีบัญชีเดิมอยู่ ระบบจะส่งลิงก์เข้าสู่ระบบให้ กรุณาเปิดอีเมลบนเบราว์เซอร์เดียวกัน");
    } catch {
      setMessage("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-[var(--line)] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--soft)]";
  return <div className="mt-6">
    <div className="mb-5 flex gap-1 rounded-lg bg-[var(--paper)] p-1" role="group" aria-label="วิธีเข้าสู่ระบบ">
      <button type="button" disabled={busy} aria-pressed={mode === "password"} onClick={() => { setMode("password"); setMessage(""); }} className={`flex-1 rounded-md px-2 py-2 text-xs ${mode === "password" ? "bg-white font-semibold shadow-sm" : "text-[var(--muted)]"}`}>Username / รหัสผ่าน</button>
      <button type="button" disabled={busy} aria-pressed={mode === "email"} onClick={() => { setMode("email"); setMessage(""); setPassword(""); }} className={`flex-1 rounded-md px-2 py-2 text-xs ${mode === "email" ? "bg-white font-semibold shadow-sm" : "text-[var(--muted)]"}`}>บัญชีอีเมลเดิม</button>
    </div>
    <form onSubmit={submit}>
      {mode === "password" ? <>
        <label htmlFor="username" className="mb-2 block text-xs font-medium">Username</label>
        <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={40} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username ที่ได้รับจากผู้ดูแล" className={inputClass}/>
        <label htmlFor="password" className="mb-2 mt-4 block text-xs font-medium">รหัสผ่าน</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass}/>
        <p className="mt-3 text-xs leading-6 text-[var(--muted)]">ใช้บัญชีที่ผู้ดูแลออกให้ หากลืมรหัสผ่านให้ติดต่อผู้ดูแล</p>
      </> : <>
        <label htmlFor="email" className="mb-2 block text-xs font-medium">อีเมลของคุณ</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className={inputClass}/>
        <p className="mt-3 text-xs leading-6 text-[var(--muted)]">สำหรับผู้ที่มีบัญชีอีเมลในระบบเดิมแล้วเท่านั้น</p>
      </>}
      <button disabled={busy} className="mt-4 w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">{busy ? "กำลังดำเนินการ…" : mode === "password" ? "เข้าสู่ห้องเรียน" : "ส่งลิงก์เข้าสู่ระบบ"}</button>
      {message && <p role="status" className="mt-3 rounded-lg bg-[var(--soft)] px-3 py-2 text-xs leading-6">{message}</p>}
    </form>
    <Link href="/preview/classroom" className="mt-5 block text-center text-xs text-[var(--accent)] hover:underline">ดูตัวอย่างห้องเรียน</Link>
  </div>;
}
