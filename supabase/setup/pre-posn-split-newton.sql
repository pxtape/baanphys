-- Owner-approved syllabus change: Newton II (5), Newton III (6), 32 levels.
-- Applies only to the inspected 31-level state with no material at level 5+.
-- No files/progress IDs are deleted or recreated. Total workload remains 677.
begin;
lock table public.classroom_courses, public.classroom_levels, public.classroom_items,
 public.classroom_enrollments, public.classroom_mock_tests, public.classroom_tutor_events,
 public.classroom_progress, public.classroom_question_progress in share row exclusive mode;
do $split$
declare n integer; before_progress bigint; before_questions bigint; before_items bigint;
begin
 if (select level_count from public.classroom_courses where id='pre-posn')=32
    and exists(select 1 from public.classroom_levels where course_id='pre-posn' and number=6 and title='Newton III') then return; end if;
 if (select level_count from public.classroom_courses where id='pre-posn') is distinct from 31
    or (select count(*) from public.classroom_levels where course_id='pre-posn')<>31
    or not exists(select 1 from public.classroom_levels where course_id='pre-posn' and number=5 and title='Newton II & III')
    or exists(select 1 from public.classroom_items where course_id='pre-posn' and level_number>=5)
 then raise exception 'Syllabus changed since inspection; stop and review material mapping'; end if;
 select count(*) into before_progress from public.classroom_progress;
 select count(*) into before_questions from public.classroom_question_progress;
 select count(*) into before_items from public.classroom_items;
 -- Descending updates avoid primary-key collisions. FK guard above ensures no materials move accidentally.
 for n in reverse 31..6 loop
  update public.classroom_levels set number=n+1 where course_id='pre-posn' and number=n;
 end loop;
 update public.classroom_levels set title='Newton II',duration_minutes=null where course_id='pre-posn' and number=5;
 insert into public.classroom_levels(course_id,number,title,duration_minutes) values('pre-posn',6,'Newton III',null);
 update public.classroom_courses set level_count=32 where id='pre-posn';
 -- Keep access and exam coverage attached to the same original subjects.
 update public.classroom_enrollments set unlocked_level=unlocked_level+1,updated_at=now() where course_id='pre-posn' and unlocked_level>=6;
 update public.classroom_mock_tests set through_level=through_level+1 where course_id='pre-posn' and through_level>=5;
 update public.classroom_tutor_events set through_level=through_level+1 where course_id='pre-posn' and through_level>=5;
 if (select count(*) from public.classroom_levels where course_id='pre-posn')<>32
    or not exists(select 1 from public.classroom_levels where course_id='pre-posn' and number=10 and title='Gravity')
    or not exists(select 1 from public.classroom_levels where course_id='pre-posn' and number=32 and title='Magnetic')
    or (select total_questions from public.classroom_course_workload where course_id='pre-posn') is distinct from 677
    or (select count(*) from public.classroom_progress)<>before_progress
    or (select count(*) from public.classroom_question_progress)<>before_questions
    or (select count(*) from public.classroom_items)<>before_items
 then raise exception 'Syllabus verification failed'; end if;
end $split$;
commit;

