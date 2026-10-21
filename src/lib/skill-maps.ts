export type EditableSkillNode = {
  id: string;
  title: string;
  subtitle: string;
  subject: string;
  formula: string;
  x: number;
  y: number;
};

export type SkillMapEdge = { source: string; target: string };

export type SkillMapDraft = {
  mapId: string | null;
  title: string;
  description: string;
  readinessStage: string;
  isPublished: boolean;
  nodes: EditableSkillNode[];
  edges: SkillMapEdge[];
};

export function validateSkillMapDraft(value: unknown): { data?: SkillMapDraft; error?: string } {
  if (!value || typeof value !== "object") return { error: "รูปแบบแผนที่ไม่ถูกต้อง" };
  const draft = value as Partial<SkillMapDraft>;
  if (typeof draft.title !== "string" || draft.title.trim().length < 2 || draft.title.trim().length > 120) return { error: "ชื่อแผนที่ต้องมี 2–120 ตัวอักษร" };
  if (!Array.isArray(draft.nodes) || draft.nodes.length < 1 || draft.nodes.length > 200) return { error: "แผนที่ต้องมี 1–200 ทักษะ" };
  if (!Array.isArray(draft.edges) || draft.edges.length > 500) return { error: "แผนที่เชื่อมได้ไม่เกิน 500 เส้น" };
  const ids = new Set<string>();
  for (const node of draft.nodes) {
    if (!node || typeof node.id !== "string" || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(node.id)) return { error: "รหัสทักษะไม่ถูกต้อง" };
    if (ids.has(node.id)) return { error: "รหัสทักษะซ้ำกัน" };
    ids.add(node.id);
    if (typeof node.title !== "string" || node.title.trim().length < 1 || node.title.length > 120) return { error: "ชื่อทักษะต้องมี 1–120 ตัวอักษร" };
    if (typeof node.subtitle !== "string" || node.subtitle.length > 240 || typeof node.subject !== "string" || node.subject.length > 80) return { error: "รายละเอียดทักษะยาวเกินกำหนด" };
    if (typeof node.formula !== "string" || node.formula.length > 500 || !Number.isFinite(node.x) || !Number.isFinite(node.y)) return { error: "สมการหรือตำแหน่งทักษะไม่ถูกต้อง" };
  }
  const seenEdges = new Set<string>();
  for (const edge of draft.edges) {
    if (!edge || !ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) return { error: "เส้นเชื่อมต้องเชื่อมทักษะที่อยู่ในแผนที่และห้ามเชื่อมกลับมาที่ตัวเอง" };
    const key = `${edge.source}->${edge.target}`;
    if (seenEdges.has(key)) return { error: "มีเส้นเชื่อมซ้ำกัน" };
    seenEdges.add(key);
  }
  if (findPrerequisiteCycle([...ids], draft.edges)) return { error: "เส้น prerequisite ต้องไม่มีวงจรย้อนกลับ" };
  return { data: { ...draft, mapId: draft.mapId ?? null, title: draft.title.trim(), description: (draft.description ?? "").slice(0, 1000), readinessStage: draft.readinessStage ?? "pre-camp-1", isPublished: Boolean(draft.isPublished), nodes: draft.nodes, edges: draft.edges } as SkillMapDraft };
}

export function findPrerequisiteCycle(nodes: string[], edges: SkillMapEdge[]): string[] | null {
  const outgoing = new Map(nodes.map((id) => [id, [] as string[]]));
  for (const edge of edges) outgoing.get(edge.source)?.push(edge.target);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];
  function visit(id: string): string[] | null {
    if (visiting.has(id)) return [...path.slice(path.indexOf(id)), id];
    if (visited.has(id)) return null;
    visiting.add(id); path.push(id);
    for (const next of outgoing.get(id) ?? []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    path.pop(); visiting.delete(id); visited.add(id);
    return null;
  }
  for (const id of nodes) { const cycle = visit(id); if (cycle) return cycle; }
  return null;
}
