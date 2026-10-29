alter table public.classroom_accounts
 add column class_level text not null default '' check(char_length(class_level)<=100),
 add column school_name text not null default '' check(char_length(school_name)<=200),
 add column posn_center text not null default '' check(char_length(posn_center)<=200);
grant update(class_level,school_name,posn_center) on public.classroom_accounts to authenticated;
create policy "Student edits own classroom profile" on public.classroom_accounts for update to authenticated
 using(user_id=(select auth.uid()) and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false))
 with check(user_id=(select auth.uid()) and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create or replace function classroom_private.stamp_classroom_profile() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 NEW.profile_updated_at=now();
 if (NEW.additional_info,NEW.class_level,NEW.school_name,NEW.posn_center) is distinct from (OLD.additional_info,OLD.class_level,OLD.school_name,OLD.posn_center) then NEW.additional_updated_at=now(); end if;
 return NEW;
end $$;
