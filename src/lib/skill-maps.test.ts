import { describe, expect, it } from "vitest";
import { findPrerequisiteCycle, validateSkillMapDraft } from "@/lib/skill-maps";

const draft = {
  title: "กลศาสตร์ ค่าย 1",
  description: "พื้นฐานกลศาสตร์",
  readinessStage: "camp-1",
  isPublished: false,
  nodes: [
    { id: "vectors", title: "เวกเตอร์", subtitle: "พื้นฐาน", subject: "mechanics", formula: "", x: 20, y: 40 },
    { id: "motion", title: "การเคลื่อนที่", subtitle: "", subject: "mechanics", formula: "v=u+at", x: 260, y: 40 },
  ],
  edges: [{ source: "vectors", target: "motion" }],
};

describe("editable skill maps", () => {
  it("accepts a valid graph with multiple prerequisites", () => {
    const result = validateSkillMapDraft({ ...draft, nodes: [...draft.nodes, { ...draft.nodes[0], id: "forces", title: "แรง" }], edges: [...draft.edges, { source: "forces", target: "motion" }] });
    expect(result.error).toBeUndefined();
    expect(result.data?.edges).toHaveLength(2);
  });

  it("rejects edges outside the map and duplicate ids", () => {
    expect(validateSkillMapDraft({ ...draft, edges: [{ source: "missing", target: "motion" }] }).error).toMatch(/เส้นเชื่อม/);
    expect(validateSkillMapDraft({ ...draft, nodes: [...draft.nodes, draft.nodes[0]] }).error).toMatch(/ซ้ำ/);
  });

  it("finds a cycle but allows a branched graph", () => {
    expect(findPrerequisiteCycle(["a", "b", "c"], [{ source: "a", target: "b" }, { source: "b", target: "c" }, { source: "c", target: "a" }])).toEqual(["a", "b", "c", "a"]);
    expect(findPrerequisiteCycle(["a", "b", "c", "d"], [{ source: "a", target: "c" }, { source: "b", target: "c" }, { source: "c", target: "d" }])).toBeNull();
  });
});
