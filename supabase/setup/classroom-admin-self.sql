CREATE OR REPLACE FUNCTION public.classroom_set_self_access(p_course_id text, p_level integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare v_user uuid := auth.uid(); v_max integer; begin if v_user is null or not classroom_private.is_admin() then raise exception 'CLASSROOM_FORBIDDEN'; end if; select level_count into v_max from public.classroom_courses where id=p_course_id; if v_max is null or p_level is null or p_level<0 or p_level>v_max then raise exception 'CLASSROOM_INVALID_LEVEL'; end if; if p_level>0 and not exists(select 1 from public.classroom_levels where course_id=p_course_id and number=p_level) then raise exception 'CLASSROOM_INVALID_LEVEL'; end if; insert into public.classroom_accounts(user_id,username,display_name) select v_user,'admin-'||replace(v_user::text,'-',''),coalesce(nullif(display_name,''),'แอดมินทดลองเรียน') from public.profiles where id=v_user on conflict(user_id) do nothing; if p_level=0 then delete from public.classroom_enrollments where user_id=v_user and course_id=p_course_id; else insert into public.classroom_enrollments(user_id,course_id,unlocked_level) values(v_user,p_course_id,p_level) on conflict(user_id,course_id) do update set unlocked_level=excluded.unlocked_level,updated_at=now(); end if; end; $function$
;
revoke all on function public.classroom_set_self_access(text,integer) from public,anon;
grant execute on function public.classroom_set_self_access(text,integer) to authenticated;

