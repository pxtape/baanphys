import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(root, ".pages-build", "out");
const basePath = process.env.PAGES_BASE_PATH ?? "/baanphys";
async function walk(folder) {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const lists = await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)]));
  return lists.flat();
}
const files = await walk(directory);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
let checkedReferences = 0;
for (const file of htmlFiles) {
  const html = await fs.readFile(file, "utf8");
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    const url = match[1].replace(/&amp;/g, "&").split(/[?#]/)[0];
    if (!url.startsWith("/")) continue;
    if (basePath && !url.startsWith(basePath + "/") && url !== basePath) throw new Error(`Missing base path: ${url}`);
    const relative = url.slice(basePath.length).replace(/^\//, "");
    let target = path.resolve(directory, decodeURIComponent(relative));
    if (target !== directory && !target.startsWith(directory + path.sep)) throw new Error("Asset outside artifact");
    let stat;
    try { stat = await fs.stat(target); } catch { throw new Error(`Broken exported link: ${url} in ${path.relative(directory, file)}`); }
    if (stat.isDirectory()) await fs.access(path.join(target, "index.html"));
    checkedReferences++;
  }
}
for (const relative of ["index.html", "preview/classroom/index.html", "preview/admin/index.html", "login/index.html", "admin/content/index.html", "admin/calendar/index.html", "calendar/index.html", "profile/index.html"]) await fs.access(path.join(directory, relative));
for (const file of files.filter((file) => /\.(js|html|txt)$/.test(file))) {
  const content = await fs.readFile(file, "utf8");
  if (/(?:SUPABASE_SERVICE_ROLE_KEY|sb_secret_[A-Za-z0-9_-]{10,}|-----BEGIN PRIVATE KEY-----)/.test(content)) throw new Error(`Private configuration in ${path.relative(directory, file)}`);
}
const login = await fs.readFile(path.join(directory, "login/index.html"), "utf8");
if (!/<input\b[^>]*type="password"/.test(login)) throw new Error("Live login must include a password input");
const css = await Promise.all(files.filter((file) => file.endsWith(".css")).map((file) => fs.readFile(file, "utf8")));
if (!css.some((content) => content.includes(".grid-cols-2") && content.includes(".min-h-screen"))) throw new Error("Expected classroom CSS not generated");
console.log(`Verified ${htmlFiles.length} HTML files and ${checkedReferences} local links/assets; no server secrets; live login included.`);
