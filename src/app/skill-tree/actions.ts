"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLearningStage } from "@/lib/student-learning";

export async function setLearningFocusAction(formData: FormData) {
  const stage = formData.get("stage");
  if (!isLearningStage(stage)) return;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return;

  const { error } = await supabase.from("student_learning_goals").upsert({
    user_id: user.id,
    target_readiness_stage: stage,
    updated_at: new Date().toISOString(),
  });
  if (error) return;

  revalidatePath("/skill-tree");
  revalidatePath("/dashboard");
}
