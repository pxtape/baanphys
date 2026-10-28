CREATE OR REPLACE FUNCTION classroom_private.advance(p_user_id uuid, p_course_id text, p_expected_level integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 if exists(select 1 from public.classroom_items i where i.course_id=p_course_id and i.level_number=v_level and case when i.kind in ('sheet','homework') and i.question_count>0 then (select count(*) from public.classroom_question_progress q where q.user_id=p_user_id and q.item_id=i.id and q.done and q.question_number<=i.question_count)<i.question_count else not exists(select 1 from public.classroom_progress p where p.user_id=p_user_id and p.item_id=i.id and p.completed) end) then raise exception 'CLASSROOM_TASKS_INCOMPLETE'; end if;
 update public.classroom_enrollments set unlocked_level=v_level+1,updated_at=now() where user_id=p_user_id and course_id=p_course_id;
end;$function$

;
create view public.classroom_question_items with(security_invoker=true) as select p.user_id,p.item_id,count(*)::integer as questions from public.classroom_question_progress p join public.classroom_items i on i.id=p.item_id where p.done and p.question_number<=i.question_count and i.kind in ('sheet','homework') group by p.user_id,p.item_id;
grant select on public.classroom_question_items to authenticated;
