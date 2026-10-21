import { describe, expect, it } from "vitest";
import { curriculumSkills, diagnosticQuestions, getCurriculumForProgress, getReadinessStage, mockExamQuestions } from "@/lib/curriculum";

describe("Academy curriculum", () => {
  it("contains the three branches and four readiness stages", () => {
    expect(curriculumSkills).toHaveLength(19);
    expect(new Set(curriculumSkills.map((skill) => skill.branch)).size).toBe(3);
    expect(new Set(curriculumSkills.map((skill) => skill.stage)).size).toBe(4);
  });

  it("makes only prerequisite-ready skills available and preserves in-progress state", () => {
    const initial = getCurriculumForProgress([]);
    expect(initial.find((skill) => skill.id === "vectors")?.status).toBe("available");
    expect(initial.find((skill) => skill.id === "kinematics")?.status).toBe("locked");

    const afterVectors = getCurriculumForProgress([{ skill_id: "vectors", status: "completed" }, { skill_id: "kinematics", status: "completed" }, { skill_id: "newton", status: "in_progress" }]);
    expect(afterVectors.find((skill) => skill.id === "vectors")?.status).toBe("mastered");
    expect(afterVectors.find((skill) => skill.id === "newton")?.status).toBe("in_progress");
    expect(afterVectors.find((skill) => skill.id === "projectile")?.status).toBe("available");
    expect(afterVectors.find((skill) => skill.id === "energy")?.status).toBe("locked");
  });
});

describe("Assessments", () => {
  it("uses complete, branch-spanning question sets", () => {
    expect(diagnosticQuestions).toHaveLength(8);
    expect(mockExamQuestions).toHaveLength(8);
    expect(new Set(diagnosticQuestions.map((question) => question.branch)).size).toBe(3);
  });

  it("maps score bands to internal readiness labels", () => {
    expect(getReadinessStage(2, 8)).toBe("pre-camp-1");
    expect(getReadinessStage(4, 8)).toBe("camp-1");
    expect(getReadinessStage(6, 8)).toBe("camp-2");
    expect(getReadinessStage(8, 8)).toBe("olympiad");
  });
});
