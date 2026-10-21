-- Isolated beta: creates NEW classroom tables/functions only. No ALTER/UPDATE
-- of profiles, auth.users, legacy policies, triggers or existing learning data.
create schema classroom_private;
revoke all on schema classroom_private from public, anon;
grant usage on schema classroom_private to authenticated;
create function classroom_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
  and exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
revoke all on function classroom_private.is_admin() from public,anon;
grant execute on function classroom_private.is_admin() to authenticated;

create table public.classroom_accounts(user_id uuid primary key references auth.users(id) on delete cascade,username text unique not null check(username ~ '^[a-z0-9][a-z0-9._-]{1,38}[a-z0-9]$'),display_name text not null,created_at timestamptz not null default now());
create table public.classroom_courses(id text primary key,title text not null,level_count integer check(level_count between 1 and 200),description text not null default '');
create table public.classroom_levels(course_id text not null references public.classroom_courses(id),number integer not null check(number between 1 and 200),title text not null,duration_minutes integer check(duration_minutes>0),primary key(course_id,number));
create table public.classroom_enrollments(user_id uuid not null references auth.users(id) on delete cascade,course_id text not null references public.classroom_courses(id),unlocked_level integer not null default 1 check(unlocked_level between 1 and 200),updated_at timestamptz not null default now(),primary key(user_id,course_id));
create table public.classroom_items(id text primary key check(id ~ '^[a-zA-Z0-9_-]{1,100}$'),course_id text not null,level_number integer not null,kind text not null check(kind in('video','homework','sheet')),title text not null check(char_length(title) between 1 and 500),duration_minutes integer check(duration_minutes>0),recommended_minutes integer check(recommended_minutes>0),drive_file_id text check(drive_file_id ~ '^[a-zA-Z0-9_-]{10,200}$'),instructions text not null default '',sort_order integer not null default 0,foreign key(course_id,level_number) references public.classroom_levels(course_id,number));
create table public.classroom_progress(user_id uuid not null references auth.users(id) on delete cascade,item_id text not null references public.classroom_items(id),completed boolean not null default false,updated_at timestamptz not null default now(),primary key(user_id,item_id));
create index classroom_enrollment_course_idx on public.classroom_enrollments(course_id);
create index classroom_item_level_idx on public.classroom_items(course_id,level_number,sort_order);
create index classroom_progress_item_idx on public.classroom_progress(item_id);
alter table public.classroom_accounts enable row level security;
alter table public.classroom_courses enable row level security;
alter table public.classroom_levels enable row level security;
alter table public.classroom_enrollments enable row level security;
alter table public.classroom_items enable row level security;
alter table public.classroom_progress enable row level security;
revoke all on public.classroom_accounts,public.classroom_courses,public.classroom_levels,public.classroom_enrollments,public.classroom_items,public.classroom_progress from public,anon,authenticated;
grant select on public.classroom_courses,public.classroom_levels to anon,authenticated;
grant select on public.classroom_accounts,public.classroom_enrollments,public.classroom_items to authenticated;
grant insert,update on public.classroom_courses,public.classroom_levels,public.classroom_items to authenticated;
grant select,insert,update on public.classroom_progress to authenticated;
grant all on public.classroom_accounts,public.classroom_courses,public.classroom_levels,public.classroom_enrollments,public.classroom_items,public.classroom_progress to service_role;
create policy "Classroom account owner or admin" on public.classroom_accounts for select to authenticated using(user_id=(select auth.uid()) or (select classroom_private.is_admin()));
create policy "Public classroom courses" on public.classroom_courses for select to anon,authenticated using(true);
create policy "Public classroom level metadata" on public.classroom_levels for select to anon,authenticated using(true);
create policy "Own classroom enrollment or admin" on public.classroom_enrollments for select to authenticated using(not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and (user_id=(select auth.uid()) or (select classroom_private.is_admin())));
create policy "Unlocked classroom materials" on public.classroom_items for select to authenticated using(not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and ((select classroom_private.is_admin()) or exists(select 1 from public.classroom_enrollments e where e.user_id=(select auth.uid()) and e.course_id=classroom_items.course_id and e.unlocked_level>=classroom_items.level_number)));
create policy "Admin adds courses" on public.classroom_courses for insert to authenticated with check((select classroom_private.is_admin()));
create policy "Admin edits courses" on public.classroom_courses for update to authenticated using((select classroom_private.is_admin())) with check((select classroom_private.is_admin()));
create policy "Admin adds levels" on public.classroom_levels for insert to authenticated with check((select classroom_private.is_admin()));
create policy "Admin edits levels" on public.classroom_levels for update to authenticated using((select classroom_private.is_admin())) with check((select classroom_private.is_admin()));
create policy "Admin adds materials" on public.classroom_items for insert to authenticated with check((select classroom_private.is_admin()));
create policy "Admin edits materials" on public.classroom_items for update to authenticated using((select classroom_private.is_admin())) with check((select classroom_private.is_admin()));
create policy "Own accessible progress" on public.classroom_progress for select to authenticated using((select classroom_private.is_admin()) or (user_id=(select auth.uid()) and exists(select 1 from public.classroom_items i where i.id=item_id)));
create policy "Record own accessible progress" on public.classroom_progress for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.classroom_items i where i.id=item_id));
create policy "Update own accessible progress" on public.classroom_progress for update to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.classroom_items i where i.id=item_id)) with check(user_id=(select auth.uid()) and exists(select 1 from public.classroom_items i where i.id=item_id));

create function classroom_private.enroll(p_user_id uuid,p_course_id text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not classroom_private.is_admin() then raise exception 'CLASSROOM_FORBIDDEN'; end if;
 if not exists(select 1 from public.classroom_accounts where user_id=p_user_id) then raise exception 'CLASSROOM_NOT_FOUND'; end if;
 if not exists(select 1 from public.classroom_courses c join public.classroom_levels l on l.course_id=c.id and l.number=1 where c.id=p_course_id and c.level_count is not null) then raise exception 'CLASSROOM_COURSE_NOT_READY'; end if;
 insert into public.classroom_enrollments(user_id,course_id) values(p_user_id,p_course_id) on conflict do nothing;
end;$$;
create function classroom_private.advance(p_user_id uuid,p_course_id text,p_expected_level integer) returns void language plpgsql security definer set search_path='' as $$
declare v_level integer;v_last integer;
begin
 if not classroom_private.is_admin() then raise exception 'CLASSROOM_FORBIDDEN'; end if;
 select unlocked_level into v_level from public.classroom_enrollments where user_id=p_user_id and course_id=p_course_id for update;
 if not found then raise exception 'CLASSROOM_NOT_ENROLLED'; end if;
 if v_level is distinct from p_expected_level then raise exception 'CLASSROOM_LEVEL_CHANGED'; end if;
 select level_count into v_last from public.classroom_courses where id=p_course_id;
 if v_last is null or not exists(select 1 from public.classroom_levels where course_id=p_course_id and number=v_level+1) then raise exception 'CLASSROOM_COURSE_NOT_READY'; end if;
 if v_level>=v_last then raise exception 'CLASSROOM_FINAL_LEVEL'; end if;
 if not exists(select 1 from public.classroom_items where course_id=p_course_id and level_number=v_level) then raise exception 'CLASSROOM_CONTENT_NOT_READY'; end if;
 if exists(select 1 from public.classroom_items i where i.course_id=p_course_id and i.level_number=v_level and not exists(select 1 from public.classroom_progress p where p.user_id=p_user_id and p.item_id=i.id and p.completed)) then raise exception 'CLASSROOM_TASKS_INCOMPLETE'; end if;
 update public.classroom_enrollments set unlocked_level=v_level+1,updated_at=now() where user_id=p_user_id and course_id=p_course_id;
end;$$;
create function classroom_private.revoke_enrollment(p_user_id uuid,p_course_id text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not classroom_private.is_admin() then raise exception 'CLASSROOM_FORBIDDEN'; end if;
 delete from public.classroom_enrollments where user_id=p_user_id and course_id=p_course_id;
end;$$;
revoke all on function classroom_private.enroll(uuid,text),classroom_private.advance(uuid,text,integer),classroom_private.revoke_enrollment(uuid,text) from public,anon;
grant execute on function classroom_private.enroll(uuid,text),classroom_private.advance(uuid,text,integer),classroom_private.revoke_enrollment(uuid,text) to authenticated;
create function public.classroom_enroll_student(p_user_id uuid,p_course_id text) returns void language sql security invoker set search_path='' as $$select classroom_private.enroll(p_user_id,p_course_id);$$;
create function public.classroom_advance_student(p_user_id uuid,p_course_id text,p_expected_level integer) returns void language sql security invoker set search_path='' as $$select classroom_private.advance(p_user_id,p_course_id,p_expected_level);$$;
create function public.classroom_revoke_student(p_user_id uuid,p_course_id text) returns void language sql security invoker set search_path='' as $$select classroom_private.revoke_enrollment(p_user_id,p_course_id);$$;
revoke all on function public.classroom_enroll_student(uuid,text),public.classroom_advance_student(uuid,text,integer),public.classroom_revoke_student(uuid,text) from public,anon;
grant execute on function public.classroom_enroll_student(uuid,text),public.classroom_advance_student(uuid,text,integer),public.classroom_revoke_student(uuid,text) to authenticated;
insert into public.classroom_courses(id,title,level_count,description) values('pre-posn','Pre-POSN',31,'เตรียมความพร้อม สอวน.'),('camp-1','Camp 1',null,'ค่าย 1'),('camp-2','Camp 2',null,'ค่าย 2'),('tpho','TPhO',null,'ฟิสิกส์โอลิมปิกระดับชาติ');
insert into public.classroom_levels(course_id,number,title) select 'pre-posn',n,'รอรายละเอียดบทเรียน' from generate_series(1,31) n;
