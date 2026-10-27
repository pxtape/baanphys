"use client";

import Link from "next/link";
import { StudyDashboard } from "./StudyDashboard";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Atom, BookOpen, Check, CheckCheck,
  CirclePlay, Clock3, FileText, GraduationCap, LayoutGrid, LockKeyhole,
  LogOut, Maximize, MessageCircle, Minimize, Route,
} from "lucide-react";
import {
  COURSES, PRE_POSN_LEVELS, formatStudyTime,
  type CourseDefinition, type CourseId, type CourseLevel, type Enrollment, type LearningItem,
} from "@/lib/course-catalog";
import { setClassroomTask } from "@/app/courses/actions";
import { createClient } from "@/lib/supabase/client";

type StudentClassroomProps = {
  demo?: boolean;
  user: { id: string; displayName: string; username: string };
  enrollments: Enrollment[];
  items: LearningItem[];
  completedItemIds: string[];
  setupRequired?: boolean;
  courseLevels?: Partial<Record<CourseId, CourseLevel[]>>;
  directDrive?: boolean;
};

function readDemoEnrollments(studentId: string, fallback: Enrollment[]): Enrollment[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(`baanphys:demo:enrollments:${studentId}`) ?? "null");
    if (!Array.isArray(stored)) return fallback;
    return stored.filter((item): item is Enrollment => Boolean(item && typeof item === "object"
      && item.studentId === studentId && COURSES.some((course) => course.id === item.courseId)
      && Number.isInteger(item.unlockedLevel) && item.unlockedLevel >= 1 && item.unlockedLevel <= 31));
  } catch { return fallback; }
}

function readDemoCompleted(studentId: string, fallback: string[]): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(`baanphys:demo:completed:${studentId}`) ?? "null");
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string") : fallback;
  } catch { return fallback; }
}

function CourseCard({ course, enrollment, selected, onClick }: {
  course: CourseDefinition; enrollment?: Enrollment; selected: boolean; onClick: () => void;
}) {
  const locked = !enrollment;
  return <button type="button" disabled={locked} onClick={onClick} aria-pressed={selected}
    aria-label={`${course.title}${locked ? " ยังไม่ปลดล็อก" : " เปิดคอร์ส"}`}
    className={`lab-course group relative flex min-h-[158px] flex-col overflow-hidden rounded-2xl border p-5 text-left transition ${selected ? "border-[#568677] bg-[#528273] text-white" : locked ? "border-[#e4e8e4] bg-[#f3f4f0] text-[#87918d]" : "border-[#dce4de] bg-white text-[#172b3a] hover:border-[#167a72]"}`}>
    <span className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] ${selected ? "text-[#e2eee6]" : "text-[#8a9790]"}`}>
      <GraduationCap size={14}/>{course.subtitle}
    </span>
    <span className="mt-4 flex items-center justify-between gap-3">
      <span className="text-xl font-semibold tracking-tight">{course.title}</span>
      {locked ? <LockKeyhole size={19} strokeWidth={1.7}/> : <ArrowRight size={20} className="transition group-hover:translate-x-1"/>}
    </span>
    <span className={`mt-auto pt-3 text-[11px] ${selected ? "text-[#e2eee6]" : "text-[#87918d]"}`}>
      {locked ? "รอเปิดสิทธิ์เข้าเรียน" : course.levelCount ? `ปลดล็อก ${enrollment.unlockedLevel} / ${course.levelCount} เลเวล` : "ได้รับสิทธิ์เข้าเรียนแล้ว"}
    </span>
    {selected && <span className="absolute -bottom-10 -right-6 h-28 w-28 rounded-full border border-white/10"/>}
  </button>;
}

function getLevels(course: CourseDefinition): CourseLevel[] {
  if (course.id === "pre-posn") return PRE_POSN_LEVELS;
  return Array.from({ length: course.levelCount ?? 0 }, (_, index) => ({
    number: index + 1, title: "รอข้อมูลบทเรียน", section: course.title,
    durationMinutes: null, isPlaceholder: true,
  }));
}

function LevelPathway({ levels, unlockedLevel, selectedLevel, completedItemIds, items, demo, onSelect }: {
  levels: CourseLevel[]; unlockedLevel: number; selectedLevel: number | null;
  completedItemIds: string[]; items: LearningItem[]; demo: boolean; onSelect: (level: number) => void; themed?: boolean;
}) {
 const rows:CourseLevel[][]=[];
 for(let i=0;i<levels.length;i+=4) rows.push(levels.slice(i,i+4));
 return <div className="compact-path space-y-7 py-3 sm:space-y-10">{rows.map((row,rowIndex)=><div key={row[0].number} className="compact-path-row relative grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">{row.map((entry,column)=>{
 const locked=entry.number>unlockedLevel,current=entry.number===unlockedLevel;
 const tasks=items.filter(item=>item.levelNumber===entry.number),done=tasks.filter(item=>completedItemIds.includes(item.id)).length;
 const passed=entry.number<unlockedLevel,waiting=current&&tasks.length>0&&done===tasks.length;
 return <button id={`level-${entry.number}`} key={entry.number} type="button" disabled={locked} aria-pressed={entry.number===selectedLevel} aria-label={`Level ${entry.number} ${entry.title}${locked?" ยังไม่ปลดล็อก":current?" เลเวลปัจจุบัน":" เปิดบทเรียน"}`} onClick={()=>onSelect(entry.number)} style={{"--path-column":rowIndex%2?4-column:column+1} as React.CSSProperties} className="compact-path-node relative z-10 flex scroll-mt-5 items-center gap-3 rounded-xl border border-[#e0e6e1] bg-white p-3 text-left sm:flex-col sm:border-0 sm:bg-[#fbfcfa] sm:p-1 sm:text-center">
 <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-base font-semibold sm:h-14 sm:w-14 ${current?waiting?"border-[#d6be90] bg-[#f6ecd7] text-[#876326]":"border-[#4f897b] bg-[#407d70] text-white shadow-[0_0_0_4px_#e8efea]":passed?"border-[#c4d8cc] bg-[#e9f1eb] text-[#437459]":"border-[#dfe5df] bg-[#f1f3ef] text-[#69766c]"}`}>{entry.number}{locked&&<LockKeyhole size={12} className="absolute -right-1 -top-1 rounded-full bg-[#e5eae2] p-0.5"/>}{passed&&<Check size={13} className="absolute -bottom-1 -right-1 rounded-full bg-[#5c8c6c] p-0.5 text-white"/>}</span>
 <span><span className="block text-sm font-semibold leading-6 text-[#35483e]">{entry.title}</span><span className="mt-1 block text-[11px] text-[#6e7c71]">{formatStudyTime(entry.durationMinutes)}{demo?" · ตัวอย่าง":""}</span>{current&&<span className="mt-1.5 inline-block rounded-full bg-[#e9efea] px-2 py-0.5 text-[10px] font-medium text-[#447869]">{waiting?"ทำครบแล้ว · ติดต่อ LINE":"คุณอยู่ตรงนี้"}</span>}</span></button>;
 })}{rowIndex<rows.length-1&&<span aria-hidden="true" className={`pointer-events-none absolute top-7 hidden h-[calc(100%+2.5rem)] w-[12.5%] border-[#cddbd0] sm:block ${rowIndex%2?"left-0 rounded-l-2xl border-b border-l border-t":"right-0 rounded-r-2xl border-b border-r border-t"}`}/>}</div>)}<style>{`@media(min-width:640px){.compact-path-row::before{content:"";position:absolute;left:12.5%;right:12.5%;top:28px;height:1px;background:#cddbd0}.compact-path-node{grid-column:var(--path-column);grid-row:1}}`}</style></div>;
}

function StudyAdvice({ homework = false }: { homework?: boolean }) {
  const steps = homework ? [
    "ลองทำเองให้เต็มที่ก่อน ประมาณ 3–10 นาที หรือมากกว่านั้นตามความยากของโจทย์",
    "ถ้าติด ขอคำใบ้จากพี่ทาง LINE ได้เลย แคปหน้าจอหรือถ่ายรูป พร้อมบอกว่าลองอะไรไปแล้วและสงสัยตรงไหน",
    "เมื่อดูเฉลยแล้ว ลองวิเคราะห์ว่าพลาดตรงไหน เพราะอะไร และครั้งหน้าจะปรับอย่างไร",
  ] : [
    "ลองคิดและทำโจทย์ด้วยตัวเองก่อนฟังพี่ได้เลย",
    "เปรียบเทียบวิธีคิดของตัวเองกับวิธีที่พี่ทำ สังเกตทั้งจุดที่เหมือนและต่างกัน",
    "ลองทำซ้ำด้วยตัวเองอีกครั้ง เพื่อเช็กว่าเข้าใจและทำได้จริง",
  ];
  return <aside aria-label={homework ? "คำแนะนำในการทำ HW" : "แนะนำวิธีเรียน"} className="my-5 rounded-xl border border-[#d4e2d3] bg-[#f3f7f0] p-4 sm:p-5">
    <h4 className="text-sm font-semibold text-[#294c3c]">{homework ? "ก่อนเริ่ม HW · ลองให้เต็มที่ แล้วค่อยขอคำใบ้" : "เรียนให้เข้าใจ · คิดก่อน ดูแล้วเทียบ ลองทำซ้ำ"}</h4>
    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-[#4c614f]">{steps.map(step => <li key={step}>{step}</li>)}</ol>
    <p className="mt-3 border-t border-[#dce7d7] pt-3 text-sm font-medium leading-7 text-[#47744f]">ช่วงแรกอาจใช้เวลามากหน่อย ไม่เป็นไรนะ พอฝึกจนคุ้นแล้ว จะค่อย ๆ คิดได้คล่องและเร็วขึ้น</p>
  </aside>;
}

function LessonPanel({ level, items, completedIds, pendingItem, error, demo, directDrive, watermarkLabel, onToggle, onClose }: {
  level: CourseLevel; items: LearningItem[]; completedIds: string[]; pendingItem: string | null;
  error: string; demo: boolean;
  directDrive?: boolean; watermarkLabel?: string;
  onToggle: (itemId: string, done: boolean) => void; onClose: () => void;
}) {
  const [openMedia, setOpenMedia] = useState<string | null>(items.find(item => item.kind === "video" && (item.hasMedia ?? Boolean(item.driveFileId)))?.id ?? null);
  const [mediaError, setMediaError] = useState("");
  const [mediaFullscreen, setMediaFullscreen] = useState(false);
  const mediaWrapperRef = useRef<HTMLDivElement>(null);
  const doneCount = items.filter((item) => completedIds.includes(item.id)).length;
  const finished = items.length > 0 && doneCount === items.length;
  useEffect(() => {
    const handleFullscreenChange = () => setMediaFullscreen(Boolean(mediaWrapperRef.current && document.fullscreenElement === mediaWrapperRef.current));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function toggleMediaFullscreen() {
    setMediaError("");
    try {
      if (document.fullscreenElement === mediaWrapperRef.current) await document.exitFullscreen();
      else if (mediaWrapperRef.current?.requestFullscreen) await mediaWrapperRef.current.requestFullscreen();
      else setMediaError("เบราว์เซอร์นี้ยังไม่รองรับการขยายเต็มจอ กรุณาดูในหน้าต่างนี้");
    } catch {
      setMediaError("ขยายเต็มจอไม่สำเร็จ กรุณาลองอีกครั้ง หรือดูในหน้าต่างนี้");
    }
  }
  return <section aria-label={`รายการเรียน Level ${level.number}`} className="overflow-hidden rounded-2xl border border-[#dce5dd] bg-white shadow-[0_8px_24px_#172b3a04]">
    <div className="border-b border-[#e5eae2] bg-[#f3f6ef] p-5">
      <div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#6d8875]">ห้องเรียนของคุณ</p><button type="button" onClick={onClose} aria-label="กลับไปเส้นทางเรียน" className="inline-flex items-center gap-2 rounded-md border border-[#ccd8ca] bg-white px-3 py-2 text-sm text-[#34483d]"><ArrowLeft size={16}/> กลับไปเส้นทางเรียน</button></div>
      <p className="mt-4 text-xs font-semibold text-[#167a72]">LEVEL {String(level.number).padStart(2, "0")}</p>
      <h3 className="mt-1 text-xl font-semibold leading-8 tracking-tight text-[#172b3a]">{level.title}</h3>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#7c8d7e]"><Clock3 size={13}/>{formatStudyTime(level.durationMinutes)}{demo && level.durationMinutes !== null ? " · ตัวอย่าง" : ""}</div>
    </div>
    <div className="p-5 sm:p-8">
      <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">สิ่งที่ต้องทำในเลเวลนี้</h4><span className="rounded-full bg-[#edf3ec] px-2.5 py-1 text-[10px] text-[#6f8b72]">{doneCount} / {items.length}</span></div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#eef1eb]"><div className="h-full rounded-full bg-[#167a72] transition-all" style={{ width: `${items.length ? doneCount / items.length * 100 : 0}%` }}/></div>
      {demo && <p className="mt-3 text-[10px] leading-5 text-[#92784f]">รายการและเวลาในหน้านี้เป็นตัวอย่างสำหรับลองระบบ</p>}
      {items.length === 0 && <div className="my-5 rounded-xl border border-dashed border-[#dce5d6] px-4 py-6 text-center"><BookOpen size={24} className="mx-auto text-[#9aaa95]"/><p className="mt-3 text-xs font-medium text-[#60705f]">กำลังจัดเตรียมเนื้อหาเลเวลนี้</p><p className="mt-1.5 text-[11px] leading-5 text-[#91998a]">จะมีรายการวิดีโอ การบ้าน และเวลาแนะนำที่นี่</p></div>}
      {items.some(item => item.kind === "video" || item.kind === "sheet") && <StudyAdvice/>}
      <div className="mt-2 divide-y divide-[#edf0e9]">
        {items.map((item) => {
          const answerOpen = openMedia === `${item.id}:answer`;
          const solutionOpen = openMedia === `${item.id}:solution`;
          const mediaFileId = answerOpen ? item.answerFileId : solutionOpen ? item.solutionFileId : item.driveFileId;
          const mediaTitle = `${item.title}${answerOpen ? " — Answer only" : solutionOpen ? " — Full solution" : ""}`;
          const validMediaFile = Boolean(mediaFileId && /^[a-zA-Z0-9_-]{10,200}$/.test(mediaFileId));
          const checked = completedIds.includes(item.id);
          const isVideo = item.kind === "video";
          const hasMedia = item.hasMedia ?? Boolean(item.driveFileId);
          return <article key={item.id} className="py-4">
            {item.kind === "homework" && items.find(entry => entry.kind === "homework")?.id === item.id && <StudyAdvice homework/>}
            <div className="flex items-start gap-3"><input type="checkbox" id={`task-${item.id}`} checked={checked} disabled={pendingItem !== null}
              onChange={(event) => onToggle(item.id, event.target.checked)} aria-label={`เรียนครบ ${item.title}`}
              className="mt-1 h-4 w-4 shrink-0 accent-[#167a72] disabled:opacity-50"/>
              <div className="min-w-0 flex-1"><label htmlFor={`task-${item.id}`} className={`cursor-pointer text-xs font-semibold leading-6 ${checked ? "text-[#829080] line-through decoration-[#b4c2ae]" : "text-[#34483d]"}`}>{isVideo ? "ดูคลิป: " : item.kind === "sheet" ? "ชีทประกอบ: " : "ทำ HW: "}{item.title}</label>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[#586954]"><span className="inline-flex items-center gap-1">{isVideo ? <CirclePlay size={11}/> : <FileText size={11}/>} {isVideo ? "วิดีโอ" : item.kind === "sheet" ? "ชีท / เอกสาร" : "การบ้าน"}</span><span>·</span><span>{item.durationMinutes === null ? isVideo ? "ดูเวลาจากเครื่องเล่น" : "ยังไม่ระบุเวลาทำ" : `${isVideo ? "เวลาดู " : "เวลาประมาณ "}${formatStudyTime(item.durationMinutes)}`}</span></div>
                {item.recommendedMinutes !== null && <p className="mt-1 text-[10px] leading-5 text-[#586954]">เวลาแนะนำ {formatStudyTime(item.recommendedMinutes)}</p>}
                {item.instructions && <p className="mt-2 whitespace-pre-line text-[11px] leading-6 text-[#71806a]">{item.instructions}</p>}
                <button type="button" disabled={!hasMedia || demo} onClick={() => { setOpenMedia(openMedia === item.id ? null : item.id); setMediaError(""); }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#dfe7d8] px-2.5 py-1.5 text-[10px] font-medium text-[#167a72] transition hover:bg-[#f3f7ee] disabled:cursor-default disabled:border-[#edf0e8] disabled:text-[#a0a895]">
                  {isVideo ? <CirclePlay size={12}/> : <FileText size={12}/>} {hasMedia && !demo ? openMedia === item.id ? isVideo ? "ซ่อนวิดีโอ" : "ซ่อนเอกสาร" : isVideo ? "เริ่มดูวิดีโอ" : item.kind === "sheet" ? "เปิดชีท" : "เปิดการบ้าน" : "รอเพิ่มไฟล์จริง"}
                </button>
                {!isVideo && <div className="mt-3 rounded-lg bg-[#f1f5ef] p-3"><p className="mb-2 text-xs font-semibold text-[#34483d]">ดูเฉลย · เปิดได้ทันที</p><div className="flex flex-wrap gap-2">{([{key: "answer", label: "Answer only", file: item.answerFileId}, {key: "solution", label: "Full solution", file: item.solutionFileId}] as const).map(option => <button key={option.key} type="button" disabled={!option.file || demo} aria-pressed={openMedia === `${item.id}:${option.key}`} onClick={() => { setOpenMedia(openMedia === `${item.id}:${option.key}` ? null : `${item.id}:${option.key}`); setMediaError(""); }} className="rounded-lg border border-[#bbcebb] bg-white px-3 py-2 text-xs font-semibold text-[#167a72] disabled:opacity-50">{option.label}{!option.file ? " · รอเพิ่มไฟล์" : ""}</button>)}</div></div>}
              </div>
            </div>
            {(openMedia === item.id || answerOpen || solutionOpen) && !demo && <><div ref={mediaWrapperRef} className="classroom-media-shell relative mt-4 overflow-hidden rounded-lg bg-[#172b3a]">
              <iframe title={mediaTitle} src={directDrive && validMediaFile ? `https://drive.google.com/file/d/${mediaFileId}/preview` : `/courses/media/${encodeURIComponent(item.id)}${answerOpen ? "?variant=answer" : solutionOpen ? "?variant=solution" : ""}`} className="classroom-media-frame aspect-video w-full border-0" allow={directDrive ? "fullscreen 'none'" : "fullscreen"} allowFullScreen={!directDrive} referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-presentation"/>
              <div aria-hidden="true" className="absolute right-0 top-0 z-20 h-16 w-16 bg-transparent" onContextMenu={event => event.preventDefault()}/>
              {directDrive && <span className="classroom-account-mark pointer-events-none absolute z-10 max-w-[75%] rounded bg-black/25 px-3 py-2 text-[10px] text-white/70">{watermarkLabel}<br/>{new Date().toLocaleDateString("th-TH")}</span>}
              <div className="flex shrink-0 items-center justify-end bg-[#172b3a] px-3 py-2"><button type="button" onClick={() => void toggleMediaFullscreen()} className="inline-flex items-center gap-1.5 rounded border border-white/20 px-2.5 py-1.5 text-[10px] text-white hover:bg-white/10">{mediaFullscreen ? <Minimize size={12}/> : <Maximize size={12}/>} {mediaFullscreen ? "ออกจากเต็มจอ" : "ขยายเต็มจอ"}</button></div>
            </div>{mediaError && <p role="alert" className="mt-2 text-[11px] leading-6 text-[#ad6246]">{mediaError}</p>}</>}
          </article>;
        })}
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-[#fff2ed] px-3 py-2 text-xs leading-6 text-[#b15d43]">{error}</p>}
      <div className={`mt-4 rounded-xl border p-4 ${finished ? "border-[#b9d9bd] bg-[#edf6eb]" : "border-[#e9e7d7] bg-[#faf9ef]"}`}>
        <div className="flex items-center gap-2">{finished ? <CheckCheck size={16} className="text-[#4a8956]"/> : <MessageCircle size={16} className="text-[#978154]"/>}<p className="text-xs font-semibold text-[#5e6b46]">{finished ? "ทำครบแล้ว · ติดต่อ LINE เพื่อขอปลดล็อก" : "ขั้นตอนปลดล็อกเลเวลถัดไป"}</p></div>
        <p className="mt-2 text-[11px] leading-6 text-[#83876d]">1. ดูคลิปและทำ HW ให้ครบ → 2. ทัก LINE หาติวเตอร์ แจ้งคอร์สและเลเวล → 3. รอติวเตอร์ตรวจและแอดมินปลดล็อก</p>
        <p className="mt-2 border-t border-[#e4e7d7] pt-2 text-[10px] leading-5 text-[#8b937b]">การติ๊กครบเป็นการบันทึกงานของคุณ ยังไม่ได้ส่งคำขอให้ติวเตอร์ กรุณาทัก LINE ด้วยตัวเอง</p>
      </div>
      {demo && <p className="mt-3 text-center text-[10px] leading-5 text-[#9ba391]">ลองติ๊กได้ ข้อมูลตัวอย่างเก็บเฉพาะเบราว์เซอร์นี้</p>}
    </div>
    <style>{`
      .classroom-media-shell:fullscreen { display: flex; flex-direction: column; width: 100%; height: 100%; margin: 0; border-radius: 0; background: #172b3a; }
      .classroom-media-shell:fullscreen .classroom-media-frame { flex: 1; min-height: 0; height: auto; aspect-ratio: auto; }
      .classroom-account-mark { left: 5%; top: 13%; animation: classroom-mark 29s steps(1,end) infinite; }
      @keyframes classroom-mark { 25% {left:40%;top:25%} 50% {left:10%;top:65%} 75% {left:40%;top:70%} }
      @media(prefers-reduced-motion:reduce) { .classroom-account-mark {animation:none} }
    `}</style>
  </section>;
}

export function StudentClassroom({ demo = false, user, enrollments: initialEnrollments, items, completedItemIds, setupRequired = false, courseLevels, directDrive = false }: StudentClassroomProps) {
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [completedIds, setCompletedIds] = useState(completedItemIds);
  const [selectedCourseId, setSelectedCourseId] = useState<CourseId | null>(initialEnrollments[0]?.courseId ?? null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showStats, setShowStats] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const pathwayRef = useRef<HTMLElement>(null);
  const selectedCourse = COURSES.find((course) => course.id === selectedCourseId);
  const enrollment = enrollments.find((record) => record.courseId === selectedCourseId);
  const courseItems = items.filter((item) => item.courseId === selectedCourseId);
  const baseLevels = selectedCourse ? courseLevels?.[selectedCourse.id] ?? getLevels(selectedCourse) : [];
  const levels = demo ? baseLevels.map((record) => {
    const levelItems = courseItems.filter((item) => item.levelNumber === record.number);
    const durationMinutes = levelItems.length > 0 && levelItems.every((item) => item.durationMinutes !== null)
      ? levelItems.reduce((total, item) => total + (item.durationMinutes ?? 0), 0) : record.durationMinutes;
    return { ...record, durationMinutes };
  }) : baseLevels;
  const level = levels.find((record) => record.number === selectedLevel);
  const selectedLevelCount = levels.length || selectedCourse?.levelCount;
  const currentLevel = enrollment?.unlockedLevel ?? 1;
  const courseIsEnrolled = Boolean(enrollment);
  useEffect(() => { if (!demo) { setEnrollments(initialEnrollments); setCompletedIds(completedItemIds); } }, [demo, initialEnrollments, completedItemIds]);

  useEffect(() => {
    if (!demo) return;
    const sync = () => {
      setEnrollments(readDemoEnrollments(user.id, initialEnrollments));
      setCompletedIds(readDemoCompleted(user.id, completedItemIds));
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("baanphys:demo:update", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("baanphys:demo:update", sync);
    };
  }, [demo, user.id, initialEnrollments, completedItemIds]);

  useEffect(() => {
    if (selectedCourseId && !enrollments.some((record) => record.courseId === selectedCourseId)) {
      setSelectedCourseId(enrollments[0]?.courseId ?? null);
      setSelectedLevel(null);
    }
  }, [enrollments, selectedCourseId]);

  useEffect(() => {
    if (selectedLevel !== null && selectedLevel > currentLevel) setSelectedLevel(null);
  }, [currentLevel, selectedLevel]);

  async function toggleTask(itemId: string, completed: boolean) {
    if (pendingItem !== null) return;
    setError("");
    const previous = completedIds;
    const next = completed ? Array.from(new Set([...previous, itemId])) : previous.filter((id) => id !== itemId);
    setCompletedIds(next);
    if (demo) {
      try {
        localStorage.setItem(`baanphys:demo:completed:${user.id}`, JSON.stringify(next));
        window.dispatchEvent(new Event("baanphys:demo:update"));
      }
      catch { setError("เบราว์เซอร์นี้ไม่อนุญาตให้บันทึกตัวอย่าง เมื่อรีเฟรชข้อมูลอาจกลับไปเริ่มต้น"); }
      return;
    }
    setPendingItem(itemId);
    try {
      const result = await setClassroomTask(itemId, completed);
      if (result.error) { setCompletedIds(previous); setError(result.error); }
    } catch { setCompletedIds(previous); setError("บันทึกความคืบหน้าไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { setPendingItem(null); }
  }

  function openLevel(number: number) {
    if (!enrollment || number > enrollment.unlockedLevel) return;
    setSelectedLevel(number);
    setError("");
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function signOut() {
    try {
      const { error: signOutError } = await createClient().auth.signOut();
      if (signOutError) { setError("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง"); return; }
      window.location.assign("/login");
    } catch { setError("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง"); }
  }

  return <div className="physics-world min-h-screen bg-[#f4f6fb] text-[#172b3a]">
    {demo && <div className="border-b border-[#e6dfcb] bg-[#f6f0df] px-4 py-2 text-center text-[11px] leading-5 text-[#877346]">โครงร่างทดลอง · ใช้ข้อมูลตัวอย่าง · ยังไม่มีวิดีโอหรือบัญชีนักเรียนจริง <Link href="/preview/admin" className="ml-2 font-semibold underline underline-offset-2">ลองฝั่งแอดมิน ↗</Link></div>}
    <header className="lab-header border-b border-[#e3e7e0] bg-[#fafaf7]/95">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-5 py-4 sm:px-9 lg:px-12">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="บ้านฟิสิกส์ หน้าแรก"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#172b3a] text-white"><Atom size={22} strokeWidth={1.6}/></span><span><b className="block text-sm font-semibold">บ้านฟิสิกส์</b><small className="block text-[9px] tracking-[.13em] text-[#839084]">P&apos;TAPE PHYSICS ACADEMY</small></span></Link>
        <nav aria-label="เมนูห้องเรียน" className="hidden items-center gap-6 sm:flex"><span aria-current="page" className="inline-flex items-center gap-2 text-xs font-semibold text-[#167a72]"><LayoutGrid size={15}/>ห้องเรียนของฉัน</span>{demo ? <Link href="/preview/admin" className="text-xs text-[#8b9586]">ตัวอย่างหลังบ้าน</Link> : <Link href="/dashboard" className="text-xs text-[#8b9586]">แดชบอร์ด</Link>}</nav>
        <div className="flex items-center gap-3"><span className="hidden text-right sm:block"><span className="block text-[11px] font-semibold text-[#55624e]">{user.displayName}</span><span className="mt-0.5 block text-[9px] text-[#9aa28d]">{demo ? "นักเรียนตัวอย่าง" : user.username}</span></span><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8ecdf] text-xs font-semibold text-[#6a7956]">{user.displayName.slice(0, 1)}</span>{demo ? <Link href="/login" className="ml-1 hidden rounded-lg border border-[#dce2d3] px-3 py-2 text-[10px] text-[#68785c] md:block">เข้าสู่ระบบจริง</Link> : <button type="button" onClick={() => void signOut()} className="rounded-lg p-2 text-[#8c9780] hover:bg-[#eef1e7]" aria-label="ออกจากระบบ"><LogOut size={16}/></button>}</div>
      </div>
    </header>
    <style>{`
      .physics-world{background:#f7f8f5}.physics-world .lab-header{background:white;border-color:#e0e5df}
      .study-sidebar{display:none}.study-sidebar.is-open{display:block}
      .lab-course{min-height:100px;border-radius:14px;padding:14px;box-shadow:none}
      .lab-course:disabled{background:#f0f2ee;border-color:#e0e5dc;color:#718073}
      @media(min-width:1024px){.study-sidebar{display:block;position:sticky;top:16px;max-height:calc(100vh - 32px);overflow-y:auto}}
    `}</style>
    <main className="mx-auto max-w-[1440px] px-5 pb-16 sm:px-9 lg:px-12">
      <section className="flex flex-wrap items-center justify-between gap-4 py-5"><div><h1 className="text-xl font-semibold text-[#2e443a]">ห้องเรียนของฉัน</h1><p className="mt-1 text-xs text-[#758174]">{user.displayName}{selectedCourse?` · ${selectedCourse.title}`:""}</p></div><div className="flex items-center gap-2"><button type="button" onClick={()=>setShowStats(!showStats)} aria-expanded={showStats} className="rounded-lg border border-[#d5dfd5] bg-white px-3 py-2 text-xs text-[#4a6c5a] lg:hidden">{showStats?"ซ่อนสถิติ":"ความคืบหน้า / บันทึกข้อ"}</button>{enrollment&&levels.length>0&&<button type="button" onClick={()=>openLevel(currentLevel)} className="inline-flex items-center gap-2 rounded-lg bg-[#447d6e] px-4 py-2.5 text-sm font-semibold text-white">เรียนต่อ · Level {currentLevel}<ArrowRight size={14}/></button>}</div></section>
      <div className={`grid items-start gap-6 ${level?"":"lg:grid-cols-[minmax(0,1fr)_340px]"}`}><div className="min-w-0">
      {setupRequired && <div role="status" className="mb-7 rounded-xl border border-[#eedfc4] bg-[#fff9ed] p-4 text-xs leading-6 text-[#977646]">ห้องเรียนยังอยู่ระหว่างตั้งค่าระบบ บัญชีและสิทธิ์จริงจะพร้อมเมื่อแอดมินตั้งค่าฐานข้อมูลเรียบร้อยแล้ว <Link href="/preview/classroom" className="font-semibold underline">ดูหน้าตัวอย่าง</Link></div>}

      <section aria-labelledby="my-courses-heading">
        <div className="mb-4 flex items-center justify-between"><h2 id="my-courses-heading" className="text-sm font-semibold">คอร์สเรียนของคุณ</h2><span className="text-[10px] text-[#939e87]">{enrollments.length} คอร์สที่มีสิทธิ์เข้าเรียน</span></div>
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{COURSES.map((course) => <CourseCard key={course.id} course={{ ...course, levelCount: courseLevels?.[course.id]?.length || course.levelCount }} enrollment={enrollments.find((record) => record.courseId === course.id)} selected={selectedCourseId === course.id && courseIsEnrolled} onClick={() => { setSelectedCourseId(course.id); setSelectedLevel(null); setError(""); requestAnimationFrame(() => pathwayRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }}/>)}</div>
      </section>

      {selectedCourse && enrollment ? <section ref={pathwayRef} className="mt-5 scroll-mt-5 border-t border-[#e3e8dc] pt-5" aria-labelledby="pathway-heading">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[.17em] text-[#8c9a7b]">เส้นทางการเรียน</p><h2 id="pathway-heading" className="mt-1.5 text-xl font-semibold tracking-tight">{selectedCourse.title}<span className="ml-3 text-xs font-normal text-[#9aa38c]">{selectedLevelCount ? `${selectedLevelCount} levels` : "รอรายละเอียดคอร์ส"}</span></h2></div><div className="flex flex-wrap items-center gap-4 pt-2 text-[10px] text-[#909b82]"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#b8d1b8]"/>เรียนผ่านมาแล้ว</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#167a72]"/>เลเวลปัจจุบัน</span><span className="inline-flex items-center gap-1.5"><LockKeyhole size={10}/>ยังไม่ปลดล็อก</span></div></div>
        <div className={`grid items-start gap-7 ${level ? "mx-auto max-w-[1120px]" : ""}`}>
          <div hidden={Boolean(level)} className="min-w-0 rounded-2xl border border-[#e3e8dc] bg-[#fbfcfa] p-3 sm:p-5">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ecdf] pb-5"><div className="flex items-center gap-2 text-[11px] text-[#7e8f70]"><Route size={15}/><span>แผนที่การเรียนของคุณ</span>{!level && <a href={`#level-${currentLevel}`} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#167a72]">ไปด่านปัจจุบัน ↓</a>}</div><span className="font-mono text-[10px] text-[#9aa68b]">{String(currentLevel).padStart(2, "0")} / {selectedLevelCount ?? "—"}</span></div>
            {levels.length > 0 ? <LevelPathway themed={selectedCourseId === "pre-posn"} levels={levels} unlockedLevel={enrollment.unlockedLevel} selectedLevel={selectedLevel} items={courseItems} completedItemIds={completedIds} demo={demo} onSelect={openLevel}/> : <div className="py-16 text-center"><BookOpen size={30} className="mx-auto text-[#a5b192]"/><p className="mt-4 text-sm text-[#738463]">รอรายละเอียดเส้นทางคอร์สนี้</p><p className="mt-2 text-xs text-[#9ba68d]">ติวเตอร์กำลังจัดเตรียมเลเวลและเนื้อหา</p></div>}
          </div>
          <div ref={detailRef} className="min-w-0 scroll-mt-5">
            {level ? <LessonPanel key={`${selectedCourseId}-${level.number}`} level={level} items={courseItems.filter((item) => item.levelNumber === level.number)} completedIds={completedIds} pendingItem={pendingItem} error={error} demo={demo} directDrive={directDrive} watermarkLabel={`${user.displayName} · ${user.username}`} onToggle={(itemId, completed) => void toggleTask(itemId, completed)} onClose={() => setSelectedLevel(null)}/> : null}
          </div>
        </div>
      </section> : <section className="mt-9 rounded-2xl border border-dashed border-[#dbe3d1] p-8 text-center"><LockKeyhole size={28} className="mx-auto text-[#99a785]"/><h2 className="mt-4 text-base font-semibold text-[#657d50]">ยังไม่มีคอร์สที่ปลดล็อก</h2><p className="mt-2 text-xs leading-6 text-[#95a086]">ติดต่อแอดมินเพื่อเปิดสิทธิ์คอร์สในบัญชีของคุณ</p></section>}
      {error && !level && <p role="alert" className="mt-5 rounded-lg bg-[#fff2ed] p-3 text-xs text-[#b15d43]">{error}</p>}
      </div>{!level&&<aside className={`study-sidebar order-first lg:order-last ${showStats?"is-open":""}`}>{selectedCourse && enrollment && <StudyDashboard key={`${user.id}-${selectedCourse.id}`} userId={user.id} courseId={selectedCourse.id} courseTitle={selectedCourse.title} passedLevels={Math.min(levels.length, Math.max(0,currentLevel-1)+(currentLevel===levels.length && courseItems.some(item=>item.levelNumber===currentLevel) && courseItems.filter(item=>item.levelNumber===currentLevel).every(item=>completedIds.includes(item.id)) ? 1 : 0))} levelCount={levels.length} demo={demo}/>}</aside>}</div>
    </main>
    <footer className="lab-footer border-t border-[#e3e8dc]"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[10px] text-[#a1aa92] sm:px-9 lg:px-12"><span>© 2026 บ้านฟิสิกส์ by P&apos;Tape</span>{demo ? <Link href="/" className="inline-flex items-center gap-1.5 hover:text-[#167a72]"><ArrowLeft size={11}/>กลับหน้าหลัก</Link> : <span>เรียนรู้ด้วยความเข้าใจ เติบโตทีละก้าว</span>}</div></footer>
  </div>;
}

