-- HISTORICAL draft only. Do not run against the active beta.
-- The beta uses classroom-beta-isolated.sql and classroom_accounts instead,
-- without modifying legacy profiles, auth triggers or roles.
-- Manual-install schema for the course classroom, after the existing migrations.
-- Not yet applied to any database. The Supabase CLI is not installed in this workspace.
-- When CLI tooling is available, generate a migration with `supabase migration new classroom`
-- and move this reviewed SQL into the generated migration file before deployment.
begin;

-- Keep self-service role changes blocked, while allowing the trusted database
-- owner to bootstrap the first admin from SQL Editor. SECURITY INVOKER matters:
-- current_user must remain the actual database role performing the UPDATE.
create or replace function public.prevent_role_change()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.role is distinct from old.role
    and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Only a trusted database owner or service may change user roles';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.prevent_role_change() from public, anon, authenticated;

create schema if not exists classroom_private;
revoke all on schema classroom_private from public, anon;
grant usage on schema classroom_private to authenticated;

-- Use the server-managed auth email to identify issued usernames; user-editable
-- auth metadata never grants access and cannot change the stored username.
alter table public.profiles add column if not exists username text;
create unique index if not exists classroom_profile_username_unique on public.profiles (username) where username is not null;

create or replace function classroom_private.sync_profile_username()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  select lower(email) into v_email from auth.users where id = new.id;
  new.username := case when split_part(v_email, '@', 2) = 'classroom.invalid' then split_part(v_email, '@', 1) else null end;
  return new;
end;
$$;
-- Trigger functions cannot be invoked as ordinary RPCs; remove default access anyway.
revoke all on function classroom_private.sync_profile_username() from public, anon, authenticated;
drop trigger if exists classroom_profile_username on public.profiles;
create trigger classroom_profile_username before insert on public.profiles
for each row execute function classroom_private.sync_profile_username();

create or replace function classroom_private.protect_profile_username()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.username is distinct from old.username and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Username is managed by the administrator';
  end if;
  return new;
end;
$$;
revoke all on function classroom_private.protect_profile_username() from public, anon, authenticated;
drop trigger if exists classroom_protect_username on public.profiles;
create trigger classroom_protect_username before update on public.profiles
for each row execute function classroom_private.protect_profile_username();

update public.profiles p set username = split_part(lower(u.email), '@', 1)
from auth.users u where p.id = u.id and split_part(lower(u.email), '@', 2) = 'classroom.invalid' and p.username is null;

create or replace function classroom_private.is_member_session()
returns boolean language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;
revoke all on function classroom_private.is_member_session() from public, anon;
grant execute on function classroom_private.is_member_session() to authenticated;

create or replace function classroom_private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select classroom_private.is_member_session() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;
revoke all on function classroom_private.is_admin() from public, anon;
grant execute on function classroom_private.is_admin() to authenticated;

drop policy if exists "Classroom admins can read student profiles" on public.profiles;
create policy "Classroom admins can read student profiles" on public.profiles
for select to authenticated using ((select classroom_private.is_admin()));

create table if not exists public.classroom_courses (
  id text primary key check (char_length(id) between 1 and 80),
  title text not null,
  level_count integer check (level_count between 1 and 200),
  description text not null default ''
);
create table if not exists public.classroom_levels (
  course_id text not null references public.classroom_courses(id) on delete cascade,
  number integer not null check (number between 1 and 200),
  title text not null,
  duration_minutes integer check (duration_minutes > 0),
  primary key (course_id, number)
);
create table if not exists public.classroom_enrollments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null references public.classroom_courses(id) on delete cascade,
  unlocked_level integer not null default 1 check (unlocked_level between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
create table if not exists public.classroom_items (
  id text primary key check (id ~ '^[a-zA-Z0-9_-]{1,100}$'),
  course_id text not null,
  level_number integer not null,
  kind text not null check (kind in ('video', 'homework', 'sheet')),
  title text not null check (char_length(title) between 1 and 500),
  duration_minutes integer check (duration_minutes > 0),
  recommended_minutes integer check (recommended_minutes > 0),
  drive_file_id text check (drive_file_id ~ '^[a-zA-Z0-9_-]{10,200}$'),
  instructions text not null default '',
  sort_order integer not null default 0,
  foreign key (course_id, level_number) references public.classroom_levels(course_id, number) on delete cascade
);
create table if not exists public.classroom_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.classroom_items(id) on delete cascade,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index if not exists classroom_enrollments_course_idx on public.classroom_enrollments(course_id);
create index if not exists classroom_items_level_idx on public.classroom_items(course_id, level_number, sort_order);
create index if not exists classroom_progress_item_idx on public.classroom_progress(item_id);

alter table public.classroom_courses enable row level security;
alter table public.classroom_levels enable row level security;
alter table public.classroom_enrollments enable row level security;
alter table public.classroom_items enable row level security;
alter table public.classroom_progress enable row level security;

-- Reset these new tables to explicit minimal Data API privileges.
revoke all on public.classroom_courses, public.classroom_levels, public.classroom_enrollments,
  public.classroom_items, public.classroom_progress from public, anon, authenticated;
grant select on public.classroom_courses, public.classroom_levels to anon, authenticated;
grant select on public.classroom_enrollments, public.classroom_items to authenticated;
grant select, insert, update on public.classroom_progress to authenticated;
grant all on public.classroom_courses, public.classroom_levels, public.classroom_enrollments,
  public.classroom_items, public.classroom_progress to service_role;

drop policy if exists "Course catalogue is visible" on public.classroom_courses;
create policy "Course catalogue is visible" on public.classroom_courses for select to anon, authenticated using (true);
drop policy if exists "Level metadata is visible" on public.classroom_levels;
create policy "Level metadata is visible" on public.classroom_levels for select to anon, authenticated using (true);

drop policy if exists "Own enrollments or classroom admin" on public.classroom_enrollments;
create policy "Own enrollments or classroom admin" on public.classroom_enrollments for select to authenticated
using ((select classroom_private.is_member_session()) and (user_id = (select auth.uid()) or (select classroom_private.is_admin())));

drop policy if exists "Only unlocked enrolled materials" on public.classroom_items;
create policy "Only unlocked enrolled materials" on public.classroom_items for select to authenticated
using ((select classroom_private.is_member_session()) and ((select classroom_private.is_admin()) or exists (
  select 1 from public.classroom_enrollments e
  where e.user_id = (select auth.uid()) and e.course_id = classroom_items.course_id and e.unlocked_level >= classroom_items.level_number
)));

drop policy if exists "Read own accessible task progress" on public.classroom_progress;
create policy "Read own accessible task progress" on public.classroom_progress for select to authenticated
using ((select classroom_private.is_member_session()) and ((select classroom_private.is_admin()) or (
  user_id = (select auth.uid()) and exists (select 1 from public.classroom_items i where i.id = classroom_progress.item_id)
)));
drop policy if exists "Create own accessible task progress" on public.classroom_progress;
create policy "Create own accessible task progress" on public.classroom_progress for insert to authenticated
with check ((select classroom_private.is_member_session()) and user_id = (select auth.uid()) and exists (
  select 1 from public.classroom_items i where i.id = classroom_progress.item_id
));
drop policy if exists "Update own accessible task progress" on public.classroom_progress;
create policy "Update own accessible task progress" on public.classroom_progress for update to authenticated
using ((select classroom_private.is_member_session()) and user_id = (select auth.uid()) and exists (select 1 from public.classroom_items i where i.id = classroom_progress.item_id))
with check ((select classroom_private.is_member_session()) and user_id = (select auth.uid()) and exists (select 1 from public.classroom_items i where i.id = classroom_progress.item_id));

create or replace function classroom_private.touch_progress()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
revoke all on function classroom_private.touch_progress() from public, anon, authenticated;
drop trigger if exists classroom_progress_updated on public.classroom_progress;
create trigger classroom_progress_updated before update on public.classroom_progress for each row execute function classroom_private.touch_progress();

-- Enrollment writes are only available through these guarded operations. The
-- private DEFINER functions need elevated privileges to write the otherwise
-- read-only enrollment table. Every entry point verifies the caller's DB role.
create or replace function classroom_private.enroll_student(p_user_id uuid, p_course_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not classroom_private.is_admin() then raise exception 'CLASSROOM_FORBIDDEN'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and role = 'student') then raise exception 'CLASSROOM_FORBIDDEN'; end if;
  if not exists (select 1 from public.classroom_courses c join public.classroom_levels l on l.course_id = c.id and l.number = 1 where c.id = p_course_id and c.level_count is not null) then
    raise exception 'CLASSROOM_COURSE_NOT_READY';
  end if;
  insert into public.classroom_enrollments(user_id, course_id, unlocked_level)
  values (p_user_id, p_course_id, 1) on conflict (user_id, course_id) do nothing;
end;
$$;

create or replace function classroom_private.advance_student(p_user_id uuid, p_course_id text, p_expected_level integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_level integer; v_last integer;
begin
  if not classroom_private.is_admin() then raise exception 'CLASSROOM_FORBIDDEN'; end if;
  select unlocked_level into v_level from public.classroom_enrollments
  where user_id = p_user_id and course_id = p_course_id for update;
  if not found then raise exception 'CLASSROOM_NOT_ENROLLED'; end if;
  if v_level is distinct from p_expected_level then raise exception 'CLASSROOM_LEVEL_CHANGED'; end if;
  select level_count into v_last from public.classroom_courses where id = p_course_id;
  if v_last is null then raise exception 'CLASSROOM_COURSE_NOT_READY'; end if;
  if v_level >= v_last then raise exception 'CLASSROOM_FINAL_LEVEL'; end if;
  if not exists (select 1 from public.classroom_levels where course_id = p_course_id and number = v_level + 1) then raise exception 'CLASSROOM_COURSE_NOT_READY'; end if;
  if not exists (select 1 from public.classroom_items where course_id = p_course_id and level_number = v_level) then raise exception 'CLASSROOM_CONTENT_NOT_READY'; end if;
  if exists (
    select 1 from public.classroom_items i
    where i.course_id = p_course_id and i.level_number = v_level
      and not exists (select 1 from public.classroom_progress p where p.user_id = p_user_id and p.item_id = i.id and p.completed)
  ) then raise exception 'CLASSROOM_TASKS_INCOMPLETE'; end if;
  update public.classroom_enrollments set unlocked_level = v_level + 1, updated_at = now()
  where user_id = p_user_id and course_id = p_course_id;
end;
$$;

create or replace function classroom_private.revoke_student(p_user_id uuid, p_course_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not classroom_private.is_admin() then raise exception 'CLASSROOM_FORBIDDEN'; end if;
  delete from public.classroom_enrollments where user_id = p_user_id and course_id = p_course_id;
end;
$$;

revoke all on function classroom_private.enroll_student(uuid,text), classroom_private.advance_student(uuid,text,integer), classroom_private.revoke_student(uuid,text) from public, anon;
grant execute on function classroom_private.enroll_student(uuid,text), classroom_private.advance_student(uuid,text,integer), classroom_private.revoke_student(uuid,text) to authenticated;

-- Public RPC wrappers use INVOKER security. The implementation and its explicit
-- authorization guard remain inside the non-exposed classroom_private schema.
create or replace function public.classroom_enroll_student(p_user_id uuid, p_course_id text)
returns void language sql security invoker set search_path = '' as $$ select classroom_private.enroll_student(p_user_id, p_course_id); $$;
create or replace function public.classroom_advance_student(p_user_id uuid, p_course_id text, p_expected_level integer)
returns void language sql security invoker set search_path = '' as $$ select classroom_private.advance_student(p_user_id, p_course_id, p_expected_level); $$;
create or replace function public.classroom_revoke_student(p_user_id uuid, p_course_id text)
returns void language sql security invoker set search_path = '' as $$ select classroom_private.revoke_student(p_user_id, p_course_id); $$;
revoke all on function public.classroom_enroll_student(uuid,text), public.classroom_advance_student(uuid,text,integer), public.classroom_revoke_student(uuid,text) from public, anon;
grant execute on function public.classroom_enroll_student(uuid,text), public.classroom_advance_student(uuid,text,integer), public.classroom_revoke_student(uuid,text) to authenticated;

insert into public.classroom_courses(id,title,level_count,description) values
  ('pre-posn','Pre-POSN',31,'เส้นทางเตรียมความพร้อม สอวน. 31 เลเวล — รอรายละเอียดหลักสูตร'),
  ('camp-1','Camp 1',null,'รอรายละเอียดหลักสูตรค่าย 1'),
  ('camp-2','Camp 2',null,'รอรายละเอียดหลักสูตรค่าย 2'),
  ('tpho','TPhO',null,'รอรายละเอียดหลักสูตร TPhO')
on conflict (id) do nothing;

-- Labels reflect the supplied draft only. No lesson durations, materials or
-- example video/homework records are inserted into the real classroom.
insert into public.classroom_levels(course_id,number,title,duration_minutes)
select 'pre-posn', n, case n
  when 1 then 'Linear Motion' when 4 then 'Newton’s Laws' when 6 then 'Projectile'
  when 7 then 'Circular Motion' when 8 then 'Relative Motion' when 9 then 'Gravity'
  when 10 then 'Energy' when 12 then 'Momentum' when 14 then 'Rotation'
  when 16 then 'รอยืนยันหัวข้อ SHM / Fluid' when 19 then 'Heat'
  when 22 then 'Electrostatics' when 24 then 'DC Circuit' when 28 then 'Geometric Optics'
  when 30 then 'Ideal Gas & Humidity' when 31 then 'Magnetism'
  else 'รอรายละเอียดบทเรียน' end, null
from generate_series(1,31) as n on conflict (course_id, number) do nothing;

commit;
