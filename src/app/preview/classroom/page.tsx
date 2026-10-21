import { StudentClassroom } from "@/components/classroom/StudentClassroom";
import { DEMO_COMPLETED_ITEM_IDS, DEMO_ENROLLMENTS, DEMO_ITEMS, DEMO_STUDENT } from "@/lib/course-catalog";

export const metadata = { title: "ตัวอย่างห้องเรียน | บ้านฟิสิกส์" };

export default function ClassroomPreviewPage() {
  return <StudentClassroom demo user={DEMO_STUDENT} enrollments={DEMO_ENROLLMENTS} items={DEMO_ITEMS} completedItemIds={DEMO_COMPLETED_ITEM_IDS}/>;
}
