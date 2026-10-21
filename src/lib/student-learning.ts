export const learningStages = ["pre-camp-1", "camp-1", "camp-2", "olympiad"] as const;
export type LearningStage = (typeof learningStages)[number];

export const learningStageLabels: Record<LearningStage, string> = {
  "pre-camp-1": "เตรียมเข้าค่าย 1",
  "camp-1": "ค่าย 1",
  "camp-2": "ค่าย 2",
  olympiad: "โอลิมปิก",
};

export function isLearningStage(value: unknown): value is LearningStage {
  return typeof value === "string" && learningStages.includes(value as LearningStage);
}

export function calculateSkillProgress(
  skillIds: string[],
  progress: { skill_id: string; status: string }[],
) {
  const uniqueIds = [...new Set(skillIds)];
  const completed = new Set(progress.filter((item) => item.status === "completed").map((item) => item.skill_id));
  const completedCount = uniqueIds.filter((id) => completed.has(id)).length;
  return {
    completed: completedCount,
    total: uniqueIds.length,
    percent: uniqueIds.length ? Math.round((completedCount / uniqueIds.length) * 100) : null,
  };
}

export type WeightedLearningItem = { id: string; skill_id: string; weight: number };

export function calculateWeightedLearningProgress(
  items: WeightedLearningItem[],
  progress: { item_id: string; status: string }[],
) {
  const completed = new Set(progress.filter((item) => item.status === "completed").map((item) => item.item_id));
  const bySkill = new Map<string, WeightedLearningItem[]>();
  for (const item of items) bySkill.set(item.skill_id, [...(bySkill.get(item.skill_id) ?? []), item]);
  const skillPercentages = [...bySkill.values()].map((skillItems) => {
    const totalWeight = skillItems.reduce((sum, item) => sum + item.weight, 0);
    const doneWeight = skillItems.reduce((sum, item) => sum + (completed.has(item.id) ? item.weight : 0), 0);
    return totalWeight ? doneWeight / totalWeight : 0;
  });
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const completedWeight = items.reduce((sum, item) => sum + (completed.has(item.id) ? item.weight : 0), 0);
  return {
    completedWeight,
    totalWeight,
    percent: skillPercentages.length ? Math.round(skillPercentages.reduce((sum, value) => sum + value, 0) / skillPercentages.length * 100) : null,
    skillsWithContent: skillPercentages.length,
  };
}
