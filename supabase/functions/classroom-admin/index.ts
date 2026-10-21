import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const allowedOrigins = new Set(["https://pxtape.github.io", "http://localhost:3000", "http://127.0.0.1:3000"]);
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://pxtape.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
  };
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (origin && !allowedOrigins.has(origin)) return json({ error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: { user }, error: authError } = await userClient.auth.getUser(authorization.slice(7));
    if (authError || !user || user.is_anonymous) return json({ error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" }, 401);
    const { data: actor, error: actorError } = await userClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (actorError || actor?.role !== "admin") return json({ error: "เฉพาะแอดมินเท่านั้นที่สร้างนักเรียนได้" }, 403);
    const text = await req.text();
    if (text.length > 8192) return json({ error: "ข้อมูลยาวเกินกำหนด" }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]$/.test(username) || username.includes("..")) return json({ error: "Username ต้องมี 3–40 ตัว ใช้ภาษาอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง" }, 400);
    if (!displayName || displayName.length > 100 || password.length < 12 || password.length > 128) return json({ error: "กรอกชื่อนักเรียน และรหัสผ่าน 12–128 ตัวอักษร" }, 400);
    // Construct the privileged client only after verifying the caller's DB role.
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.auth.admin.createUser({ email: `${username}@classroom.invalid`, password, email_confirm: true, user_metadata: { display_name: displayName } });
    if (error || !data.user) return json({ error: "สร้างบัญชีไม่ได้ Username อาจมีผู้ใช้แล้ว" }, 400);
    const { error: accountError } = await admin.from("classroom_accounts").insert({ user_id: data.user.id, username, display_name: displayName });
    if (accountError) {
      // Roll back only the fresh account created by this request, never an existing user.
      await admin.auth.admin.deleteUser(data.user.id);
      return json({ error: "บันทึกนักเรียนไม่ได้ กรุณาลองใหม่" }, 500);
    }
    return json({ student: { id: data.user.id, username, displayName } });
  } catch {
    return json({ error: "ระบบบัญชีขัดข้อง กรุณาลองใหม่" }, 500);
  }
});
