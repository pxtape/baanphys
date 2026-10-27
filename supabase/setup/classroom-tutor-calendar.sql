alter table public.classroom_levels add column question_count integer check(question_count between 0 and 100000);
create table public.classroom_support_plans(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),course_id text not null references public.classroom_courses(id),
 tutor_id uuid not null references auth.users(id),mode text not null check(mode in('line','discord')),first_on date,ends_on date,meeting_time time,channel_url text not null default '',active boolean not null default true,
 unique(user_id,course_id),check(ends_on is null or first_on is null or ends_on>=first_on),check(mode<>'discord' or(first_on is not null and meeting_time is not null and meeting_time<='23:00'::time)),check(channel_url='' or channel_url ~ '^https://(line\.me|lin\.ee|discord\.gg|discord\.com)/')
);
create table public.classroom_support_updates(
 plan_id uuid not null references public.classroom_support_plans(id),occurrence_on date not null,status text not null default 'done' check(status in('done','missed','cancelled')),note text not null default '' check(char_length(note)<=2000),primary key(plan_id,occurrence_on)
);
create table public.classroom_tutor_events(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),course_id text not null references public.classroom_courses(id),tutor_id uuid not null references auth.users(id),
 starts_at timestamptz not null,ends_at timestamptz not null,through_level integer not null check(through_level between 1 and 200),status text not null default 'planned' check(status in('planned','done','cancelled')),note text not null default '' check(char_length(note)<=2000),
 check(ends_at>starts_at and ends_at<=starts_at+interval '4 hours')
);
create index support_tutor_idx on public.classroom_support_plans(tutor_id);
create index support_user_idx on public.classroom_support_plans(user_id);
create index tutor_events_time_idx on public.classroom_tutor_events(tutor_id,starts_at);
create index tutor_events_user_idx on public.classroom_tutor_events(user_id);
alter table public.classroom_support_plans enable row level security;
revoke all on public.classroom_support_plans from public,anon,authenticated;
grant select,insert,update on public.classroom_support_plans to authenticated;
grant all on public.classroom_support_plans to service_role;
create policy "Own schedule or admin" on public.classroom_support_plans for select to authenticated using(user_id=(select auth.uid()) or (select classroom_private.is_admin()));
create policy "Admin creates schedule" on public.classroom_support_plans for insert to authenticated with check((select classroom_private.is_admin()));
create policy "Admin updates schedule" on public.classroom_support_plans for update to authenticated using((select classroom_private.is_admin())) with check((select classroom_private.is_admin()));
alter table public.classroom_support_updates enable row level security;
revoke all on public.classroom_support_updates from public,anon,authenticated;
grant select,insert,update on public.classroom_support_updates to authenticated;
grant all on public.classroom_support_updates to service_role;
create policy "Own schedule or admin" on public.classroom_support_updates for select to authenticated using(exists(select 1 from public.classroom_support_plans p where p.id=plan_id and p.user_id=(select auth.uid())) or (select classroom_private.is_admin()));
create policy "Admin creates schedule" on public.classroom_support_updates for insert to authenticated with check((select classroom_private.is_admin()));
create policy "Admin updates schedule" on public.classroom_support_updates for update to authenticated using((select classroom_private.is_admin())) with check((select classroom_private.is_admin()));
alter table public.classroom_tutor_events enable row level security;
revoke all on public.classroom_tutor_events from public,anon,authenticated;
grant select,insert,update on public.classroom_tutor_events to authenticated;
grant all on public.classroom_tutor_events to service_role;
create policy "Own schedule or admin" on public.classroom_tutor_events for select to authenticated using(user_id=(select auth.uid()) or (select classroom_private.is_admin()));
create policy "Admin creates schedule" on public.classroom_tutor_events for insert to authenticated with check((select classroom_private.is_admin()));
create policy "Admin updates schedule" on public.classroom_tutor_events for update to authenticated using((select classroom_private.is_admin())) with check((select classroom_private.is_admin()));
create function classroom_private.check_calendar_conflicts() returns trigger language plpgsql security invoker set search_path='' as $$
declare v_start timestamptz;v_end timestamptz;
begin
 perform pg_advisory_xact_lock(71948302);
 if tg_table_name='classroom_tutor_events' then
  if new.status='cancelled' then return new; end if;
  if exists(select 1 from public.classroom_tutor_events e where e.tutor_id=new.tutor_id and e.id<>new.id and e.status<>'cancelled' and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(new.starts_at,new.ends_at,'[)')) then raise exception 'CALENDAR_CONFLICT'; end if;
  if exists(select 1 from public.classroom_support_plans p cross join lateral generate_series((new.starts_at at time zone 'Asia/Bangkok')::date-1,(new.ends_at at time zone 'Asia/Bangkok')::date,interval '1 day') d where p.tutor_id=new.tutor_id and p.active and p.mode='discord' and d::date>=p.first_on and(p.ends_on is null or d::date<=p.ends_on) and extract(dow from d)=extract(dow from p.first_on) and tstzrange((d::date+p.meeting_time) at time zone 'Asia/Bangkok',((d::date+p.meeting_time) at time zone 'Asia/Bangkok')+interval '1 hour','[)') && tstzrange(new.starts_at,new.ends_at,'[)')) then raise exception 'CALENDAR_CONFLICT'; end if;
 else
  if not new.active or new.mode='line' then return new; end if;
  if exists(select 1 from public.classroom_support_plans p where p.id<>new.id and p.tutor_id=new.tutor_id and p.active and p.mode='discord' and extract(dow from p.first_on)=extract(dow from new.first_on) and p.first_on<=coalesce(new.ends_on,'infinity'::date) and new.first_on<=coalesce(p.ends_on,'infinity'::date) and p.meeting_time<new.meeting_time+interval '1 hour' and new.meeting_time<p.meeting_time+interval '1 hour') then raise exception 'CALENDAR_CONFLICT'; end if;
  if exists(select 1 from public.classroom_tutor_events e cross join lateral generate_series((e.starts_at at time zone 'Asia/Bangkok')::date-1,(e.ends_at at time zone 'Asia/Bangkok')::date,interval '1 day') d where e.tutor_id=new.tutor_id and e.status<>'cancelled' and d::date>=new.first_on and(new.ends_on is null or d::date<=new.ends_on) and extract(dow from d)=extract(dow from new.first_on) and tstzrange((d::date+new.meeting_time) at time zone 'Asia/Bangkok',((d::date+new.meeting_time) at time zone 'Asia/Bangkok')+interval '1 hour','[)') && tstzrange(e.starts_at,e.ends_at,'[)')) then raise exception 'CALENDAR_CONFLICT'; end if;
 end if;
 return new;
end $$;
revoke all on function classroom_private.check_calendar_conflicts() from public,anon;
grant execute on function classroom_private.check_calendar_conflicts() to authenticated;
create trigger check_support_calendar before insert or update on public.classroom_support_plans for each row execute function classroom_private.check_calendar_conflicts();
create trigger check_exam_calendar before insert or update on public.classroom_tutor_events for each row execute function classroom_private.check_calendar_conflicts();
