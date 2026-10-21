import { StudentClassroom } from "@/components/classroom/StudentClassroom";
import { getClassroomStudentData } from "@/lib/classroom-server";

export const metadata = { title: "คอร์สของฉัน | บ้านฟิสิกส์" };
export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const data = await getClassroomStudentData();
  return <StudentClassroom {...data}/>;
}
