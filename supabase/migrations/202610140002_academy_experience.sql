-- Additive learning-platform tables and curriculum metadata.
-- Existing profiles, authentication, roles, and progress policies remain intact.

alter table public.skills
  add column if not exists readiness_stage text not null default 'pre-camp-1';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'skills_readiness_stage_check'
      and conrelid = 'public.skills'::regclass
  ) then
    alter table public.skills add constraint skills_readiness_stage_check
      check (readiness_stage in ('pre-camp-1', 'camp-1', 'camp-2', 'olympiad'));
  end if;
end $$;

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assessment_type text not null check (assessment_type in ('diagnostic', 'mock_exam')),
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0 and score <= total_questions),
  duration_seconds integer not null check (duration_seconds >= 0),
  readiness_stage text not null check (readiness_stage in ('pre-camp-1', 'camp-1', 'camp-2', 'olympiad')),
  completed_at timestamptz not null default now()
);

create index if not exists assessment_attempts_user_recent_idx
  on public.assessment_attempts(user_id, assessment_type, completed_at desc);

alter table public.assessment_attempts enable row level security;

drop policy if exists "Users can read their own assessment attempts" on public.assessment_attempts;
create policy "Users can read their own assessment attempts"
  on public.assessment_attempts for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own assessment attempts" on public.assessment_attempts;
create policy "Users can create their own assessment attempts"
  on public.assessment_attempts for insert to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on public.assessment_attempts to authenticated;

insert into public.skills (id, title, subtitle, subject, formula, prerequisites, position_x, position_y, sort_order, readiness_stage) values
  ('vectors', 'เวกเตอร์', 'ปริมาณสเกลาร์และเวกเตอร์', 'mechanics', '\vec{A}=A_x\hat{i}+A_y\hat{j}', '{}', 60, 46, 1, 'pre-camp-1'),
  ('kinematics', 'การเคลื่อนที่', 'ตำแหน่ง ความเร็ว ความเร่ง', 'mechanics', 'v=u+at', '{vectors}', 60, 158, 2, 'pre-camp-1'),
  ('newton', 'กฎของนิวตัน', 'แรงและแผนภาพวัตถุอิสระ', 'mechanics', '\sum \vec{F}=m\vec{a}', '{kinematics}', 470, 158, 4, 'camp-1'),
  ('projectile', 'โปรเจกไทล์', 'การเคลื่อนที่สองมิติ', 'mechanics', 'R=\frac{u^2\sin 2\theta}{g}', '{kinematics}', 470, 46, 3, 'camp-1'),
  ('energy', 'งานและพลังงาน', 'งาน พลังงาน และการอนุรักษ์', 'mechanics', 'W=\Delta K', '{projectile,newton}', 880, 46, 4, 'camp-2'),
  ('rotation', 'การหมุน', 'ทอร์กและโมเมนต์ความเฉื่อย', 'mechanics', '\tau=I\alpha', '{energy}', 880, 46, 5, 'camp-2'),
  ('orbital-motion', 'แรงโน้มถ่วงและวงโคจร', 'สนามโน้มถ่วงและแรงสู่ศูนย์กลาง', 'mechanics', 'F=GMm/r^2', '{rotation}', 1290, 46, 6, 'olympiad'),
  ('thermal-basics', 'อุณหภูมิและความร้อน', 'สมดุลความร้อนและการถ่ายเท', 'thermal-waves', 'Q=mc\Delta T', '{}', 60, 346, 1, 'pre-camp-1'),
  ('ideal-gas', 'แก๊สอุดมคติ', 'สถานะและทฤษฎีจลน์', 'thermal-waves', 'PV=nRT', '{thermal-basics}', 60, 458, 2, 'pre-camp-1'),
  ('thermodynamics', 'อุณหพลศาสตร์', 'พลังงานภายในและกฎข้อที่หนึ่ง', 'thermal-waves', '\Delta U=Q-W', '{ideal-gas}', 470, 346, 3, 'camp-1'),
  ('oscillations', 'การสั่น', 'การเคลื่อนที่ฮาร์มอนิกอย่างง่าย', 'thermal-waves', 'a=-\omega^2x', '{kinematics}', 470, 458, 4, 'camp-1'),
  ('waves', 'คลื่น', 'การแทรกสอดและคลื่นนิ่ง', 'thermal-waves', 'v=f\lambda', '{oscillations}', 880, 346, 5, 'camp-2'),
  ('optics', 'ทัศนศาสตร์', 'ภาพ การหักเห และเครื่องมือเชิงแสง', 'thermal-waves', 'n_1\sin\theta_1=n_2\sin\theta_2', '{waves}', 1290, 346, 6, 'olympiad'),
  ('charge-field', 'ประจุและสนามไฟฟ้า', 'แรงคูลอมบ์และสนามไฟฟ้า', 'electricity-magnetism', 'F=kq_1q_2/r^2', '{}', 60, 646, 1, 'pre-camp-1'),
  ('potential', 'ศักย์ไฟฟ้า', 'พลังงานศักย์และความต่างศักย์', 'electricity-magnetism', 'V=U/q', '{charge-field}', 60, 758, 2, 'pre-camp-1'),
  ('circuits', 'วงจรไฟฟ้า', 'กระแส ความต้านทาน และกฎของเคอร์ชอฟฟ์', 'electricity-magnetism', 'V=IR', '{potential}', 470, 646, 3, 'camp-1'),
  ('magnetism', 'สนามแม่เหล็ก', 'แรงแม่เหล็กต่อประจุและกระแส', 'electricity-magnetism', 'F=qvB\sin\theta', '{circuits}', 470, 758, 4, 'camp-1'),
  ('induction', 'การเหนี่ยวนำ', 'ฟลักซ์และกฎของฟาราเดย์', 'electricity-magnetism', '\mathcal{E}=-d\Phi_B/dt', '{magnetism}', 880, 646, 5, 'camp-2'),
  ('em-waves', 'คลื่นแม่เหล็กไฟฟ้า', 'สนามไฟฟ้า สนามแม่เหล็ก และพลังงาน', 'electricity-magnetism', 'c=1/\sqrt{\mu_0\epsilon_0}', '{induction,waves}', 1290, 646, 6, 'olympiad')
on conflict (id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  subject = excluded.subject,
  formula = excluded.formula,
  prerequisites = excluded.prerequisites,
  position_x = excluded.position_x,
  position_y = excluded.position_y,
  sort_order = excluded.sort_order,
  readiness_stage = excluded.readiness_stage;
