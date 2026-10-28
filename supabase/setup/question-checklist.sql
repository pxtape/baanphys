update public.classroom_course_workload set total_questions=677 where course_id='pre-posn';
create table public.classroom_question_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 item_id text not null references public.classroom_items(id) on delete cascade,
 question_number integer not null check(question_number between 1 and 100000),
 done boolean not null default true,
 completed_at timestamptz,
 primary key(user_id,item_id,question_number)
);
alter table public.classroom_question_progress enable row level security;
create policy "Own question progress or admin" on public.classroom_question_progress for select to authenticated using ((select classroom_private.is_admin()) or user_id=(select auth.uid()));
create policy "Insert own unlocked questions" on public.classroom_question_progress for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.classroom_items i where i.id=item_id and i.kind in ('sheet','homework') and question_number<=i.question_count));
create policy "Update own unlocked questions" on public.classroom_question_progress for update to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.classroom_items i where i.id=item_id)) with check(user_id=(select auth.uid()) and exists(select 1 from public.classroom_items i where i.id=item_id and i.kind in ('sheet','homework') and question_number<=i.question_count));
grant select,insert,update on public.classroom_question_progress to authenticated;
grant all on public.classroom_question_progress to service_role;
create function classroom_private.guard_question_progress() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='INSERT' then NEW.completed_at:=case when NEW.done then now() else null end;
 else NEW.completed_at:=coalesce(OLD.completed_at,case when NEW.done then now() else null end); if (NEW.user_id,NEW.item_id,NEW.question_number) is distinct from (OLD.user_id,OLD.item_id,OLD.question_number) then raise exception 'Cannot move question progress'; end if; end if;
 return NEW;
end $$;
create trigger guard_question_progress before insert or update on public.classroom_question_progress for each row execute function classroom_private.guard_question_progress();
create function public.classroom_update_question(p_item_id text,p_question integer,p_done boolean) returns integer language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); amount integer; completed integer;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in required'; end if;
 select question_count into amount from public.classroom_items where id=p_item_id and kind in ('sheet','homework');
 if amount is null or amount<1 or p_done is null or (p_question is not null and (p_question<1 or p_question>amount)) then raise exception 'Invalid or inaccessible question'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_item_id,0));
 insert into public.classroom_question_progress(user_id,item_id,question_number,done)
 select uid,p_item_id,q,p_done from generate_series(coalesce(p_question,1),coalesce(p_question,amount)) q
 on conflict(user_id,item_id,question_number) do update set done=excluded.done;
 select count(*) into completed from public.classroom_question_progress where user_id=uid and item_id=p_item_id and done and question_number<=amount;
 insert into public.classroom_progress(user_id,item_id,completed,updated_at) values(uid,p_item_id,completed=amount,now()) on conflict(user_id,item_id) do update set completed=excluded.completed,updated_at=excluded.updated_at;
 return completed;
end $$;
revoke all on function public.classroom_update_question(text,integer,boolean) from public,anon;
grant execute on function public.classroom_update_question(text,integer,boolean) to authenticated;
create view public.classroom_question_days with(security_invoker=true) as
select p.user_id,i.course_id,(p.completed_at at time zone 'Asia/Bangkok')::date as study_on,count(*)::integer as questions
from public.classroom_question_progress p join public.classroom_items i on i.id=p.item_id
where p.done and i.kind in ('sheet','homework') and p.question_number<=i.question_count
group by p.user_id,i.course_id,(p.completed_at at time zone 'Asia/Bangkok')::date;
grant select on public.classroom_question_days to authenticated;
