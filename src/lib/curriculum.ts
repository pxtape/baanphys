export type ReadinessStage = "pre-camp-1" | "camp-1" | "camp-2" | "olympiad";
export type PhysicsBranch = "mechanics" | "thermal-waves" | "electricity-magnetism";
export type CurriculumStatus = "locked" | "available" | "in_progress" | "mastered";

export const readinessStages: { id: ReadinessStage; label: string; thai: string }[] = [
  { id: "pre-camp-1", label: "Pre-Camp 1", thai: "เตรียมพื้นฐาน" },
  { id: "camp-1", label: "Camp 1", thai: "ต่อยอดหลักการ" },
  { id: "camp-2", label: "Camp 2", thai: "ประยุกต์หลายแนวคิด" },
  { id: "olympiad", label: "Olympiad", thai: "โจทย์ระดับสูง" },
];

export const physicsBranches: { id: PhysicsBranch; label: string; thai: string }[] = [
  { id: "mechanics", label: "Mechanics", thai: "กลศาสตร์" },
  { id: "thermal-waves", label: "Thermal & Waves", thai: "ความร้อนและคลื่น" },
  { id: "electricity-magnetism", label: "Electricity & Magnetism", thai: "ไฟฟ้าและแม่เหล็ก" },
];

export type CurriculumSkill = {
  id: string;
  title: string;
  subtitle: string;
  branch: PhysicsBranch;
  stage: ReadinessStage;
  prerequisites: string[];
  formula: string;
  x: number;
  y: number;
  status: CurriculumStatus;
};

const stageX: Record<ReadinessStage, number> = { "pre-camp-1": 60, "camp-1": 470, "camp-2": 880, olympiad: 1290 };

const skillSeed: Omit<CurriculumSkill, "x" | "y" | "status">[] = [
  { id: "vectors", title: "เวกเตอร์", subtitle: "ปริมาณสเกลาร์และเวกเตอร์", branch: "mechanics", stage: "pre-camp-1", prerequisites: [], formula: "\\vec{A}=A_x\\hat{i}+A_y\\hat{j}" },
  { id: "kinematics", title: "การเคลื่อนที่", subtitle: "ตำแหน่ง ความเร็ว ความเร่ง", branch: "mechanics", stage: "pre-camp-1", prerequisites: ["vectors"], formula: "v=u+at" },
  { id: "projectile", title: "โปรเจกไทล์", subtitle: "การเคลื่อนที่สองมิติ", branch: "mechanics", stage: "camp-1", prerequisites: ["kinematics"], formula: "R=\\frac{u^2\\sin 2\\theta}{g}" },
  { id: "newton", title: "กฎของนิวตัน", subtitle: "แรงและแผนภาพวัตถุอิสระ", branch: "mechanics", stage: "camp-1", prerequisites: ["kinematics"], formula: "\\sum \\vec{F}=m\\vec{a}" },
  { id: "energy", title: "งานและพลังงาน", subtitle: "งาน พลังงาน และการอนุรักษ์", branch: "mechanics", stage: "camp-2", prerequisites: ["projectile", "newton"], formula: "W=\\Delta K" },
  { id: "rotation", title: "การหมุน", subtitle: "ทอร์กและโมเมนต์ความเฉื่อย", branch: "mechanics", stage: "camp-2", prerequisites: ["energy"], formula: "\\tau=I\\alpha" },
  { id: "orbital-motion", title: "แรงโน้มถ่วงและวงโคจร", subtitle: "สนามโน้มถ่วงและแรงสู่ศูนย์กลาง", branch: "mechanics", stage: "olympiad", prerequisites: ["rotation"], formula: "F=GMm/r^2" },

  { id: "thermal-basics", title: "อุณหภูมิและความร้อน", subtitle: "สมดุลความร้อนและการถ่ายเท", branch: "thermal-waves", stage: "pre-camp-1", prerequisites: [], formula: "Q=mc\\Delta T" },
  { id: "ideal-gas", title: "แก๊สอุดมคติ", subtitle: "สถานะและทฤษฎีจลน์", branch: "thermal-waves", stage: "pre-camp-1", prerequisites: ["thermal-basics"], formula: "PV=nRT" },
  { id: "thermodynamics", title: "อุณหพลศาสตร์", subtitle: "พลังงานภายในและกฎข้อที่หนึ่ง", branch: "thermal-waves", stage: "camp-1", prerequisites: ["ideal-gas"], formula: "\\Delta U=Q-W" },
  { id: "oscillations", title: "การสั่น", subtitle: "การเคลื่อนที่ฮาร์มอนิกอย่างง่าย", branch: "thermal-waves", stage: "camp-1", prerequisites: ["kinematics"], formula: "a=-\\omega^2x" },
  { id: "waves", title: "คลื่น", subtitle: "การแทรกสอดและคลื่นนิ่ง", branch: "thermal-waves", stage: "camp-2", prerequisites: ["oscillations"], formula: "v=f\\lambda" },
  { id: "optics", title: "ทัศนศาสตร์", subtitle: "ภาพ การหักเห และเครื่องมือเชิงแสง", branch: "thermal-waves", stage: "olympiad", prerequisites: ["waves"], formula: "n_1\\sin\\theta_1=n_2\\sin\\theta_2" },

  { id: "charge-field", title: "ประจุและสนามไฟฟ้า", subtitle: "แรงคูลอมบ์และสนามไฟฟ้า", branch: "electricity-magnetism", stage: "pre-camp-1", prerequisites: [], formula: "F=kq_1q_2/r^2" },
  { id: "potential", title: "ศักย์ไฟฟ้า", subtitle: "พลังงานศักย์และความต่างศักย์", branch: "electricity-magnetism", stage: "pre-camp-1", prerequisites: ["charge-field"], formula: "V=U/q" },
  { id: "circuits", title: "วงจรไฟฟ้า", subtitle: "กระแส ความต้านทาน และกฎของเคอร์ชอฟฟ์", branch: "electricity-magnetism", stage: "camp-1", prerequisites: ["potential"], formula: "V=IR" },
  { id: "magnetism", title: "สนามแม่เหล็ก", subtitle: "แรงแม่เหล็กต่อประจุและกระแส", branch: "electricity-magnetism", stage: "camp-1", prerequisites: ["circuits"], formula: "F=qvB\\sin\\theta" },
  { id: "induction", title: "การเหนี่ยวนำ", subtitle: "ฟลักซ์และกฎของฟาราเดย์", branch: "electricity-magnetism", stage: "camp-2", prerequisites: ["magnetism"], formula: "\\mathcal{E}=-d\\Phi_B/dt" },
  { id: "em-waves", title: "คลื่นแม่เหล็กไฟฟ้า", subtitle: "สนามไฟฟ้า สนามแม่เหล็ก และพลังงาน", branch: "electricity-magnetism", stage: "olympiad", prerequisites: ["induction", "waves"], formula: "c=1/\\sqrt{\\mu_0\\epsilon_0}" },
];

export const curriculumSkills: CurriculumSkill[] = skillSeed.map((skill) => {
  const branchRow = physicsBranches.findIndex((branch) => branch.id === skill.branch);
  const withinBranch = skillSeed.filter((item) => item.branch === skill.branch).findIndex((item) => item.id === skill.id);
  return { ...skill, x: stageX[skill.stage], y: 46 + branchRow * 300 + (withinBranch % 2) * 112, status: "locked" };
});

export function getCurriculumForProgress(progress: { skill_id: string; status: string }[]): CurriculumSkill[] {
  const saved = new Map(progress.map(({ skill_id, status }) => [skill_id, status]));
  const mastered = new Set(progress.filter(({ status }) => status === "completed").map(({ skill_id }) => skill_id));
  return curriculumSkills.map((skill) => {
    const status = saved.get(skill.id);
    if (status === "completed") return { ...skill, status: "mastered" };
    if (status === "in_progress") return { ...skill, status: "in_progress" };
    return { ...skill, status: skill.prerequisites.every((prerequisite) => mastered.has(prerequisite)) ? "available" : "locked" };
  });
}

export type AssessmentQuestion = { id: string; branch: PhysicsBranch; prompt: string; options: string[]; correctIndex: number; explanation: string };

export const diagnosticQuestions: AssessmentQuestion[] = [
  { id: "d-vector", branch: "mechanics", prompt: "วัตถุเคลื่อนที่ด้วยความเร็วคงตัว แรงลัพธ์ที่กระทำต่อวัตถุเป็นอย่างไร?", options: ["เป็นศูนย์", "มีทิศเดียวกับความเร็ว", "มีทิศตรงข้ามกับความเร็ว", "ขึ้นกับมวลเท่านั้น"], correctIndex: 0, explanation: "ความเร็วคงตัวหมายถึงความเร่งเป็นศูนย์ จากกฎข้อที่สองของนิวตัน แรงลัพธ์จึงเป็นศูนย์" },
  { id: "d-kinematics", branch: "mechanics", prompt: "รถเริ่มจากหยุดนิ่งและเร่ง 2 m/s² เป็นเวลา 3 s จะมีความเร็วปลายเท่าใด?", options: ["2 m/s", "5 m/s", "6 m/s", "9 m/s"], correctIndex: 2, explanation: "ใช้ v = u + at โดย u = 0 จึงได้ v = 0 + 2(3) = 6 m/s" },
  { id: "d-energy", branch: "mechanics", prompt: "ยกวัตถุมวล 2 kg สูงขึ้น 3 m โดยใช้ g = 10 m/s² พลังงานศักย์โน้มถ่วงเพิ่มขึ้นเท่าใด?", options: ["6 J", "15 J", "30 J", "60 J"], correctIndex: 3, explanation: "พลังงานศักย์เพิ่มขึ้น mgh = 2 × 10 × 3 = 60 J" },
  { id: "d-thermal", branch: "thermal-waves", prompt: "ให้ความร้อน 420 J กับน้ำมวล 0.1 kg ซึ่งมีความร้อนจำเพาะ 4,200 J/(kg·°C) อุณหภูมิเพิ่มขึ้นกี่ °C?", options: ["0.1", "1", "10", "42"], correctIndex: 1, explanation: "จาก Q = mcΔT ได้ ΔT = 420 ÷ (0.1 × 4,200) = 1 °C" },
  { id: "d-waves", branch: "thermal-waves", prompt: "คลื่นมีความถี่ 5 Hz และความยาวคลื่น 2 m อัตราเร็วคลื่นเท่าใด?", options: ["2.5 m/s", "7 m/s", "10 m/s", "25 m/s"], correctIndex: 2, explanation: "อัตราเร็วคลื่น v = fλ = 5 × 2 = 10 m/s" },
  { id: "d-circuit", branch: "electricity-magnetism", prompt: "ตัวต้านทาน 4 Ω ต่อกับแหล่งจ่าย 12 V จะมีกระแสไฟฟ้าเท่าใด?", options: ["0.33 A", "3 A", "8 A", "48 A"], correctIndex: 1, explanation: "จากกฎของโอห์ม I = V/R = 12/4 = 3 A" },
  { id: "d-field", branch: "electricity-magnetism", prompt: "หากเพิ่มระยะห่างระหว่างประจุสองเท่า แรงคูลอมบ์จะเป็นกี่เท่าของเดิม?", options: ["2 เท่า", "ครึ่งหนึ่ง", "หนึ่งในสี่", "เท่าเดิม"], correctIndex: 2, explanation: "แรงคูลอมบ์แปรผกผันกับกำลังสองของระยะ เมื่อระยะเป็น 2 เท่า แรงจึงเหลือ 1/4" },
  { id: "d-induction", branch: "electricity-magnetism", prompt: "ตามกฎของเลนซ์ ทิศกระแสเหนี่ยวนำเป็นอย่างไร?", options: ["เสริมการเปลี่ยนแปลงฟลักซ์", "ต้านการเปลี่ยนแปลงฟลักซ์", "ตั้งฉากกับสนามเสมอ", "ไม่มีความสัมพันธ์กับฟลักซ์"], correctIndex: 1, explanation: "กระแสเหนี่ยวนำมีทิศที่สร้างสนามแม่เหล็กเพื่อต้านการเปลี่ยนแปลงของฟลักซ์ที่ทำให้เกิดกระแสนั้น" },
];

export const mockExamQuestions: AssessmentQuestion[] = [
  { id: "m-newton", branch: "mechanics", prompt: "วัตถุมวล 3 kg ถูกแรงลัพธ์ 12 N กระทำ ความเร่งมีค่าเท่าใด?", options: ["0.25 m/s²", "4 m/s²", "9 m/s²", "36 m/s²"], correctIndex: 1, explanation: "จาก F = ma ได้ a = 12/3 = 4 m/s²" },
  { id: "m-projectile", branch: "mechanics", prompt: "ยิงวัตถุทำมุมเหนือแนวระดับโดยไม่คิดแรงต้านอากาศ ขณะวัตถุอยู่จุดสูงสุด ความเร็วแนวดิ่งเป็นอย่างไร?", options: ["มีค่าสูงสุด", "เป็นศูนย์ชั่วขณะ", "เท่ากับ g", "มีทิศลงเสมอ"], correctIndex: 1, explanation: "ที่จุดสูงสุด องค์ประกอบความเร็วแนวดิ่งเป็นศูนย์ชั่วขณะ ส่วนความเร็วแนวระดับยังคงเดิม" },
  { id: "m-torque", branch: "mechanics", prompt: "แรงตั้งฉากขนาด 10 N กระทำห่างจุดหมุน 0.5 m จะทำให้เกิดทอร์กขนาดเท่าใด?", options: ["0.05 N·m", "5 N·m", "10 N·m", "20 N·m"], correctIndex: 1, explanation: "ทอร์ก τ = rF เมื่อแรงตั้งฉาก จึงได้ 0.5 × 10 = 5 N·m" },
  { id: "m-thermo", branch: "thermal-waves", prompt: "แก๊สรับความร้อน 80 J และทำงานต่อสิ่งแวดล้อม 30 J พลังงานภายในเปลี่ยนไปเท่าใด?", options: ["เพิ่ม 50 J", "เพิ่ม 110 J", "ลด 50 J", "ลด 110 J"], correctIndex: 0, explanation: "กฎข้อที่หนึ่ง ΔU = Q − W = 80 − 30 = 50 J" },
  { id: "m-standing", branch: "thermal-waves", prompt: "เชือกยาว 1.2 m ตรึงปลายทั้งสองด้าน เกิดคลื่นนิ่งโหมดพื้นฐาน ระยะระหว่างปมกับปฏิปมที่อยู่ใกล้กันที่สุดเป็นเท่าใด?", options: ["0.3 m", "0.6 m", "1.2 m", "2.4 m"], correctIndex: 1, explanation: "โหมดพื้นฐานมีครึ่งความยาวคลื่นพอดีกับความยาวเชือก ระยะระหว่างปมกับปฏิปมที่ติดกันจึงเป็น λ/4 = L/2 = 0.6 m" },
  { id: "m-circuit", branch: "electricity-magnetism", prompt: "ตัวต้านทาน 2 Ω และ 4 Ω ต่ออนุกรมกับแหล่งจ่าย 12 V กระแสในวงจรเท่าใด?", options: ["1 A", "2 A", "3 A", "6 A"], correctIndex: 1, explanation: "ความต้านทานรวมอนุกรมคือ 6 Ω ดังนั้นกระแส I = 12/6 = 2 A" },
  { id: "m-magnetic", branch: "electricity-magnetism", prompt: "ประจุบวกเคลื่อนที่ขนานไปกับสนามแม่เหล็ก แรงแม่เหล็กที่กระทำมีค่าเท่าใด?", options: ["qvB", "qvB/2", "เป็นศูนย์", "ขึ้นกับมวล"], correctIndex: 2, explanation: "F = qvB sinθ และเมื่อเคลื่อนที่ขนานกับสนาม θ = 0 จึงได้แรงเป็นศูนย์" },
  { id: "m-lenz", branch: "electricity-magnetism", prompt: "ฟลักซ์แม่เหล็กผ่านขดลวด 20 รอบเปลี่ยนจาก 0.5 Wb เป็น 0.1 Wb ใน 0.2 s ขนาดแรงเคลื่อนไฟฟ้าเหนี่ยวนำเฉลี่ยเท่าใด?", options: ["4 V", "20 V", "40 V", "80 V"], correctIndex: 2, explanation: "จาก |ε| = N|ΔΦ|/Δt = 20 × 0.4/0.2 = 40 V" },
];

export function getReadinessStage(score: number, total: number): ReadinessStage {
  if (total <= 0) return "pre-camp-1";
  const ratio = score / total;
  if (ratio < 0.4) return "pre-camp-1";
  if (ratio < 0.65) return "camp-1";
  if (ratio < 0.9) return "camp-2";
  return "olympiad";
}

export function getStageLabel(stage: string | null | undefined) {
  return readinessStages.find((item) => item.id === stage)?.label ?? "ยังไม่ได้ประเมิน";
}
