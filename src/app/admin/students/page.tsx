import { ClassroomAdmin } from "@/components/classroom/ClassroomAdmin";
import { getClassroomAdminData } from "@/lib/classroom-server";

export const metadata = { title: "จัดการนักเรียน | บ้านฟิสิกส์" };
export const dynamic = "force-dynamic";

export default async function StudentsAdminPage() {
  const data = await getClassroomAdminData();
  return <ClassroomAdmin {...data}/>;
}
