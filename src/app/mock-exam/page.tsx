import { AssessmentRunner } from "@/components/AssessmentRunner";
import { mockExamQuestions } from "@/lib/curriculum";

export default function MockExamPage() {
  return <AssessmentRunner type="mock_exam" title="Timed Mock Exam" subtitle="ฝึกทำโจทย์คละหัวข้อภายใต้เวลาจำกัด หลังส่งคำตอบจะเห็นคะแนนและคำอธิบายครบทุกข้อ" durationSeconds={20 * 60} questions={mockExamQuestions}/>;
}
