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
  await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, content);
}
async function copy(relative, transform = (source) => source) { await write(relative, transform(await fs.readFile(path.join(root, relative), "utf8"))); }

// Explicit allowlist. Edge Functions, server actions, environment files and
// privileged credentials never enter the static site. Live mutations use RLS
// or the authenticated classroom-admin Edge Function.
for (const relative of [
  "src/components/classroom/StudyDashboard.tsx", "src/lib/study-tracking.ts",
  "src/components/classroom/ClassroomAdmin.tsx", "src/components/classroom/ClassroomContent.tsx",
  "src/components/classroom/LiveClassroom.tsx", "src/components/classroom/LiveLogin.tsx",
  "src/lib/course-catalog.ts", "src/lib/classroom-browser.ts", "src/lib/classroom-public.ts",
  "src/lib/classroom-auth.ts", "src/lib/drive-link.ts", "src/app/preview/classroom/page.tsx",
  "src/app/preview/admin/page.tsx", "postcss.config.mjs",
]) await copy(relative);
await copy("src/components/classroom/StudentClassroom.tsx", (source) => source
  .replace('window.location.assign("/login")', `window.location.assign(${JSON.stringify(basePath + "/login/")})`)
  .replace('href="/dashboard"', 'href="/courses"').replace(">แดชบอร์ด<", ">คอร์สของฉัน<"));
await copy("src/app/page.tsx", (source) => source.replace('href="/academy"', 'href="/courses"').replace("พื้นที่เรียนรู้เดิม", "เข้าห้องเรียน"));
await copy("src/app/globals.css", (source) => source.replace('@import "@xyflow/react/dist/style.css";', "").replace('@import "katex/dist/katex.min.css";', "").replace('@import "tailwindcss";', '@import "tailwindcss";\n@source "../components";'));

const originalPackage = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
await write("package.json", JSON.stringify({ ...originalPackage, name: "baanphys-pages", scripts: {} }, null, 2));
const tsconfig = JSON.parse(await fs.readFile(path.join(root, "tsconfig.json"), "utf8")); tsconfig.exclude = ["node_modules"];
await write("tsconfig.json", JSON.stringify(tsconfig, null, 2));
await write("next-env.d.ts", '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n');
await write("next.config.mjs", `export default ${JSON.stringify({ output: "export", basePath, trailingSlash: true, images: { unoptimized: true }, outputFileTracingRoot: root }, null, 2)};\n`);
await write("src/app/layout.tsx", `import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "บ้านฟิสิกส์ | ห้องเรียนออนไลน์", description: "คอร์สเรียนบ้านฟิสิกส์ วิดีโอ ชีท และการบ้าน" };
export default function Layout({children}:Readonly<{children:React.ReactNode}>) {
 return <html lang="th"><body>{children}</body></html>;
}
`);
await write("src/app/courses/actions.ts", 'export {setClassroomTask,advanceClassroomStudent,enrollClassroomStudent,revokeClassroomEnrollment} from "@/lib/classroom-browser";\n');
await write("src/app/admin/students/actions.ts", 'export {createClassroomStudent} from "@/lib/classroom-browser";\n');
await write("src/lib/supabase/client.ts", 'export {classroomClient as createClient} from "@/lib/classroom-browser";\n');
await write("src/app/courses/page.tsx", 'import {LiveClassroom} from "@/components/classroom/LiveClassroom"; export default function Page(){return <LiveClassroom/>;}\n');
for (const relative of ["src/app/admin/page.tsx", "src/app/admin/students/page.tsx"]) await write(relative, 'import {LiveClassroom} from "@/components/classroom/LiveClassroom"; export default function Page(){return <LiveClassroom admin/>;}\n');
await write("src/app/admin/content/page.tsx", 'import {LiveClassroom} from "@/components/classroom/LiveClassroom"; export default function Page(){return <LiveClassroom admin content/>;}\n');
await write("src/app/login/page.tsx", 'import {LiveLogin} from "@/components/classroom/LiveLogin"; export default function Page(){return <LiveLogin/>;}\n');

console.log(`Building GitHub Pages classroom at ${basePath || "/"}`);
const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "build", output], { cwd: output, stdio: "inherit", shell: false, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
  child.on("error", reject); child.on("exit", resolve);
});
if (exitCode !== 0) process.exit(typeof exitCode === "number" ? exitCode : 1);
await write("out/.nojekyll", "");
console.log(`Pages artifact ready: ${path.join(output, "out")}`);
