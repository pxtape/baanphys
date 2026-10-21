-- External lesson links and per-student completion for each skill.
-- Content URLs are visible only to authenticated students and authorized teachers.
create table if not exists public.skill_learning_items (
  id uuid primary key default gen_random_uuid(),
  skill_id text not null references public.skills(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  kind text not null check (kind in ('sheet', 'video', 'homework')),
  resource_url text not null check (resource_url ~ '^https://'),
  weight integer not null check (weight between 1 and 100),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists skill_learning_items_skill_idx
  on public.skill_learning_items(skill_id, sort_order, created_at);

create table if not exists public.user_learning_item_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.skill_learning_items(id) on delete cascade,
  status text not null check (status in ('started', 'completed')),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.skill_learning_items(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed')),
  rubric_scores jsonb not null default '{}'::jsonb,
  score integer,
  max_score integer not null default 20 check (max_score > 0),
  feedback text,
  passed boolean,
  reviewed_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint homework_score_bounds check (score is null or (score >= 0 and score <= max_score))
);

create table if not exists public.homework_submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.homework_submissions(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);

create index if not exists user_learning_item_progress_item_idx
  on public.user_learning_item_progress(item_id, status);

alter table public.skill_learning_items enable row level security;
alter table public.user_learning_item_progress enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.homework_submission_files enable row level security;

drop policy if exists "Authenticated users read published learning links" on public.skill_learning_items;
create policy "Authenticated users read published learning links" on public.skill_learning_items
  for select to authenticated using (
    (is_published and exists (
      select 1 from public.skills s join public.skill_maps m on m.id = s.map_id
      where s.id = skill_id and s.archived_at is null and m.is_published
    ))
    or exists (
      select 1 from public.skills s join public.skill_maps m on m.id = s.map_id
      where s.id = skill_id and (m.created_by = (select auth.uid()) or exists (
        select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
      ))
    )
  );

drop policy if exists "Teachers manage learning links on owned maps" on public.skill_learning_items;
create policy "Teachers manage learning links on owned maps" on public.skill_learning_items
  for all to authenticated using (
    exists (
      select 1 from public.skills s join public.skill_maps m on m.id = s.map_id
      where s.id = skill_id and (m.created_by = (select auth.uid()) or exists (
        select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
      ))
    )
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('teacher', 'admin'))
  ) with check (
    exists (
      select 1 from public.skills s join public.skill_maps m on m.id = s.map_id
      where s.id = skill_id and (m.created_by = (select auth.uid()) or exists (
        select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
      ))
    )
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('teacher', 'admin'))
    and (created_by = (select auth.uid()) or exists (
      select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
    ))
  );

drop policy if exists "Users read own item progress" on public.user_learning_item_progress;
create policy "Users read own item progress" on public.user_learning_item_progress
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Teachers read item progress on managed maps" on public.user_learning_item_progress;
create policy "Teachers read item progress on managed maps" on public.user_learning_item_progress
  for select to authenticated using (exists (
    select 1 from public.skill_learning_items i
    join public.skills s on s.id = i.skill_id
    join public.skill_maps m on m.id = s.map_id
    join public.profiles p on p.id = (select auth.uid())
    where i.id = item_id and p.role in ('teacher', 'admin')
      and (p.role = 'admin' or m.created_by = (select auth.uid()))
  ));

drop policy if exists "Students track non-homework learning" on public.user_learning_item_progress;
create policy "Students track non-homework learning" on public.user_learning_item_progress
  for insert to authenticated with check (
    (select auth.uid()) = user_id and exists (
      select 1 from public.skill_learning_items i join public.skills s on s.id = i.skill_id
      join public.skill_maps m on m.id = s.map_id
      where i.id = item_id and (i.kind in ('sheet', 'video') or status = 'started') and i.is_published and m.is_published
    )
  );

drop policy if exists "Students update non-homework learning" on public.user_learning_item_progress;
create policy "Students update non-homework learning" on public.user_learning_item_progress
  for update to authenticated using (
    (select auth.uid()) = user_id and exists (
      select 1 from public.skill_learning_items i join public.skills s on s.id = i.skill_id
      join public.skill_maps m on m.id = s.map_id
      where i.id = item_id and (i.kind in ('sheet', 'video') or status = 'started') and i.is_published and m.is_published
    )
  ) with check ((select auth.uid()) = user_id and status in ('started', 'completed') and exists (
    select 1 from public.skill_learning_items i where i.id = item_id and (i.kind in ('sheet', 'video') or status = 'started')
  ));

drop policy if exists "Teachers manage reviewed homework progress" on public.user_learning_item_progress;
create policy "Teachers manage reviewed homework progress" on public.user_learning_item_progress
  for all to authenticated using (exists (
    select 1 from public.skill_learning_items i join public.skills s on s.id = i.skill_id
    join public.skill_maps m on m.id = s.map_id join public.profiles p on p.id = (select auth.uid())
    where i.id = item_id and i.kind = 'homework' and p.role in ('teacher', 'admin')
      and (p.role = 'admin' or m.created_by = (select auth.uid()))
  )) with check (exists (
    select 1 from public.skill_learning_items i join public.skills s on s.id = i.skill_id
    join public.skill_maps m on m.id = s.map_id join public.profiles p on p.id = (select auth.uid())
    where i.id = item_id and i.kind = 'homework' and p.role in ('teacher', 'admin')
      and (p.role = 'admin' or m.created_by = (select auth.uid()))
  ));

drop policy if exists "Students read own homework submissions" on public.homework_submissions;
create policy "Students read own homework submissions" on public.homework_submissions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Teachers read homework submissions on managed maps" on public.homework_submissions;
create policy "Teachers read homework submissions on managed maps" on public.homework_submissions
  for select to authenticated using (exists (
    select 1 from public.skill_learning_items i join public.skills s on s.id = i.skill_id
    join public.skill_maps m on m.id = s.map_id join public.profiles p on p.id = (select auth.uid())
    where i.id = item_id and p.role in ('teacher', 'admin')
      and (p.role = 'admin' or m.created_by = (select auth.uid()))
  ));

drop policy if exists "Students create homework drafts" on public.homework_submissions;
create policy "Students create homework drafts" on public.homework_submissions
  for insert to authenticated with check (
    user_id = (select auth.uid()) and status = 'draft' and exists (
      select 1 from public.skill_learning_items i join public.skills s on s.id = i.skill_id
      join public.skill_maps m on m.id = s.map_id where i.id = item_id
        and i.kind = 'homework' and i.is_published and m.is_published
    )
  );

drop policy if exists "Students submit own homework drafts" on public.homework_submissions;
create policy "Students submit own homework drafts" on public.homework_submissions
  for update to authenticated using (user_id = (select auth.uid()) and status = 'draft')
  with check (user_id = (select auth.uid()) and status in ('draft', 'submitted'));

drop policy if exists "Students delete own homework drafts" on public.homework_submissions;
create policy "Students delete own homework drafts" on public.homework_submissions
  for delete to authenticated using (user_id = (select auth.uid()) and status = 'draft');

drop policy if exists "Teachers review homework on managed maps" on public.homework_submissions;
create policy "Teachers review homework on managed maps" on public.homework_submissions
  for update to authenticated using (status in ('submitted', 'reviewed') and exists (
    select 1 from public.skill_learning_items i join public.skills s on s.id = i.skill_id
    join public.skill_maps m on m.id = s.map_id join public.profiles p on p.id = (select auth.uid())
    where i.id = item_id and p.role in ('teacher', 'admin')
      and (p.role = 'admin' or m.created_by = (select auth.uid()))
  )) with check (status = 'reviewed' and reviewed_by = (select auth.uid()) and exists (
    select 1 from public.skill_learning_items i join public.skills s on s.id = i.skill_id
    join public.skill_maps m on m.id = s.map_id join public.profiles p on p.id = (select auth.uid())
    where i.id = item_id and p.role in ('teacher', 'admin')
      and (p.role = 'admin' or m.created_by = (select auth.uid()))
  ));

drop policy if exists "Students read own submission files" on public.homework_submission_files;
create policy "Students read own submission files" on public.homework_submission_files
  for select to authenticated using (exists (
    select 1 from public.homework_submissions s where s.id = submission_id and s.user_id = (select auth.uid())
  ));

drop policy if exists "Teachers read submission files on managed maps" on public.homework_submission_files;
create policy "Teachers read submission files on managed maps" on public.homework_submission_files
  for select to authenticated using (exists (
    select 1 from public.homework_submissions h join public.skill_learning_items i on i.id = h.item_id
    join public.skills s on s.id = i.skill_id join public.skill_maps m on m.id = s.map_id
    join public.profiles p on p.id = (select auth.uid())
    where h.id = submission_id and p.role in ('teacher', 'admin')
      and (p.role = 'admin' or m.created_by = (select auth.uid()))
  ));

drop policy if exists "Students add files to own homework drafts" on public.homework_submission_files;
create policy "Students add files to own homework drafts" on public.homework_submission_files
  for insert to authenticated with check (exists (
    select 1 from public.homework_submissions s where s.id = submission_id
      and s.user_id = (select auth.uid()) and s.status = 'draft'
      and split_part(storage_path, '/', 1) = (select auth.uid())::text
      and split_part(storage_path, '/', 2) = s.id::text
  ));

drop policy if exists "Students remove own draft files" on public.homework_submission_files;
create policy "Students remove own draft files" on public.homework_submission_files
  for delete to authenticated using (exists (
    select 1 from public.homework_submissions s where s.id = submission_id
      and s.user_id = (select auth.uid()) and s.status = 'draft'
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('homework-submissions', 'homework-submissions', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.current_user_is_teacher_or_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('teacher', 'admin')); $$;

create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'); $$;

revoke all on function public.current_user_is_teacher_or_admin() from public, anon;
revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_teacher_or_admin() to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;

drop policy if exists "Students upload own homework files" on storage.objects;
create policy "Students upload own homework files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'homework-submissions' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.homework_submissions s where s.id::text = (storage.foldername(name))[2]
      and s.user_id = (select auth.uid()) and s.status = 'draft')
  );

drop policy if exists "Students and teachers read homework files" on storage.objects;
create policy "Students and teachers read homework files" on storage.objects
  for select to authenticated using (
    bucket_id = 'homework-submissions' and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.homework_submission_files f
        join public.homework_submissions h on h.id = f.submission_id
        join public.skill_learning_items i on i.id = h.item_id
        join public.skills s on s.id = i.skill_id
        join public.skill_maps m on m.id = s.map_id
        where f.storage_path = storage.objects.name and public.current_user_is_teacher_or_admin()
          and (m.created_by = (select auth.uid()) or (select public.current_user_is_admin()))
      )
    )
  );

drop policy if exists "Students remove own draft homework files" on storage.objects;
create policy "Students remove own draft homework files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'homework-submissions' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.homework_submissions s where s.id::text = (storage.foldername(name))[2]
      and s.user_id = (select auth.uid()) and s.status = 'draft')
  );

drop policy if exists "Teachers read student profiles" on public.profiles;
create policy "Teachers read student profiles" on public.profiles
  for select to authenticated using (public.current_user_is_teacher_or_admin());

grant select, insert, update on public.skill_learning_items to authenticated;
grant select, insert, update on public.user_learning_item_progress to authenticated;
grant select, insert, update, delete on public.homework_submissions to authenticated;
grant select, insert, delete on public.homework_submission_files to authenticated;

-- RLS protects rows, while this trigger also prevents students changing review fields.
create or replace function public.guard_homework_submission_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_role text;
begin
  select p.role into v_role from public.profiles p where p.id = (select auth.uid());
  if v_role in ('teacher', 'admin') then return new; end if;
  if v_role is distinct from 'student' then raise exception 'not authorized'; end if;

  if tg_op = 'INSERT' then
    if new.user_id <> (select auth.uid()) or new.status <> 'draft'
      or new.rubric_scores <> '{}'::jsonb or new.score is not null
      or new.feedback is not null or new.passed is not null
      or new.reviewed_by is not null or new.reviewed_at is not null then
      raise exception 'not authorized';
    end if;
  else
    if old.user_id <> (select auth.uid()) or old.status <> 'draft'
      or new.status <> 'submitted' or new.user_id is distinct from old.user_id
      or new.item_id is distinct from old.item_id
      or new.rubric_scores is distinct from old.rubric_scores
      or new.score is distinct from old.score
      or new.max_score is distinct from old.max_score
      or new.feedback is distinct from old.feedback
      or new.passed is distinct from old.passed
      or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'not authorized';
    end if;
    if new.submitted_at is null or not exists (
      select 1 from public.homework_submission_files f where f.submission_id = old.id
    ) then
      raise exception 'submission must include at least one uploaded file';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_homework_submission_write on public.homework_submissions;
create trigger guard_homework_submission_write
  before insert or update on public.homework_submissions
  for each row execute function public.guard_homework_submission_write();

-- Enforce upload caps on the server/database too, not only in the browser.
create or replace function public.guard_homework_file_metadata()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_submission public.homework_submissions%rowtype;
  v_file_count integer;
  v_total_bytes bigint;
begin
  select * into v_submission from public.homework_submissions s where s.id = new.submission_id;
  if v_submission.id is null or v_submission.user_id <> (select auth.uid()) or v_submission.status <> 'draft'
    or split_part(new.storage_path, '/', 1) <> (select auth.uid())::text
    or split_part(new.storage_path, '/', 2) <> v_submission.id::text
    or new.mime_type not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') then
    raise exception 'not authorized';
  end if;
  select count(*), coalesce(sum(f.size_bytes), 0) into v_file_count, v_total_bytes
    from public.homework_submission_files f where f.submission_id = new.submission_id;
  if v_file_count >= 8 or v_total_bytes + new.size_bytes > 26214400 then
    raise exception 'homework upload limit exceeded';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_homework_file_metadata on public.homework_submission_files;
create trigger guard_homework_file_metadata
  before insert on public.homework_submission_files
  for each row execute function public.guard_homework_file_metadata();

-- Review and completion are one transaction, so a passed review cannot be saved
-- without also updating the student's HW progress.
create or replace function public.review_homework_submission(
  p_submission_id uuid,
  p_scores jsonb,
  p_feedback text,
  p_passed boolean
) returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid;
  v_item_id uuid;
  v_status text;
  v_role text;
  v_owner uuid;
  v_total integer;
begin
  select p.role into v_role from public.profiles p where p.id = (select auth.uid());
  if v_role not in ('teacher', 'admin') then raise exception 'not authorized'; end if;
  if p_feedback is null or char_length(trim(p_feedback)) not between 3 and 4000
    or jsonb_typeof(p_scores) <> 'object'
    or (p_scores->>'setup') !~ '^[0-5]$'
    or (p_scores->>'principles') !~ '^[0-5]$'
    or (p_scores->>'calculation') !~ '^[0-5]$'
    or (p_scores->>'communication') !~ '^[0-5]$' then
    raise exception 'invalid rubric or feedback';
  end if;
  select h.user_id, h.item_id, h.status, m.created_by into v_user_id, v_item_id, v_status, v_owner
    from public.homework_submissions h
    join public.skill_learning_items i on i.id = h.item_id and i.kind = 'homework'
    join public.skills s on s.id = i.skill_id
    join public.skill_maps m on m.id = s.map_id
    where h.id = p_submission_id for update of h;
  if v_user_id is null or v_status not in ('submitted', 'reviewed')
    or (v_role <> 'admin' and v_owner <> (select auth.uid())) then
    raise exception 'not authorized or submission unavailable';
  end if;
  v_total := (p_scores->>'setup')::integer + (p_scores->>'principles')::integer
    + (p_scores->>'calculation')::integer + (p_scores->>'communication')::integer;
  update public.homework_submissions set status = 'reviewed', rubric_scores = p_scores,
    score = v_total, max_score = 20, feedback = trim(p_feedback), passed = p_passed,
    reviewed_by = (select auth.uid()), reviewed_at = now()
    where id = p_submission_id;
  if p_passed then
    insert into public.user_learning_item_progress(user_id, item_id, status, updated_at)
      values (v_user_id, v_item_id, 'completed', now())
      on conflict (user_id, item_id) do update set status = 'completed', updated_at = excluded.updated_at;
  else
    delete from public.user_learning_item_progress
      where user_id = v_user_id and item_id = v_item_id;
  end if;
end;
$$;

revoke all on function public.review_homework_submission(uuid, jsonb, text, boolean) from public, anon;
grant execute on function public.review_homework_submission(uuid, jsonb, text, boolean) to authenticated;
