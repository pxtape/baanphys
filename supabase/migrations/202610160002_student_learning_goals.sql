-- A student's focus is personal; every published map remains publicly visible.
create table if not exists public.student_learning_goals (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  target_readiness_stage text not null check (target_readiness_stage in ('pre-camp-1', 'camp-1', 'camp-2', 'olympiad')),
  updated_at timestamptz not null default now()
);

alter table public.student_learning_goals enable row level security;

drop policy if exists "Students read own learning goal" on public.student_learning_goals;
create policy "Students read own learning goal" on public.student_learning_goals
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Students choose own learning goal" on public.student_learning_goals;
create policy "Students choose own learning goal" on public.student_learning_goals
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Students update own learning goal" on public.student_learning_goals;
create policy "Students update own learning goal" on public.student_learning_goals
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.student_learning_goals to authenticated;
