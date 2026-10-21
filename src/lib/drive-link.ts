export function parseDriveFileId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !["drive.google.com", "docs.google.com"].includes(url.hostname) || url.username || url.password) return null;
    const id = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? url.searchParams.get("id");
    return id && /^[a-zA-Z0-9_-]{10,200}$/.test(id) ? id : null;
  } catch { return null; }
}
