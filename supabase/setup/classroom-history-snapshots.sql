-- History contains names/counts only, never media links.
alter table public.classroom_question_progress add column item_title text, add column level_number integer;
alter table public.classroom_progress add column course_id text,add column item_title text,add column level_number integer,add column item_kind text,add column question_limit integer;
update public.classroom_question_progress p set item_title=i.title,level_number=i.level_number from public.classroom_items i where i.id=p.item_id;
update public.classroom_progress p set course_id=i.course_id,item_title=i.title,level_number=i.level_number,item_kind=i.kind,question_limit=i.question_count from public.classroom_items i where i.id=p.item_id;
create function classroom_private.snapshot_material_progress() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 select i.course_id,i.title,i.level_number,i.kind,i.question_count into new.course_id,new.item_title,new.level_number,new.item_kind,new.question_limit from public.classroom_items i where i.id=new.item_id and not i.archived;
 if new.course_id is null then raise exception 'CONTENT_NOT_ACCESSIBLE';end if;
 return new;
end $$;
revoke all on function classroom_private.snapshot_material_progress() from public,anon,authenticated;
create trigger snapshot_material_progress before insert or update on public.classroom_progress for each row execute function classroom_private.snapshot_material_progress();
create trigger snapshot_material_question before insert or update on public.classroom_question_progress for each row execute function classroom_private.snapshot_material_progress();
create view public.classroom_item_history with(security_invoker=true) as
with q as(select user_id,item_id,max(course_id) course_id,max(item_title) title,max(level_number) level_number,max(item_kind) kind,max(question_limit) question_count,count(*) filter(where done)::integer questions from public.classroom_question_progress where completed_at is not null group by user_id,item_id),
p as(select user_id,item_id,course_id,item_title title,level_number,item_kind kind,question_limit question_count,completed from public.classroom_progress)
select coalesce(q.user_id,p.user_id) user_id,coalesce(q.item_id,p.item_id) item_id,coalesce(q.course_id,p.course_id) course_id,coalesce(q.title,p.title) title,coalesce(q.level_number,p.level_number) level_number,coalesce(q.kind,p.kind) kind,coalesce(q.question_count,p.question_count) question_count,coalesce(q.questions,0) questions,case when coalesce(q.question_count,p.question_count)>0 then coalesce(q.questions,0)=coalesce(q.question_count,p.question_count) else coalesce(p.completed,false) end completed
from q full join p on q.user_id=p.user_id and q.item_id=p.item_id;
grant select on public.classroom_item_history to authenticated;

