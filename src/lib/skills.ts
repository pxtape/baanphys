export type Skill = {
  id: string;
  title: string;
  subtitle: string;
  status: "completed" | "current" | "locked";
  formula?: string;
  prerequisites: string[];
  x: number;
  y: number;
};

export const mechanicsSkills: Skill[] = [
  { id: "vectors", title: "เวกเตอร์", subtitle: "ปริมาณสเกลาร์และเวกเตอร์", status: "completed", formula: "\\vec{A} = A_x\\hat{i} + A_y\\hat{j}", prerequisites: [], x: 20, y: 60 },
  { id: "kinematics", title: "การเคลื่อนที่", subtitle: "ตำแหน่ง · ความเร็ว · ความเร่ง", status: "current", formula: "v = u + at", prerequisites: ["vectors"], x: 250, y: 60 },
  { id: "projectile", title: "โปรเจกไทล์", subtitle: "การเคลื่อนที่สองมิติ", status: "locked", formula: "R = \\frac{u^2 \\sin 2\\theta}{g}", prerequisites: ["kinematics"], x: 480, y: 0 },
  { id: "newton", title: "กฎของนิวตัน", subtitle: "แรงและสมดุล", status: "locked", formula: "\\sum \\vec{F} = m\\vec{a}", prerequisites: ["kinematics"], x: 480, y: 150 },
  { id: "energy", title: "งานและพลังงาน", subtitle: "อนุรักษ์พลังงานกล", status: "locked", formula: "K + U = \\mathrm{constant}", prerequisites: ["projectile", "newton"], x: 710, y: 75 },
];

export const nextSkill = mechanicsSkills.find((skill) => skill.status === "current");

export function getMechanicsSkillsForProgress(progress: { skill_id: string; status: string }[]): Skill[] {
  const saved = new Map(progress.map((item) => [item.skill_id, item.status]));
  const completed = new Set(progress.filter((item) => item.status === "completed").map((item) => item.skill_id));
  let currentAssigned = false;

  return mechanicsSkills.map((skill) => {
    const savedStatus = saved.get(skill.id);
    if (savedStatus === "completed") return { ...skill, status: "completed" };
    const prerequisitesMet = skill.prerequisites.every((id) => completed.has(id));
    if (prerequisitesMet && !currentAssigned && (!savedStatus || savedStatus === "in_progress")) {
      currentAssigned = true;
      return { ...skill, status: "current" };
    }
    return { ...skill, status: "locked" };
  });
}
