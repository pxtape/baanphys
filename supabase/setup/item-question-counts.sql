alter table public.classroom_items add column question_count integer check (question_count between 0 and 100000);
create or replace function classroom_private.sync_item_question_total() returns trigger language plpgsql security invoker set search_path = '' as $$
declare c text; n integer;
begin
  if TG_OP = 'DELETE' then c:=OLD.course_id; n:=OLD.level_number; else c:=NEW.course_id; n:=NEW.level_number; end if;
  perform 1 from public.classroom_levels where course_id=c and number=n for update;
  update public.classroom_levels set question_count=(select case when count(*)=0 or count(*) filter(where question_count is null)>0 then null else sum(question_count)::integer end from public.classroom_items where course_id=c and level_number=n and kind in ('sheet','homework')) where course_id=c and number=n;
  if TG_OP='UPDATE' and (OLD.course_id,OLD.level_number) is distinct from (NEW.course_id,NEW.level_number) then
    perform 1 from public.classroom_levels where course_id=OLD.course_id and number=OLD.level_number for update;
    update public.classroom_levels set question_count=(select case when count(*)=0 or count(*) filter(where question_count is null)>0 then null else sum(question_count)::integer end from public.classroom_items where course_id=OLD.course_id and level_number=OLD.level_number and kind in ('sheet','homework')) where course_id=OLD.course_id and number=OLD.level_number;
  end if;
  return null;
end $$;
create trigger sync_item_question_total after insert or update or delete on public.classroom_items for each row execute function classroom_private.sync_item_question_total();

