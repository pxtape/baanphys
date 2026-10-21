import Link from "next/link";
import { ArrowRight, CircleAlert, Workflow } from "lucide-react";
import { PageFrame } from "@/components/AcademyShell";
import { setLearningFocusAction } from "@/app/skill-tree/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { calculateWeightedLearningProgress, isLearningStage, learningStageLabels, learningStages, type LearningStage } from "@/lib/student-learning";

type MapRow = { id: string; title: string; description: string; readiness_stage: string };
type SkillRow = { id: string; map_id: string };
type ItemRow = { id: string; skill_id: string; weight: number };
type ProgressRow = { item_id: string; status: string };

export async function SkillMapCatalog() {
  const configured = isSupabaseConfigured();
  let setupError = false;
  let signedIn = false;
  let focus: LearningStage | null = null;
  let maps: MapRow[] = [];
  let skills: SkillRow[] = [];
  let items: ItemRow[] = [];
  let progress: ProgressRow[] = [];

  if (configured) {
    const supabase = await createClient();
    const [{ data: mapRows, error: mapsError }, { data: { user } }] = await Promise.all([
      supabase.from("skill_maps").select("id,title,description,readiness_stage").eq("is_published", true).order("created_at"),
      supabase.auth.getUser(),
    ]);
    if (mapsError) setupError = true;
    maps = (mapRows as MapRow[] | null) ?? [];
    signedIn = Boolean(user);

    if (user && !mapsError) {
      const [{ data: goal, error: goalError }, { data: skillRows, error: skillsError }] = await Promise.all([
        supabase.from("student_learning_goals").select("target_readiness_stage").eq("user_id", user.id).maybeSingle(),
        maps.length ? supabase.from("skills").select("id,map_id").in("map_id", maps.map((map) => map.id)).is("archived_at", null) : Promise.resolve({ data: [], error: null }),
      ]);
      if (goalError || skillsError) setupError = true;
      if (isLearningStage(goal?.target_readiness_stage)) focus = goal.target_readiness_stage;
      skills = (skillRows as SkillRow[] | null) ?? [];
      if (skills.length) {
        const [{ data: itemRows, error: itemsError }, { data: progressRows, error: progressError }] = await Promise.all([
          supabase.from("skill_learning_items").select("id,skill_id,weight").in("skill_id", skills.map((skill) => skill.id)).eq("is_published", true),
          supabase.from("user_learning_item_progress").select("item_id,status").eq("user_id", user.id),
        ]);
        if (itemsError || progressError) setupError = true;
        items = (itemRows as ItemRow[] | null) ?? [];
        progress = (progressRows as ProgressRow[] | null) ?? [];
      }
    }
  }

  const mapProgress = (mapIds: string[]) => {
    const skillIds = new Set(skills.filter((skill) => mapIds.includes(skill.map_id)).map((skill) => skill.id));
    return calculateWeightedLearningProgress(items.filter((item) => skillIds.has(item.skill_id)), progress);
  };
  const stageProgress = (stage: LearningStage) => mapProgress(maps.filter((map) => map.readiness_stage === stage).map((map) => map.id));

  return <PageFrame active="/skill-tree"><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
    <div className="border-b border-[var(--line)] pb-6"><p className="eyebrow">BAAN PHYSICS · LEARNING MAP</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">แผนที่ค่ายฟิสิกส์</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">ดูเส้นทางเตรียมตัวได้ทุกค่าย เลือกหนึ่งเป้าหมายเพื่อให้ห้องเรียนเน้นสิ่งที่ควรโฟกัสในตอนนี้</p></div>
    {!configured ? <div className="mt-6 flex items-start gap-3 border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-4 py-4 text-sm leading-6"><CircleAlert size={16} className="mt-1 shrink-0"/>ยังไม่ได้ตั้งค่า Supabase แผนที่ค่ายจะแสดงหลังเชื่อมต่อฐานข้อมูล</div> : setupError ? <div role="alert" className="mt-6 flex items-start gap-3 border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-4 py-4 text-sm leading-6"><CircleAlert size={16} className="mt-1 shrink-0"/>โหลดข้อมูลเส้นทางหรือความคืบหน้าไม่ได้ กรุณาตรวจสอบ migration ของแผนที่ เป้าหมาย และเนื้อหาการเรียน</div> : null}
    {signedIn && !setupError && <section className="mt-6 flex flex-col gap-3 border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">เส้นทางโฟกัสของฉัน</p><p className="mt-1 text-sm font-semibold">{focus ? learningStageLabels[focus] : "ยังไม่ได้เลือกเป้าหมาย"}</p><p className="mt-1 text-xs text-[var(--muted)]">{focus ? "ทุกแผนที่ยังเปิดดูได้ ความคืบหน้าจะแสดงจากเนื้อหาที่เรียนจบแล้ว" : "เลือกเป้าหมายด้านล่าง แล้วห้องเรียนจะแสดงความคืบหน้าของเส้นทางนี้"}</p></div>{focus && <span className="font-mono text-xl font-semibold text-[var(--accent)]">{stageProgress(focus).percent === null ? "—" : `${stageProgress(focus).percent}%`}</span>}</section>}

    {!setupError && maps.length ? <div className="mt-8 space-y-9">{learningStages.map((stage) => {
      const stageMaps = maps.filter((map) => map.readiness_stage === stage);
      if (!stageMaps.length) return null;
      const selected = focus === stage;
      const stats = stageProgress(stage);
      return <section key={stage} className={selected ? "border-l-2 border-[var(--accent)] pl-4 sm:pl-5" : ""}>
        <div className="mb-3 flex flex-wrap items-center gap-3"><div><h2 className="text-sm font-semibold">{learningStageLabels[stage]}</h2>{selected && <p className="mt-1 text-[10px] text-[var(--muted)]">{stats.percent === null ? "ครูยังไม่ได้เพิ่มเนื้อหาที่เผยแพร่" : `ความคืบหน้าเนื้อหา ${stats.percent}%`}</p>}</div><span className="h-px min-w-6 flex-1 bg-[var(--line)]"/><span className="text-[10px] text-[var(--muted)]">{stageMaps.length} แผนที่</span>{signedIn && !selected && <form action={setLearningFocusAction}><input type="hidden" name="stage" value={stage}/><button type="submit" className="rounded-md border border-[var(--line)] px-3 py-2 text-[10px] font-semibold hover:border-[var(--accent)]">โฟกัสระดับนี้</button></form>}{selected && <span className="rounded-md bg-[var(--soft)] px-3 py-2 text-[10px] font-semibold text-[var(--accent)]">เป้าหมายของฉัน</span>}</div>
        {selected && stats.percent !== null && <div className="mb-4 h-1.5 bg-[#E7EBE6]"><div className="h-full bg-[var(--accent)]" style={{ width: `${stats.percent}%` }}/></div>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{stageMaps.map((map) => { const statsForMap = mapProgress([map.id]); return <Link key={map.id} href={`/skill-tree/map/${map.id}`} className={`group border bg-white p-5 transition hover:border-[#a8cabc] hover:bg-[#fbfcfa] ${selected ? "border-[#a8cabc]" : "border-[var(--line)]"}`}><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">{learningStageLabels[stage]}</span><ArrowRight size={15} className="text-[var(--muted)] transition group-hover:translate-x-1"/></div><h3 className="mt-3 text-base font-semibold">{map.title}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-[var(--muted)]">{map.description || "สำรวจทักษะและ prerequisite ในเส้นทางนี้"}</p>{signedIn && <p className="mt-3 text-[10px] text-[var(--muted)]">ความคืบหน้า {statsForMap.percent === null ? "ยังไม่มีเนื้อหา" : `${statsForMap.percent}%`}</p>}<span className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold text-[var(--accent)]"><Workflow size={13}/>เปิด Skill Tree</span></Link>; })}</div>
      </section>;
    })}</div> : !setupError && configured ? <div className="mt-8 border-y border-[var(--line)] py-16 text-center"><Workflow size={25} className="mx-auto text-[var(--accent)]"/><h2 className="mt-4 text-base font-semibold">ยังไม่มีแผนที่ค่ายที่เผยแพร่</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">เมื่อครูสร้างและเผยแพร่แผนที่ เช่น กลศาสตร์ค่าย 1 หรือไฟฟ้าค่าย 2 แผนที่เหล่านั้นจะแสดงที่นี่</p></div> : null}
    <p className="mt-8 text-xs leading-6 text-[var(--muted)]">เนื้อหาเปิดให้เฉพาะผู้เข้าสู่ระบบ น้ำหนัก HW จะนับว่าผ่านหลังครูตรวจงาน ลิงก์ YouTube/Drive อาจถูกแชร์ต่อนอกเว็บได้ตามการตั้งค่าของเจ้าของไฟล์</p>
  </main></PageFrame>;
}
