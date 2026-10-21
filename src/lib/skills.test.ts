import { describe, expect, it } from "vitest";
import { getMechanicsSkillsForProgress, mechanicsSkills, nextSkill } from "@/lib/skills";

describe("Mechanics skill tree data", () => {
  it("has one current topic after the vector foundations", () => {
    expect(mechanicsSkills.filter((skill) => skill.status === "current")).toHaveLength(1);
    expect(mechanicsSkills[0].id).toBe("vectors");
    expect(nextSkill?.id).toBe("kinematics");
  });

  it("includes a formula for each topic", () => {
    expect(mechanicsSkills.every((skill) => Boolean(skill.formula))).toBe(true);
  });

  it("unlocks later topics from saved progress", () => {
    const skills = getMechanicsSkillsForProgress([{ skill_id: "vectors", status: "completed" }]);
    expect(skills.find((skill) => skill.id === "vectors")?.status).toBe("completed");
    expect(skills.find((skill) => skill.id === "kinematics")?.status).toBe("current");
    expect(skills.find((skill) => skill.id === "projectile")?.status).toBe("locked");
  });
});
