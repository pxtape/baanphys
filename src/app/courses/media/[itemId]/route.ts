import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}

function reject(status: number, text: string) {
  return new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  if (!isSupabaseConfigured()) return reject(503, "ยังไม่พร้อมให้บริการ");
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.is_anonymous) return reject(401, "กรุณาเข้าสู่ระบบก่อนเปิดเนื้อหา");
  const { itemId } = await params;
  // The user's own session queries the item; RLS verifies enrollment and level.
  const { data: item, error } = await supabase.from("classroom_items").select("title,drive_file_id,kind").eq("id", itemId).maybeSingle();
  if (error || !item) return reject(404, "ไม่พบเนื้อหาหรือคุณยังไม่มีสิทธิ์เข้าถึง");
  if (!item.drive_file_id || !/^[a-zA-Z0-9_-]{10,200}$/.test(item.drive_file_id)) return reject(404, "รอลิงก์เนื้อหาจากติวเตอร์");
  const { data: profile } = await supabase.from("classroom_accounts").select("display_name,username").eq("user_id", user.id).maybeSingle();
  const name = escapeHtml(String(profile?.display_name ?? "นักเรียน"));
  const username = escapeHtml(String(profile?.username ?? user.id.slice(0, 8)));
  const timestamp = escapeHtml(new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }).format(new Date()));
  const title = escapeHtml(String(item.title));
  const source = `https://drive.google.com/file/d/${encodeURIComponent(item.drive_file_id)}/preview`;
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#14232b;color:white;font-family:Tahoma,sans-serif}.frame{position:relative;width:100%;height:100%}iframe{width:100%;height:100%;border:0}.watermark{position:absolute;z-index:2;pointer-events:none;user-select:none;max-width:70%;font-size:clamp(10px,2vw,15px);padding:7px 12px;border-radius:4px;background:rgba(0,0,0,.25);color:rgba(255,255,255,.67);animation:move 29s steps(1,end) infinite}.badge{position:absolute;bottom:54px;right:12px;font-size:10px;pointer-events:none;color:#ddd;text-shadow:0 1px 3px black}@keyframes move{0%,100%{left:6%;top:12%}25%{left:48%;top:32%}50%{left:15%;top:67%}75%{left:46%;top:76%}}@media(prefers-reduced-motion:reduce){.watermark{animation:none;left:8%;top:15%}}
  </style></head><body><div class="frame"><iframe title="${title}" src="${source}" allow="fullscreen 'none'" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-presentation"></iframe><div aria-hidden="true" style="position:absolute;right:0;top:0;width:64px;height:64px;z-index:3;background:transparent"></div><div class="watermark">${name} · ${username}<br><small>${timestamp}</small></div><span class="badge">บ้านฟิสิกส์ · สำหรับผู้เรียนที่ได้รับสิทธิ์</span></div></body></html>`;
  return new Response(html, { headers: {
    "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store, max-age=0",
    "Content-Security-Policy": "default-src 'none'; frame-src https://drive.google.com; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
    "X-Frame-Options": "SAMEORIGIN", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow, noarchive", "Permissions-Policy": "fullscreen=(self)",
  } });
}
