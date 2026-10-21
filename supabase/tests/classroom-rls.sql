-- Replace the two sample UUIDs with staging student/admin IDs before running.
-- Integration checks use existing test principals only inside a rolled-back
-- transaction. They do not change passwords, roles or any legacy records.
begin;
insert into public.classroom_accounts(user_id,username,display_name) values('00000000-0000-0000-0000-000000000001','beta_rls_probe','Temporary RLS test');
insert into public.classroom_enrollments(user_id,course_id,unlocked_level) values('00000000-0000-0000-0000-000000000001','pre-posn',1);
insert into public.classroom_items(id,course_id,level_number,kind,title) values('beta_rls_open','pre-posn',1,'sheet','Temporary test'),('beta_rls_locked','pre-posn',2,'video','Temporary test');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
do $$
begin
 if (select count(*) from public.classroom_items where id like 'beta_rls_%')<>1 then raise exception 'RLS failed: locked level exposed'; end if;
 begin
  perform public.classroom_enroll_student('00000000-0000-0000-0000-000000000001','pre-posn');
  raise exception 'RLS failed: student may grant access';
 exception when raise_exception then if sqlerrm<>'CLASSROOM_FORBIDDEN' then raise; end if; end;
 begin
  insert into public.classroom_progress(user_id,item_id,completed) values('00000000-0000-0000-0000-000000000001','beta_rls_locked',true);
  raise exception 'RLS failed: locked progress writable';
 exception when insufficient_privilege then null; end;
 begin
  update public.classroom_enrollments set unlocked_level=31;
  raise exception 'RLS failed: student may edit enrollment';
 exception when insufficient_privilege then null; end;
 insert into public.classroom_progress(user_id,item_id,completed) values('00000000-0000-0000-0000-000000000001','beta_rls_open',true);
 if (select unlocked_level from public.classroom_enrollments where user_id='00000000-0000-0000-0000-000000000001' and course_id='pre-posn')<>1 then raise exception 'RLS failed: checklist auto unlocked'; end if;
end $$;
reset role;
set local role anon;
do $$begin
 begin
  perform 1 from public.classroom_items;
  raise exception 'RLS failed: unauthenticated read';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}',true);
do $$begin
 if not classroom_private.is_admin() then raise exception 'Admin role check failed'; end if;
 perform public.classroom_advance_student('00000000-0000-0000-0000-000000000001','pre-posn',1);
 if (select unlocked_level from public.classroom_enrollments where user_id='00000000-0000-0000-0000-000000000001' and course_id='pre-posn')<>2 then raise exception 'Manual admin unlock failed'; end if;
 begin
  perform public.classroom_advance_student('00000000-0000-0000-0000-000000000001','pre-posn',1);
  raise exception 'Repeated stale unlock was accepted';
 exception when raise_exception then if sqlerrm<>'CLASSROOM_LEVEL_CHANGED' then raise; end if; end;
end $$;
reset role;
rollback;
select 'passed: locked materials, protected progress, admin-only enrollment, manual unlock, stale unlock, unauthenticated denial; transaction rolled back' as classroom_rls_verification;
