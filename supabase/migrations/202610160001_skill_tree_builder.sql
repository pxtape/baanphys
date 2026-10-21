-- Editable curriculum maps. Existing skill ids and student progress are preserved.
create table if not exists public.skill_maps (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '',
  readiness_stage text not null default 'pre-camp-1',
  is_published boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.skills add column if not exists map_id uuid references public.skill_maps(id) on delete set null;
alter table public.skills add column if not exists archived_at timestamptz;

-- Preserve role protection while allowing a trusted project owner to promote
-- accounts from the Supabase SQL Editor during setup.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
    and coalesce(auth.role(), '') <> 'service_role'
    and current_user not in ('postgres', 'service_role') then
    raise exception 'Only a trusted database owner or service may change user roles';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.skill_prerequisites (
  map_id uuid not null references public.skill_maps(id) on delete cascade,
  prerequisite_skill_id text not null references public.skills(id) on delete restrict,
  skill_id text not null references public.skills(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (map_id, prerequisite_skill_id, skill_id),
  constraint skill_prerequisites_not_self check (prerequisite_skill_id <> skill_id)
);

create index if not exists skills_map_idx on public.skills(map_id) where archived_at is null;
create index if not exists skill_prerequisites_target_idx on public.skill_prerequisites(map_id, skill_id);

-- Seed the current built-in curriculum as a published map so existing students
-- retain the same tree and progress after switching to data-backed maps.
do $$
declare
  v_map_id uuid;
  v_owner_id uuid;
begin
  select id into v_map_id from public.skill_maps where title = 'แผนที่ฟิสิกส์เดิม' order by created_at limit 1;
  if v_map_id is null then
    select id into v_owner_id from public.profiles where role = 'admin' order by created_at limit 1;
    if v_owner_id is null then
      -- Seed map ownership is assigned to the first profile; if no profile exists,
      -- the map is created lazily by the first teacher/admin save.
      return;
    end if;
    insert into public.skill_maps (title, description, readiness_stage, is_published, created_by)
    values ('แผนที่ฟิสิกส์เดิม', 'แผนที่ทักษะตั้งต้นของบ้านฟิสิกส์', 'pre-camp-1', true, v_owner_id)
    returning id into v_map_id;
  end if;
  update public.skills set map_id = v_map_id where map_id is null and id in (
    'vectors','kinematics','projectile','newton','energy','rotation','orbital-motion',
    'thermal-basics','ideal-gas','thermodynamics','oscillations','waves','optics',
    'charge-field','potential','circuits','magnetism','induction','em-waves'
  );
  insert into public.skill_prerequisites (map_id, prerequisite_skill_id, skill_id)
  select v_map_id, prereq, s.id
  from public.skills s
  cross join lateral unnest(s.prerequisites) as prereq
  where s.map_id = v_map_id
  on conflict do nothing;
end $$;

alter table public.skill_maps enable row level security;
alter table public.skill_prerequisites enable row level security;

drop policy if exists "Read published skill maps" on public.skill_maps;
create policy "Read published skill maps" on public.skill_maps
for select to anon, authenticated
using (is_published or created_by = (select auth.uid()) or exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
));

drop policy if exists "Read prerequisites for visible maps" on public.skill_prerequisites;
create policy "Read prerequisites for visible maps" on public.skill_prerequisites
for select to anon, authenticated
using (exists (select 1 from public.skill_maps m where m.id = map_id and m.is_published));

drop policy if exists "Read visible map skills" on public.skills;
drop policy if exists "Authenticated users can read skills" on public.skills;
create policy "Read visible map skills" on public.skills
for select to anon, authenticated
using (
  (map_id is null and auth.role() = 'authenticated')
  or exists (select 1 from public.skill_maps m where m.id = map_id and (m.is_published or m.created_by = (select auth.uid()) or exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  )))
);

grant select on public.skill_maps, public.skill_prerequisites to anon, authenticated;
grant select on public.skills to anon;

create or replace function public.save_skill_map(
  p_map_id uuid,
  p_title text,
  p_description text,
  p_readiness_stage text,
  p_is_published boolean,
  p_nodes jsonb,
  p_edges jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.app_role;
  v_map_id uuid := p_map_id;
  v_node jsonb;
  v_edge jsonb;
  v_cycle boolean;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select role into v_role from public.profiles where id = v_user_id;
  if v_role is null or v_role not in ('teacher', 'admin') then raise exception 'Teacher or admin role required' using errcode = '42501'; end if;
  if p_title is null or char_length(trim(p_title)) not between 2 and 120 then raise exception 'Invalid map title'; end if;
  if coalesce(p_readiness_stage, 'pre-camp-1') not in ('pre-camp-1', 'camp-1', 'camp-2', 'olympiad') then raise exception 'Invalid readiness stage'; end if;
  if jsonb_typeof(p_nodes) <> 'array' or jsonb_array_length(p_nodes) < 1 or jsonb_array_length(p_nodes) > 200 then raise exception 'Map must contain 1 to 200 nodes'; end if;
  if jsonb_typeof(p_edges) <> 'array' or jsonb_array_length(p_edges) > 500 then raise exception 'Map may contain at most 500 connections'; end if;

  if v_map_id is null then
    insert into public.skill_maps (title, description, readiness_stage, is_published, created_by)
    values (trim(p_title), left(coalesce(p_description, ''), 1000), coalesce(p_readiness_stage, 'pre-camp-1'), coalesce(p_is_published, false), v_user_id)
    returning id into v_map_id;
  else
    update public.skill_maps set title = trim(p_title), description = left(coalesce(p_description, ''), 1000), readiness_stage = coalesce(p_readiness_stage, 'pre-camp-1'), is_published = coalesce(p_is_published, false), updated_at = now()
    where id = v_map_id and (created_by = v_user_id or v_role = 'admin');
    if not found then raise exception 'Map not found or access denied' using errcode = '42501'; end if;
  end if;

  for v_node in select value from jsonb_array_elements(p_nodes) loop
    if coalesce(v_node->>'id','') !~ '^[a-z0-9][a-z0-9-]{1,79}$' then raise exception 'Invalid node id'; end if;
    if char_length(coalesce(v_node->>'title','')) not between 1 and 120 then raise exception 'Invalid node title'; end if;
    insert into public.skills (id, title, subtitle, subject, formula, prerequisites, position_x, position_y, sort_order, map_id, archived_at)
    values (v_node->>'id', v_node->>'title', left(coalesce(v_node->>'subtitle',''), 240), coalesce(v_node->>'subject','mechanics'), nullif(left(coalesce(v_node->>'formula',''), 500), ''), '{}', coalesce((v_node->>'x')::integer, 0), coalesce((v_node->>'y')::integer, 0), 0, v_map_id, null)
    on conflict (id) do update set title = excluded.title, subtitle = excluded.subtitle, subject = excluded.subject, formula = excluded.formula, position_x = excluded.position_x, position_y = excluded.position_y, map_id = v_map_id, archived_at = null
    where public.skills.map_id = v_map_id or public.skills.map_id is null;
    if not found then raise exception 'Node id belongs to another map'; end if;
  end loop;

  delete from public.skill_prerequisites where map_id = v_map_id;
  for v_edge in select value from jsonb_array_elements(p_edges) loop
    if not exists (select 1 from public.skills where id = v_edge->>'source' and map_id = v_map_id and archived_at is null)
      or not exists (select 1 from public.skills where id = v_edge->>'target' and map_id = v_map_id and archived_at is null) then
      raise exception 'Connections must stay within this map';
    end if;
    if v_edge->>'source' = v_edge->>'target' then raise exception 'A skill cannot require itself'; end if;
    insert into public.skill_prerequisites (map_id, prerequisite_skill_id, skill_id)
    values (v_map_id, v_edge->>'source', v_edge->>'target');
  end loop;

  with recursive walk(start_id, current_id, path, has_cycle) as (
    select prerequisite_skill_id, skill_id, array[prerequisite_skill_id, skill_id], prerequisite_skill_id = skill_id
    from public.skill_prerequisites where map_id = v_map_id
    union all
    select w.start_id, e.skill_id, w.path || e.skill_id, e.skill_id = w.start_id or e.skill_id = any(w.path)
    from walk w join public.skill_prerequisites e on e.map_id = v_map_id and e.prerequisite_skill_id = w.current_id
    where not w.has_cycle
  ) select exists(select 1 from walk where has_cycle) into v_cycle;
  if v_cycle then raise exception 'Prerequisite connections cannot contain a cycle'; end if;

  -- Retire omitted nodes without deleting their historical student progress.
  update public.skills s set archived_at = now()
  where s.map_id = v_map_id and s.archived_at is null
    and not exists (select 1 from jsonb_array_elements(p_nodes) n where n->>'id' = s.id);
  delete from public.skill_prerequisites where map_id = v_map_id and (
    exists (select 1 from public.skills s where s.id = prerequisite_skill_id and s.archived_at is not null)
    or exists (select 1 from public.skills s where s.id = skill_id and s.archived_at is not null)
  );
  return v_map_id;
end;
$$;

revoke all on function public.save_skill_map(uuid,text,text,text,boolean,jsonb,jsonb) from public, anon;
grant execute on function public.save_skill_map(uuid,text,text,text,boolean,jsonb,jsonb) to authenticated;
