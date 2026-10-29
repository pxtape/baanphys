-- Runs against existing classroom identities without keeping any changes.
begin;
select set_config('audit.admin', (select id::text from public.profiles where role='admin' limit 1),true);
select set_config('audit.student',(select a.user_id::text from public.classroom_accounts a join public.profiles p on p.id=a.user_id join public.classroom_enrollments e on e.user_id=a.user_id and e.course_id='pre-posn' where p.role<>'admin' limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('audit.admin'),'role','authenticated','is_anonymous',false)::text,true);
set local role authenticated;
insert into public.classroom_items(id,course_id,level_number,kind,title,drive_file_id,question_count,sort_order) values('audit_verification_only','pre-posn',1,'sheet','Temporary rollback test','audit_test_file',3,9999);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('audit.student'),'role','authenticated','is_anonymous',false)::text,true);
do $$declare n integer;begin
 n:=public.classroom_update_question('audit_verification_only',2,true);
 if n<>1 then raise exception 'Question not saved';end if;
 n:=public.classroom_update_question('audit_verification_only',2,true);
 if n<>1 then raise exception 'Duplicate counted';end if;
 n:=public.classroom_update_question('audit_verification_only',2,false);
 if n<>0 then raise exception 'Uncheck failed';end if;
 if not exists(select 1 from public.classroom_question_activity where user_id=auth.uid() and course_id='pre-posn') then raise exception 'Historical activity lost';end if;
 n:=public.classroom_update_question('audit_verification_only',2,true);
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('audit.admin'),'role','authenticated','is_anonymous',false)::text,true);
do $$begin
 begin update public.classroom_items set question_count=4 where id='audit_verification_only';raise exception 'Guard did not protect used material';exception when others then if sqlerrm not like '%CONTENT_HAS_PROGRESS%' then raise;end if;end;
end $$;
select public.classroom_revoke_student(current_setting('audit.student')::uuid,'pre-posn');
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('audit.student'),'role','authenticated','is_anonymous',false)::text,true);
do $$begin
 if exists(select 1 from public.classroom_items where id='audit_verification_only') then raise exception 'Revoked file still exposed';end if;
 if not exists(select 1 from public.classroom_question_items where item_id='audit_verification_only' and user_id=auth.uid() and questions=1) then raise exception 'History lost after revoke';end if;
 begin perform public.classroom_renew_course(auth.uid(),'pre-posn','2026-01-01');raise exception 'Student renewed own course';exception when others then if sqlerrm not like '%CLASSROOM_FORBIDDEN%' then raise;end if;end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('audit.admin'),'role','authenticated','is_anonymous',false)::text,true);
do $$declare p public.classroom_study_plans;due date;begin
 select * into p from public.classroom_study_plans where started_on is not null and paid_until is not null limit 1;
 if not found then raise exception 'No renewal fixture';end if;
 due:=public.classroom_renew_course(p.user_id,p.course_id,p.paid_until);
 if due<=p.paid_until then raise exception 'Renewal date failed';end if;
 begin perform public.classroom_renew_course(p.user_id,p.course_id,p.paid_until);raise exception 'Duplicate renewal accepted';exception when others then if sqlerrm not like '%RENEWAL_CHANGED%' then raise;end if;end;
 if not exists(select 1 from public.classroom_admin_changes where user_id=p.user_id and course_id=p.course_id) then raise exception 'Renewal audit missing';end if;
end $$;
select 'PASS: ownership, revoked history, question idempotency, material protection, atomic renewal and stale-submit checks' as verification;
rollback;

