begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from public.profiles where role='admin' limit 1),'role','authenticated','is_anonymous',false)::text,true);
set local role authenticated;
do $$declare p public.classroom_support_plans; d date:='2077-01-04';tm time;ok boolean:=false;
begin
 select * into p from public.classroom_support_plans where first_on is not null limit 1;
 if not found then raise exception 'No scheduling fixture';end if;
 -- Find a free recurring hour without changing any lasting student data.
 for hour in 0..22 loop
  begin
   tm:=make_time(hour,0,0);
   update public.classroom_support_plans set first_on=d,ends_on=d+7,mode='discord',meeting_time=tm,active=true where id=p.id;
   ok:=true;exit;
  exception when others then if sqlerrm not like '%CALENDAR_CONFLICT%' then raise;end if;end;
 end loop;
 if not ok then raise exception 'No free verification hour';end if;
 insert into public.classroom_support_exceptions(plan_id,occurrence_on,rescheduled_on,meeting_time) values(p.id,d,d+1,tm);
 if not exists(select 1 from public.classroom_support_exceptions where plan_id=p.id and occurrence_on=d) then raise exception 'One-off reschedule failed';end if;
 begin
  insert into public.classroom_tutor_events(user_id,course_id,tutor_id,starts_at,ends_at,through_level,status,note) values(p.user_id,p.course_id,p.tutor_id,(d+1+tm) at time zone 'Asia/Bangkok',((d+1+tm) at time zone 'Asia/Bangkok')+interval '1 hour',1,'planned','Rollback verification only');
  raise exception 'Conflicting event accepted';
 exception when others then if sqlerrm not like '%CALENDAR_CONFLICT%' then raise;end if;end;
 if p.first_on<(now() at time zone 'Asia/Bangkok')::date and not exists(select 1 from public.classroom_support_history where plan_id=p.id) then raise exception 'Schedule history missing';end if;
end $$;
select 'PASS: one-off appointment, conflict protection and recurring history' as verification;
rollback;

