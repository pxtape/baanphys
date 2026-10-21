export type LearningItemKind = "sheet" | "video" | "homework";

export type LearningItemDraft = {
  id: string | null;
  skillId: string;
  title: string;
  kind: LearningItemKind;
  resourceUrl: string;
  weight: number;
  sortOrder: number;
  isPublished: boolean;
};

export function validateLearningItem(value: unknown): { data?: LearningItemDraft; error?: string } {
  if (!value || typeof value !== "object") return { error: "ข้อมูลบทเรียนไม่ถูกต้อง" };
  const draft = value as Partial<LearningItemDraft>;
  if (typeof draft.skillId !== "string" || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(draft.skillId)) return { error: "ไม่พบรหัสทักษะ" };
  if (typeof draft.title !== "string" || draft.title.trim().length < 2 || draft.title.length > 160) return { error: "ชื่อเนื้อหาต้องมี 2–160 ตัวอักษร" };
  if (draft.kind !== "sheet" && draft.kind !== "video" && draft.kind !== "homework") return { error: "เลือกประเภทเนื้อหาไม่ถูกต้อง" };
  if (typeof draft.resourceUrl !== "string" || draft.resourceUrl.length > 2048) return { error: "ลิงก์ไม่ถูกต้อง" };
  let url: URL;
  try { url = new URL(draft.resourceUrl); } catch { return { error: "กรุณาใส่ลิงก์เต็มที่ขึ้นต้นด้วย https://" }; }
  if (url.protocol !== "https:") return { error: "อนุญาตเฉพาะลิงก์ https://" };
  const isYoutube = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.hostname);
  const isDrive = ["drive.google.com", "docs.google.com"].includes(url.hostname);
  if (draft.kind === "video" ? !isYoutube : !isDrive) return { error: draft.kind === "video" ? "วิดีโอต้องเป็นลิงก์ YouTube" : "ชีทและ HW ต้องเป็นลิงก์ Google Drive" };
  const weight = Number(draft.weight);
  if (!Number.isInteger(weight) || weight < 1 || weight > 100) return { error: "น้ำหนักต้องอยู่ระหว่าง 1–100%" };
  const sortOrder = Number(draft.sortOrder ?? 0);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 500) return { error: "ลำดับต้องอยู่ระหว่าง 0–500" };
  if (draft.id != null && typeof draft.id !== "string") return { error: "รหัสเนื้อหาไม่ถูกต้อง" };
  return { data: { id: draft.id ?? null, skillId: draft.skillId, title: draft.title.trim(), kind: draft.kind, resourceUrl: url.toString(), weight, sortOrder, isPublished: Boolean(draft.isPublished) } };
}
