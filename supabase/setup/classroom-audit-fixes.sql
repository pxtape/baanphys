-- Additive safety fixes. Apply once after existing classroom setup scripts.
alter table public.classroom_items add column archived boolean not null default false;
alter table public.classroom_question_progress add column course_id text, add column item_kind text, add column question_limit integer;
update public.classroom_question_progress p set course_id=i.course_id,item_kind=i.kind,question_limit=i.question_count from public.classroom_items i where i.id=p.item_id;
alter table public.classroom_question_progress alter column course_id set not null;
create index classroom_question_progress_item on public.classroom_question_progress(item_id);
create index classroom_items_course_level on public.classroom_items(course_id,level_number);

create or replace function classroom_private.guard_question_progress() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.item_id,71948304));
 select i.course_id,i.kind,i.question_count into new.course_id,new.item_kind,new.question_limit from public.classroom_items i where i.id=new.item_id and not i.archived;
 if new.course_id is null or new.question_number>new.question_limit then raise exception 'CONTENT_NOT_ACCESSIBLE'; end if;
 if TG_OP='INSERT' then new.completed_at:=case when new.done then now() else null end;
 else
  new.completed_at:=coalesce(old.completed_at,case when new.done then now() else null end);
  if (new.user_id,new.item_id,new.question_number) is distinct from (old.user_id,old.item_id,old.question_number) then raise exception 'Cannot move question progress'; end if;
 end if;
 return new;
end $$;

-- No material join: own historical counts remain available after enrollment revocation.
create or replace view public.classroom_question_days with(security_invoker=true) as
select p.user_id,p.course_id,(p.completed_at at time zone 'Asia/Bangkok')::date as study_on,count(*)::integer as questions
from public.classroom_question_progress p where p.done and p.item_kind in ('sheet','homework') and p.question_number<=p.question_limit
group by p.user_id,p.course_id,(p.completed_at at time zone 'Asia/Bangkok')::date;
create or replace view public.classroom_question_items with(security_invoker=true) as
select p.user_id,p.item_id,count(*)::integer as questions from public.classroom_question_progress p
where p.done and p.item_kind in ('sheet','homework') and p.question_number<=p.question_limit group by p.user_id,p.item_id;
create view public.classroom_question_activity with(security_invoker=true) as
select p.user_id,p.course_id,(p.completed_at at time zone 'Asia/Bangkok')::date as study_on,count(*)::integer as questions
from public.classroom_question_progress p where p.completed_at is not null and p.item_kind in ('sheet','homework') and p.question_number<=p.question_limit
group by p.user_id,p.course_id,(p.completed_at at time zone 'Asia/Bangkok')::date;
grant select on public.classroom_question_activity to authenticated;

-- A material already used by students cannot silently become another set of questions.
create function classroom_private.protect_used_material() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(old.id,71948304));
 if (new.drive_file_id,new.kind,new.question_count,new.course_id,new.level_number) is distinct from (old.drive_file_id,old.kind,old.question_count,old.course_id,old.level_number)
 and (exists(select 1 from public.classroom_question_progress where item_id=old.id and completed_at is not null) or exists(select 1 from public.classroom_progress where item_id=old.id and completed)) then
  raise exception 'CONTENT_HAS_PROGRESS';
 end if;
 return new;
end $$;
revoke all on function classroom_private.protect_used_material() from public,anon,authenticated;
create trigger protect_used_material before update on public.classroom_items for each row execute function classroom_private.protect_used_material();

-- Atomic renewal, safe against double submission / stale pages.
create function classroom_private.renew_course(p_user_id uuid,p_course_id text,p_expected_due date) returns date language plpgsql security definer set search_path='' as $$
declare p public.classroom_study_plans; next_due date; target_month date; anchor integer;
begin
 if not classroom_private.is_admin() or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'CLASSROOM_FORBIDDEN'; end if;
 select * into p from public.classroom_study_plans where user_id=p_user_id and course_id=p_course_id for update;
 if not found or p.started_on is null or p.paid_until is null then raise exception 'RENEWAL_DATES_REQUIRED'; end if;
 if p.paid_until is distinct from p_expected_due then raise exception 'RENEWAL_CHANGED'; end if;
 anchor:=extract(day from p.started_on)::integer;
 target_month:=(date_trunc('month',p.paid_until)+interval '1 month')::date;
 next_due:=target_month+least(anchor,extract(day from(target_month+interval '1 month - 1 day'))::integer)-1;
 update public.classroom_study_plans set last_renewed_on=p.paid_until,paid_until=next_due where user_id=p_user_id and course_id=p_course_id;
 return next_due;
end $$;
revoke all on function classroom_private.renew_course(uuid,text,date) from public,anon;
grant execute on function classroom_private.renew_course(uuid,text,date) to authenticated;
create function public.classroom_renew_course(p_user_id uuid,p_course_id text,p_expected_due date) returns date language sql security invoker set search_path='' as $$ select classroom_private.renew_course(p_user_id,p_course_id,p_expected_due) $$;
revoke all on function public.classroom_renew_course(uuid,text,date) from public,anon;
grant execute on function public.classroom_renew_course(uuid,text,date) to authenticated;

create table public.classroom_admin_changes(id bigint generated always as identity primary key,actor_id uuid,user_id uuid,course_id text,changed_at timestamptz not null default now(),before_dates jsonb,after_dates jsonb);
alter table public.classroom_admin_changes enable row level security;
create policy "Admin reads date changes" on public.classroom_admin_changes for select to authenticated using((select classroom_private.is_admin()));
grant select on public.classroom_admin_changes to authenticated;
create function classroom_private.audit_course_dates() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' or (new.started_on,new.last_renewed_on,new.paid_until) is distinct from (old.started_on,old.last_renewed_on,old.paid_until) then
 insert into public.classroom_admin_changes(actor_id,user_id,course_id,before_dates,after_dates) values(auth.uid(),new.user_id,new.course_id,case when TG_OP='UPDATE' then jsonb_build_object('started_on',old.started_on,'last_renewed_on',old.last_renewed_on,'paid_until',old.paid_until) end,jsonb_build_object('started_on',new.started_on,'last_renewed_on',new.last_renewed_on,'paid_until',new.paid_until));
 end if;return new;
end $$;
revoke all on function classroom_private.audit_course_dates() from public,anon,authenticated;
create trigger audit_course_dates after insert or update on public.classroom_study_plans for each row execute function classroom_private.audit_course_dates();

-- Archive is reversible and never deletes a student's work.
create or replace function classroom_private.sync_item_question_total() returns trigger language plpgsql security invoker set search_path='' as $$
declare c text;n integer;
begin
 if TG_OP='DELETE' then c:=old.course_id;n:=old.level_number;else c:=new.course_id;n:=new.level_number;end if;
 update public.classroom_levels l set question_count=(select case when count(*)=0 or count(*) filter(where question_count is null)>0 then null else sum(question_count)::integer end from public.classroom_items i where i.course_id=l.course_id and i.level_number=l.number and i.kind in ('sheet','homework') and not i.archived) where (l.course_id,l.number)=(c,n);
 if TG_OP='UPDATE' and (old.course_id,old.level_number) is distinct from (new.course_id,new.level_number) then
 update public.classroom_levels l set question_count=(select case when count(*)=0 or count(*) filter(where question_count is null)>0 then null else sum(question_count)::integer end from public.classroom_items i where i.course_id=l.course_id and i.level_number=l.number and i.kind in ('sheet','homework') and not i.archived) where (l.course_id,l.number)=(old.course_id,old.level_number);
 end if;
 return null;
end $$;

-- Optional expiry enforcement: starts disabled; no existing student is locked out.
create function classroom_private.swap_materials(p_first text,p_second text) returns void language plpgsql security definer set search_path='' as $$
declare a public.classroom_items;b public.classroom_items;
begin
 if not classroom_private.is_admin() then raise exception 'CLASSROOM_FORBIDDEN';end if;
 perform pg_advisory_xact_lock(71948303);
 select * into a from public.classroom_items where id=p_first for update;
 select * into b from public.classroom_items where id=p_second for update;
 if a.id is null or b.id is null or a.course_id<>b.course_id or a.level_number<>b.level_number or a.archived or b.archived then raise exception 'INVALID_MATERIALS';end if;
 update public.classroom_items set sort_order=case when id=a.id then b.sort_order else a.sort_order end where id in(a.id,b.id);
end $$;
revoke all on function classroom_private.swap_materials(text,text) from public,anon;
grant execute on function classroom_private.swap_materials(text,text) to authenticated;
create function public.classroom_swap_materials(p_first text,p_second text) returns void language sql security invoker set search_path='' as $$select classroom_private.swap_materials(p_first,p_second)$$;
revoke all on function public.classroom_swap_materials(text,text) from public,anon;
grant execute on function public.classroom_swap_materials(text,text) to authenticated;

alter table public.classroom_study_plans add column enforce_expiry boolean not null default false;
create or replace function classroom_private.advance(p_user_id uuid,p_course_id text,p_expected_level integer) returns void language plpgsql security definer set search_path='' as $$
declare v_level integer;v_last integer;
begin
 if not classroom_private.is_admin() then raise exception 'CLASSROOM_FORBIDDEN';end if;
 select unlocked_level into v_level from public.classroom_enrollments where user_id=p_user_id and course_id=p_course_id for update;
 if not found then raise exception 'CLASSROOM_NOT_ENROLLED';end if;
 if v_level is distinct from p_expected_level then raise exception 'CLASSROOM_LEVEL_CHANGED';end if;
 select level_count into v_last from public.classroom_courses where id=p_course_id;
 if v_level>=v_last then raise exception 'CLASSROOM_FINAL_LEVEL';end if;
 if v_last is null or not exists(select 1 from public.classroom_levels where course_id=p_course_id and number=v_level+1) then raise exception 'CLASSROOM_COURSE_NOT_READY';end if;
 if not exists(select 1 from public.classroom_items where course_id=p_course_id and level_number=v_level and not archived) then raise exception 'CLASSROOM_CONTENT_NOT_READY';end if;
 if exists(select 1 from public.classroom_items i where i.course_id=p_course_id and i.level_number=v_level and not i.archived and case when i.kind in ('sheet','homework') and i.question_count>0 then (select count(*) from public.classroom_question_progress q where q.user_id=p_user_id and q.item_id=i.id and q.done and q.question_number<=i.question_count)<i.question_count else not exists(select 1 from public.classroom_progress p where p.user_id=p_user_id and p.item_id=i.id and p.completed) end) then raise exception 'CLASSROOM_TASKS_INCOMPLETE';end if;
 update public.classroom_enrollments set unlocked_level=v_level+1,updated_at=now() where user_id=p_user_id and course_id=p_course_id;
end $$;
alter policy "Unlocked classroom materials" on public.classroom_items using (
 not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and ((select classroom_private.is_admin()) or (not archived and exists(select 1 from public.classroom_enrollments e where e.user_id=(select auth.uid()) and e.course_id=classroom_items.course_id and e.unlocked_level>=classroom_items.level_number) and not exists(select 1 from public.classroom_study_plans s where s.user_id=(select auth.uid()) and s.course_id=classroom_items.course_id and s.enforce_expiry and s.paid_until is not null and s.paid_until<=(now() at time zone 'Asia/Bangkok')::date)))
);

-- A one-off exception leaves the recurring plan unchanged.
create table public.classroom_support_exceptions(
 plan_id uuid not null references public.classroom_support_plans(id) on delete cascade,
 occurrence_on date not null,
 rescheduled_on date,
 meeting_time time,
 note text not null default '' check(char_length(note)<=1000),
 primary key(plan_id,occurrence_on),
 check((rescheduled_on is null and meeting_time is null) or rescheduled_on is not null)
);
alter table public.classroom_support_exceptions enable row level security;
grant select,insert,update,delete on public.classroom_support_exceptions to authenticated;
create policy "Own appointment exceptions" on public.classroom_support_exceptions for select to authenticated using(exists(select 1 from public.classroom_support_plans p where p.id=plan_id and (p.user_id=(select auth.uid()) or (select classroom_private.is_admin()))));
create policy "Admin inserts appointment exception" on public.classroom_support_exceptions for insert to authenticated with check((select classroom_private.is_admin()));
create policy "Admin updates appointment exception" on public.classroom_support_exceptions for update to authenticated using((select classroom_private.is_admin())) with check((select classroom_private.is_admin()));
create policy "Admin removes appointment exception" on public.classroom_support_exceptions for delete to authenticated using((select classroom_private.is_admin()));
create function classroom_private.check_exception() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.classroom_support_plans; t timestamptz;
begin
 if not classroom_private.is_admin() then raise exception 'CLASSROOM_FORBIDDEN';end if;
 perform pg_advisory_xact_lock(71948302);
 select * into p from public.classroom_support_plans where id=new.plan_id;
 if p.first_on is null or new.occurrence_on<p.first_on or (p.ends_on is not null and new.occurrence_on>p.ends_on) or extract(dow from new.occurrence_on)<>extract(dow from p.first_on) then raise exception 'INVALID_OCCURRENCE';end if;
 if new.rescheduled_on is null then return new;end if;
 if p.mode='discord' then
 if new.meeting_time is null or new.meeting_time>'23:00'::time then raise exception 'MEETING_TIME_REQUIRED';end if;
 t:=(new.rescheduled_on+new.meeting_time) at time zone 'Asia/Bangkok';
 if exists(select 1 from public.classroom_support_plans q where q.tutor_id=p.tutor_id and q.active and q.mode='discord' and new.rescheduled_on>=q.first_on and(q.ends_on is null or new.rescheduled_on<=q.ends_on) and extract(dow from new.rescheduled_on)=extract(dow from q.first_on) and not(q.id=p.id and new.rescheduled_on=new.occurrence_on) and not exists(select 1 from public.classroom_support_exceptions x where x.plan_id=q.id and x.occurrence_on=new.rescheduled_on) and tstzrange((new.rescheduled_on+q.meeting_time) at time zone 'Asia/Bangkok',((new.rescheduled_on+q.meeting_time) at time zone 'Asia/Bangkok')+interval '1 hour','[)') && tstzrange(t,t+interval '1 hour','[)'))
 or exists(select 1 from public.classroom_support_exceptions x join public.classroom_support_plans q on q.id=x.plan_id where q.tutor_id=p.tutor_id and q.mode='discord' and (x.plan_id,x.occurrence_on)<>(new.plan_id,new.occurrence_on) and x.rescheduled_on is not null and tstzrange((x.rescheduled_on+x.meeting_time) at time zone 'Asia/Bangkok',((x.rescheduled_on+x.meeting_time) at time zone 'Asia/Bangkok')+interval '1 hour','[)') && tstzrange(t,t+interval '1 hour','[)'))
 or exists(select 1 from public.classroom_tutor_events e where e.tutor_id=p.tutor_id and e.status<>'cancelled' and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(t,t+interval '1 hour','[)')) then raise exception 'CALENDAR_CONFLICT';end if;
 else new.meeting_time:=null;end if;
 return new;
end $$;
revoke all on function classroom_private.check_exception() from public,anon,authenticated;
create trigger check_exception before insert or update on public.classroom_support_exceptions for each row execute function classroom_private.check_exception();

