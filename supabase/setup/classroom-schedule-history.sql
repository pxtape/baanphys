create table public.classroom_support_history(id uuid primary key default gen_random_uuid(),plan_id uuid not null references public.classroom_support_plans(id),user_id uuid not null references auth.users(id),saved_at timestamptz not null default now(),snapshot jsonb not null);
create index classroom_support_history_user on public.classroom_support_history(user_id);
create index classroom_support_history_plan on public.classroom_support_history(plan_id);
alter table public.classroom_support_history enable row level security;
grant select on public.classroom_support_history to authenticated;
create policy "Own weekly schedule history" on public.classroom_support_history for select to authenticated using(user_id=(select auth.uid()) or (select classroom_private.is_admin()));
create function classroom_private.preserve_weekly_history() returns trigger language plpgsql security definer set search_path='' as $$
declare today date:=(now() at time zone 'Asia/Bangkok')::date; until_day date; dow integer;
begin
 if (new.first_on,new.ends_on,new.meeting_time,new.mode,new.active) is not distinct from (old.first_on,old.ends_on,old.meeting_time,old.mode,old.active) then return new;end if;
 if old.first_on is not null and old.first_on<today then
  until_day:=least(coalesce(old.ends_on,today-1),today-1);
  if until_day>=old.first_on then insert into public.classroom_support_history(plan_id,user_id,snapshot) values(old.id,old.user_id,to_jsonb(old)||jsonb_build_object('ends_on',until_day));end if;
  if new.first_on is not null and new.first_on<today then dow:=extract(dow from new.first_on)::integer;new.first_on:=today+((dow-extract(dow from today)::integer+7)%7);end if;
 end if;
 return new;
end $$;
revoke all on function classroom_private.preserve_weekly_history() from public,anon,authenticated;
-- Runs before the existing conflict checker.
create trigger a_preserve_weekly_history before update on public.classroom_support_plans for each row execute function classroom_private.preserve_weekly_history();

create function classroom_private.check_override_conflicts() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(71948302);
 if tg_table_name='classroom_support_plans' then
 if not new.active or new.mode<>'discord' then return new;end if;
 if exists(select 1 from public.classroom_support_exceptions x join public.classroom_support_plans p on p.id=x.plan_id where p.active and p.tutor_id=new.tutor_id and p.mode='discord' and x.rescheduled_on>=new.first_on and(new.ends_on is null or x.rescheduled_on<=new.ends_on) and extract(dow from x.rescheduled_on)=extract(dow from new.first_on) and not exists(select 1 from public.classroom_support_exceptions y where y.plan_id=new.id and y.occurrence_on=x.rescheduled_on) and tstzrange((x.rescheduled_on+x.meeting_time) at time zone 'Asia/Bangkok',((x.rescheduled_on+x.meeting_time) at time zone 'Asia/Bangkok')+interval '1 hour','[)') && tstzrange((x.rescheduled_on+new.meeting_time) at time zone 'Asia/Bangkok',((x.rescheduled_on+new.meeting_time) at time zone 'Asia/Bangkok')+interval '1 hour','[)')) then raise exception 'CALENDAR_CONFLICT';end if;
 else
 if new.status='cancelled' then return new;end if;
 if exists(select 1 from public.classroom_support_exceptions x join public.classroom_support_plans p on p.id=x.plan_id where p.active and p.tutor_id=new.tutor_id and p.mode='discord' and x.rescheduled_on is not null and tstzrange((x.rescheduled_on+x.meeting_time) at time zone 'Asia/Bangkok',((x.rescheduled_on+x.meeting_time) at time zone 'Asia/Bangkok')+interval '1 hour','[)') && tstzrange(new.starts_at,new.ends_at,'[)')) then raise exception 'CALENDAR_CONFLICT';end if;
 end if;return new;
end $$;
revoke all on function classroom_private.check_override_conflicts() from public,anon,authenticated;
create trigger check_override_conflicts before insert or update on public.classroom_support_plans for each row execute function classroom_private.check_override_conflicts();
create trigger check_override_conflicts before insert or update on public.classroom_tutor_events for each row execute function classroom_private.check_override_conflicts();

