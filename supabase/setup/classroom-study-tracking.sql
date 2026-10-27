create table public.classroom_study_plans (
 user_id uuid not null references auth.users(id) on delete cascade,
 course_id text not null references public.classroom_courses(id),
 started_on date, paid_until date,
 primary key(user_id,course_id), check(paid_until is null or started_on is null or paid_until>=started_on)
);
create table public.classroom_study_goals (
 user_id uuid not null references auth.users(id) on delete cascade, course_id text not null references public.classroom_courses(id),
 weekly_goal integer not null check(weekly_goal between 1 and 10000),primary key(user_id,course_id)
);
create table public.classroom_practice_days (
 user_id uuid not null references auth.users(id) on delete cascade, course_id text not null references public.classroom_courses(id),
 study_on date not null, questions integer not null check(questions between 0 and 10000),primary key(user_id,course_id,study_on),
 check(study_on <= (now() at time zone 'Asia/Bangkok')::date)
);
create table public.classroom_course_workload (
 course_id text primary key references public.classroom_courses(id), total_questions integer not null check(total_questions between 1 and 1000000)
);
alter table public.classroom_study_plans enable row level security;
revoke all on public.classroom_study_plans from public,anon,authenticated;
grant select,insert,update on public.classroom_study_plans to authenticated;
grant all on public.classroom_study_plans to service_role;
alter table public.classroom_study_goals enable row level security;
revoke all on public.classroom_study_goals from public,anon,authenticated;
grant select,insert,update on public.classroom_study_goals to authenticated;
grant all on public.classroom_study_goals to service_role;
alter table public.classroom_practice_days enable row level security;
revoke all on public.classroom_practice_days from public,anon,authenticated;
grant select,insert,update on public.classroom_practice_days to authenticated;
grant all on public.classroom_practice_days to service_role;
alter table public.classroom_course_workload enable row level security;
revoke all on public.classroom_course_workload from public,anon,authenticated;
grant select,insert,update on public.classroom_course_workload to authenticated;
grant all on public.classroom_course_workload to service_role;
create policy "Read own or admin" on public.classroom_study_plans for select to authenticated using(user_id=(select auth.uid()) or (select classroom_private.is_admin()));
create policy "Insert authorized" on public.classroom_study_plans for insert to authenticated with check((select classroom_private.is_admin()));
create policy "Update authorized" on public.classroom_study_plans for update to authenticated using((select classroom_private.is_admin())) with check((select classroom_private.is_admin()));
create policy "Read own or admin" on public.classroom_study_goals for select to authenticated using(user_id=(select auth.uid()) or (select classroom_private.is_admin()));
create policy "Insert authorized" on public.classroom_study_goals for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.classroom_enrollments e where e.user_id=(select auth.uid()) and e.course_id=classroom_study_goals.course_id));
create policy "Update authorized" on public.classroom_study_goals for update to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.classroom_enrollments e where e.user_id=(select auth.uid()) and e.course_id=classroom_study_goals.course_id)) with check(user_id=(select auth.uid()) and exists(select 1 from public.classroom_enrollments e where e.user_id=(select auth.uid()) and e.course_id=classroom_study_goals.course_id));
create policy "Read own or admin" on public.classroom_practice_days for select to authenticated using(user_id=(select auth.uid()) or (select classroom_private.is_admin()));
create policy "Insert authorized" on public.classroom_practice_days for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.classroom_enrollments e where e.user_id=(select auth.uid()) and e.course_id=classroom_practice_days.course_id));
create policy "Update authorized" on public.classroom_practice_days for update to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.classroom_enrollments e where e.user_id=(select auth.uid()) and e.course_id=classroom_practice_days.course_id)) with check(user_id=(select auth.uid()) and exists(select 1 from public.classroom_enrollments e where e.user_id=(select auth.uid()) and e.course_id=classroom_practice_days.course_id));
create policy "Read workload" on public.classroom_course_workload for select to authenticated using(true);
create policy "Admin adds workload" on public.classroom_course_workload for insert to authenticated with check((select classroom_private.is_admin()));
create policy "Admin edits workload" on public.classroom_course_workload for update to authenticated using((select classroom_private.is_admin())) with check((select classroom_private.is_admin()));
