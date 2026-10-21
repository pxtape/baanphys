import { AssessmentRunner } from "@/components/AssessmentRunner";
import { diagnosticQuestions } from "@/lib/curriculum";

export default function DiagnosticPage() {
  return <AssessmentRunner type="diagnostic" title="แบบทดสอบวัดระดับ" subtitle="สำรวจความเข้าใจพื้นฐานในสามสาขา เพื่อช่วยแนะนำจุดเริ่มต้นและเส้นทางการเรียนที่เหมาะกับคุณ" durationSeconds={300} questions={diagnosticQuestions}/>;
}
