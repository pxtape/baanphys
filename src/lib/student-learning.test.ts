import { describe, expect, it } from "vitest";
import { calculateSkillProgress, calculateWeightedLearningProgress, isLearningStage } from "@/lib/student-learning";

describe("student learning focus", () => {
  it("accepts only supported readiness stages", () => {
    expect(isLearningStage("camp-1")).toBe(true);
    expect(isLearningStage("camp-9")).toBe(false);
  });

  it("calculates progress from unique completed skills", () => {
    expect(calculateSkillProgress(["a", "a", "b"], [{ skill_id: "a", status: "completed" }])).toEqual({ completed: 1, total: 2, percent: 50 });
  });

  it("does not show a percentage when no published skills exist", () => {
    expect(calculateSkillProgress([], [])).toEqual({ completed: 0, total: 0, percent: null });
  });

  it("uses teacher-assigned item weights within each skill", () => {
    const items = [
      { id: "sheet", skill_id: "suvat", weight: 50 },
      { id: "homework", skill_id: "suvat", weight: 50 },
      { id: "video", skill_id: "vectors", weight: 100 },
    ];
    expect(calculateWeightedLearningProgress(items, [{ item_id: "homework", status: "completed" }])).toMatchObject({
      completedWeight: 50,
      totalWeight: 200,
      percent: 25,
      skillsWithContent: 2,
    });
  });
});
