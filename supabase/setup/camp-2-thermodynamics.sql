begin;
lock table public.classroom_courses, public.classroom_levels, public.classroom_items, public.classroom_enrollments, public.classroom_mock_tests, public.classroom_tutor_events in share row exclusive mode;
do $camp$
declare n integer;
begin
 if (select level_count from public.classroom_courses where id='camp-2')=24 and exists(select 1 from public.classroom_levels where course_id='camp-2' and number=5 and title='Temperature and Heat Properties') then return; end if;
 if (select level_count from public.classroom_courses where id='camp-2') is distinct from 26
 or (select count(*) from public.classroom_levels where course_id='camp-2')<>26
 or exists(select 1 from public.classroom_items where course_id='camp-2' and level_number>=5)
 or (select count(*) from public.classroom_levels where course_id='camp-2' and (number,title) in ((5,'Zeroth Law'),(6,'Heat Expansion'),(7,'Heat Capacity'),(8,'Heat Transfer'),(9,'1st Law'),(10,'2nd Law')) )<>6
 or exists(select 1 from public.classroom_levels where course_id='camp-2' and number in (6,7) and coalesce(duration_minutes,question_count,planned_question_count) is not null)
 then raise exception 'Camp 2 syllabus or materials changed since inspection'; end if;
 delete from public.classroom_levels where course_id='camp-2' and number in (6,7);
 update public.classroom_levels set title='Temperature and Heat Properties' where course_id='camp-2' and number=5;
 for n in 8..26 loop
  update public.classroom_levels set number=n-2 where course_id='camp-2' and number=n;
 end loop;
 update public.classroom_enrollments set unlocked_level=greatest(5,unlocked_level-2),updated_at=now() where course_id='camp-2' and unlocked_level>=6;
 update public.classroom_mock_tests set through_level=greatest(5,through_level-2) where course_id='camp-2' and through_level>=6;
 update public.classroom_tutor_events set through_level=greatest(5,through_level-2) where course_id='camp-2' and through_level>=6;
 update public.classroom_courses set level_count=24 where id='camp-2';
end $camp$;
commit;
