import { ClassroomAdmin } from "@/components/classroom/ClassroomAdmin";
import { DEMO_STUDENTS } from "@/lib/course-catalog";

export const metadata = { title: "ตัวอย่างหลังบ้าน | บ้านฟิสิกส์" };

export default function AdminPreviewPage() {
  return <ClassroomAdmin demo students={DEMO_STUDENTS}/>;
}
