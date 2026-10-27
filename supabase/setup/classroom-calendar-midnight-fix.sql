create or replace function classroom_private.check_calendar_conflicts() returns trigger language plpgsql security invoker set search_path='' as $$
declare v_start timestamptz;v_end timestamptz;
begin
 perform pg_advisory_xact_lock(71948302);
 if tg_table_name='classroom_tutor_events' then
  if new.status='cancelled' then return new; end if;
  if exists(select 1 from public.classroom_tutor_events e where e.tutor_id=new.tutor_id and e.id<>new.id and e.status<>'cancelled' and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(new.starts_at,new.ends_at,'[)')) then raise exception 'CALENDAR_CONFLICT'; end if;
  if exists(select 1 from public.classroom_support_plans p cross join lateral generate_series((new.starts_at at time zone 'Asia/Bangkok')::date-1,(new.ends_at at time zone 'Asia/Bangkok')::date,interval '1 day') d where p.tutor_id=new.tutor_id and p.active and p.mode='discord' and d::date>=p.first_on and(p.ends_on is null or d::date<=p.ends_on) and extract(dow from d)=extract(dow from p.first_on) and tstzrange((d::date+p.meeting_time) at time zone 'Asia/Bangkok',((d::date+p.meeting_time) at time zone 'Asia/Bangkok')+interval '1 hour','[)') && tstzrange(new.starts_at,new.ends_at,'[)')) then raise exception 'CALENDAR_CONFLICT'; end if;
 else
  if not new.active or new.mode='line' then return new; end if;
  if exists(select 1 from public.classroom_support_plans p where p.id<>new.id and p.tutor_id=new.tutor_id and p.active and p.mode='discord' and extract(dow from p.first_on)=extract(dow from new.first_on) and p.first_on<=coalesce(new.ends_on,'infinity'::date) and new.first_on<=coalesce(p.ends_on,'infinity'::date) and extract(epoch from p.meeting_time)<extract(epoch from new.meeting_time)+3600 and extract(epoch from new.meeting_time)<extract(epoch from p.meeting_time)+3600) then raise exception 'CALENDAR_CONFLICT'; end if;
  if exists(select 1 from public.classroom_tutor_events e cross join lateral generate_series((e.starts_at at time zone 'Asia/Bangkok')::date-1,(e.ends_at at time zone 'Asia/Bangkok')::date,interval '1 day') d where e.tutor_id=new.tutor_id and e.status<>'cancelled' and d::date>=new.first_on and(new.ends_on is null or d::date<=new.ends_on) and extract(dow from d)=extract(dow from new.first_on) and tstzrange((d::date+new.meeting_time) at time zone 'Asia/Bangkok',((d::date+new.meeting_time) at time zone 'Asia/Bangkok')+interval '1 hour','[)') && tstzrange(e.starts_at,e.ends_at,'[)')) then raise exception 'CALENDAR_CONFLICT'; end if;
 end if;
 return new;
end $$;
