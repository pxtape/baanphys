export type CourseId = "pre-posn" | "camp-1" | "camp-2" | "tpho";

export type CourseDefinition = {
  id: CourseId;
  title: string;
  subtitle: string;
  levelCount: number | null;
  description: string;
  accent: string;
};

export type CourseLevel = {
  number: number;
  title: string;
  section: string;
  durationMinutes: number | null;
  isPlaceholder: boolean;
};

export type LearningItem = {
  id: string;
  courseId: CourseId;
  levelNumber: number;
  kind: "video" | "homework" | "sheet";
  title: string;
  durationMinutes: number | null;
  recommendedMinutes: number | null;
  driveFileId: string | null;
  hasMedia?: boolean;
  answerFileId?: string | null;
  solutionFileId?: string | null;
  instructions: string;
};

export type Enrollment = { studentId: string; courseId: CourseId; unlockedLevel: number };
export type StudentRecord = { id: string; displayName: string; username: string; enrollments: Enrollment[] };

export const COURSES: CourseDefinition[] = [
  { id: "pre-posn", title: "Pre-POSN", subtitle: "เตรียมความพร้อม สอวน.", levelCount: 31, description: "ค่อย ๆ สร้างความเข้าใจฟิสิกส์ ผ่านเส้นทางการเรียน 31 เลเวล", accent: "#167a72" },
  { id: "camp-1", title: "Camp 1", subtitle: "ฟิสิกส์ สอวน. ค่าย 1", levelCount: null, description: "ต่อยอดพื้นฐานสู่การคิดและแก้โจทย์ในค่าย 1", accent: "#4872a5" },
  { id: "camp-2", title: "Camp 2", subtitle: "ฟิสิกส์ สอวน. ค่าย 2", levelCount: null, description: "พัฒนาทักษะและความเข้าใจสำหรับค่าย 2", accent: "#8a70a6" },
  { id: "tpho", title: "TPhO", subtitle: "ฟิสิกส์โอลิมปิกระดับชาติ", levelCount: null, description: "เตรียมตัวสู่การแข่งขันฟิสิกส์โอลิมปิกระดับชาติ", accent: "#ad713e" },
];

// Owner-supplied Pre-POSN syllabus. Live course metadata is loaded from the database.
const syllabus: [string, number][] = [
  ["Linear Motion",130],["SUVAT",210],["Graph",50],["Newton I",70],["Newton II & III",270],
  ["Projectile",170],["Circular",190],["Relative",50],["Gravity",80],["Energy I",90],["Energy II",90],
  ["Momentum I",130],["Momentum II",190],["Rotation I",90],["Rotation II",120],["SHM",70],
  ["Fluid I & II",170],["Fluid III",90],["Heat I",110],["Heat II",120],["ElectroStatics I",110],
  ["ElectroStatics II",80],["ElectroStatics III",90],["DC circuit I",140],["DC circuit II",160],
  ["DC circuit III",210],["DC circuit IV",220],["Light I",210],["Light II",220],["Ideal gas & Humidity",50],["Magnetic",100],
];
export const PRE_POSN_LEVELS: CourseLevel[] = syllabus.map(([title,durationMinutes],index) => ({
  number:index+1, title, durationMinutes, section:index<16 ? "กลศาสตร์" : index<20 ? "ของไหลและความร้อน" : index<27 ? "ไฟฟ้า" : "แสง แก๊ส และแม่เหล็ก", isPlaceholder:false,
}));

export function formatStudyTime(minutes: number | null | undefined): string {
  if (minutes == null) return "รอระบุชั่วโมง";
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} ชม. ${remainder} นาที` : `${hours} ชม.`;
}

// Demo content is never inserted into the production database.
export const DEMO_ITEMS: LearningItem[] = PRE_POSN_LEVELS.flatMap((level) => [
  { id: `demo-pre-posn-${level.number}-video`, courseId: "pre-posn" as const, levelNumber: level.number, kind: "video" as const,
    title: `วิดีโอ Level ${level.number} · ตัวอย่าง`, durationMinutes: 60, recommendedMinutes: 90, driveFileId: null,
    instructions: "ตัวอย่างรายการวิดีโอ — รอชื่อคลิปและลิงก์ Google Drive จากติวเตอร์ ชั่วโมงนี้เป็นข้อมูลสาธิต" },
  { id: `demo-pre-posn-${level.number}-homework`, courseId: "pre-posn" as const, levelNumber: level.number, kind: "homework" as const,
    title: `HW Level ${level.number} · ตัวอย่าง`, durationMinutes: 180, recommendedMinutes: 180, driveFileId: null,
    instructions: "ตัวอย่างรายการการบ้าน — รอไฟล์โจทย์และคำแนะนำจริง เมื่อลองทำครบแล้วให้ทัก LINE หาติวเตอร์ ชั่วโมงนี้เป็นข้อมูลสาธิต" },
]);

export const DEMO_ENROLLMENTS: Enrollment[] = [{ studentId: "demo-student-001", courseId: "pre-posn", unlockedLevel: 9 }];
export const DEMO_STUDENT = { id: "demo-student-001", displayName: "นักเรียนตัวอย่าง", username: "student.demo" };
export const DEMO_STUDENTS: StudentRecord[] = [
  { ...DEMO_STUDENT, enrollments: DEMO_ENROLLMENTS },
  { id: "demo-student-002", displayName: "นักเรียนเริ่มต้น", username: "student.new", enrollments: [{ studentId: "demo-student-002", courseId: "pre-posn", unlockedLevel: 1 }] },
];

export const DEMO_COMPLETED_ITEM_IDS = DEMO_ITEMS.filter((item) => item.levelNumber < 9).map((item) => item.id);

export function isCourseId(value: unknown): value is CourseId {
  return COURSES.some((course) => course.id === value);
}
