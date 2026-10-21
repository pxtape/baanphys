import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, ".pages-build");
const basePath = process.env.PAGES_BASE_PATH ?? "/baanphys";
if (basePath !== "" && !/^\/[a-zA-Z0-9._-]+$/.test(basePath)) throw new Error("Invalid GitHub Pages base path");

async function write(relative, content) {
  const target = path.resolve(output, relative);
  if (!target.startsWith(output + path.sep)) throw new Error("Export target is outside the build folder");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
}
async function copy(relative, transform = (source) => source) {
  await write(relative, transform(await fs.readFile(path.join(root, relative), "utf8")));
}

// Only these public demo components enter the Pages build. In particular there
// is no copy of middleware, environment files, real auth, DB loaders or media.
for (const relative of [
  "src/components/classroom/StudentClassroom.tsx", "src/components/classroom/ClassroomAdmin.tsx",
  "src/lib/course-catalog.ts", "src/app/preview/classroom/page.tsx", "src/app/preview/admin/page.tsx",
  "postcss.config.mjs",
]) await copy(relative);

await copy("src/app/page.tsx", (source) => source.replace('href="/academy"', 'href="/preview/classroom"').replace("พื้นที่เรียนรู้เดิม", "เข้าห้องเรียนตัวอย่าง"));
await copy("src/app/globals.css", (source) => source
  .replace('@import "@xyflow/react/dist/style.css";', "")
  .replace('@import "katex/dist/katex.min.css";', "")
  .replace('@import "tailwindcss";', '@import "tailwindcss";\n@source "../components";'));

const originalPackage = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
await write("package.json", JSON.stringify({ ...originalPackage, name: "baanphys-pages-preview", scripts: {} }, null, 2));
const tsconfig = JSON.parse(await fs.readFile(path.join(root, "tsconfig.json"), "utf8"));
tsconfig.exclude = ["node_modules"];
await write("tsconfig.json", JSON.stringify(tsconfig, null, 2));
await write("next-env.d.ts", '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n');
await write("next.config.mjs", `export default ${JSON.stringify({ output: "export", basePath, trailingSlash: true, images: { unoptimized: true }, outputFileTracingRoot: root }, null, 2)};\n`);

await write("src/app/layout.tsx", `import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "บ้านฟิสิกส์ | ตัวอย่างคอร์สเรียน", description: "โครงร่างคอร์สบ้านฟิสิกส์บน GitHub Pages" };
export default function Layout({children}:Readonly<{children:React.ReactNode}>) {
  return <html lang="th"><body><div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs leading-6 text-amber-900">เว็บไซต์ตัวอย่างบน GitHub Pages · ยังไม่เปิดใช้บัญชีนักเรียนจริง</div>{children}</body></html>;
}
`);

await write("src/app/courses/actions.ts", `type Result = { error?: string };
const unavailable = async (...args: unknown[]): Promise<Result> => { void args; return { error: "หน้านี้เป็นตัวอย่าง ยังไม่เชื่อมระบบบัญชีจริง" }; };
export const setClassroomTask = unavailable;
export const advanceClassroomStudent = unavailable;
export const enrollClassroomStudent = unavailable;
export const revokeClassroomEnrollment = unavailable;
`);
await write("src/app/admin/students/actions.ts", `export async function createClassroomStudent(...args: unknown[]): Promise<{error?:string;student?:{id:string;displayName:string;username:string}}> {
  void args;
  return { error: "GitHub Pages ชุดนี้เปิดให้ทดลองเท่านั้น ยังไม่สร้างบัญชีจริง" };
}
`);
await write("src/lib/supabase/client.ts", `export function createClient() {
  return { auth: { async signOut() { return { error: new Error("ตัวอย่างนี้ไม่ได้เชื่อมบัญชีจริง") }; } } };
}
`);
await write("src/app/courses/page.tsx", 'export { default } from "../preview/classroom/page";\n');
await write("src/app/admin/page.tsx", 'export { default } from "../preview/admin/page";\n');
await write("src/app/admin/students/page.tsx", 'export { default } from "../../preview/admin/page";\n');
await write("src/app/login/page.tsx", `import Link from "next/link";
export default function LoginPreview() {
  return <main className="mx-auto flex min-h-[80vh] max-w-lg items-center px-5 py-12"><section className="rounded-2xl border border-[var(--line)] bg-white p-8"><p className="eyebrow">BAANPHYS · WEBSITE PREVIEW</p><h1 className="mt-4 text-2xl font-semibold">ห้องเรียนตัวอย่างพร้อมให้ลอง</h1><p className="mt-4 text-sm leading-8 text-[var(--muted)]">เว็บไซต์นี้เป็นโครงร่างสำหรับทดลองเส้นทางการเรียนและหลังบ้าน ยังไม่รับ Username หรือรหัสผ่านจริง ข้อมูลตัวอย่างเก็บเฉพาะเบราว์เซอร์ของคุณ</p><div className="mt-6 flex flex-wrap gap-3"><Link className="button-primary" href="/preview/classroom">ลองเป็นนักเรียน</Link><Link className="rounded-lg border border-[var(--line)] px-5 py-3 text-sm" href="/preview/admin">ลองหลังบ้าน</Link></div><Link href="/" className="mt-6 block text-xs text-[var(--muted)] underline">กลับหน้าแรก</Link></section></main>;
}
`);

console.log(`Building GitHub Pages demo at ${basePath || "/"} (no real auth or private materials)`);
const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "build", output], {
    cwd: output, stdio: "inherit", shell: false, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  child.on("error", reject);
  child.on("exit", resolve);
});
if (exitCode !== 0) process.exit(typeof exitCode === "number" ? exitCode : 1);
await write("out/.nojekyll", "");
console.log(`Pages artifact ready: ${path.join(output, "out")}`);
