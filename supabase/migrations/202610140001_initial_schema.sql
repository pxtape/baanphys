-- Run this migration in the Supabase SQL editor or with Supabase CLI.
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('student', 'teacher', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.progress_status as enum ('not_started', 'in_progress', 'completed');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id text primary key,
  title text not null,
  subtitle text not null,
  subject text not null default 'mechanics',
  formula text,
  prerequisites text[] not null default '{}',
  position_x integer not null default 0,
  position_y integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_skill_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id text not null references public.skills(id) on delete cascade,
  status public.progress_status not null default 'not_started',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create index if not exists user_skill_progress_user_idx on public.user_skill_progress(user_id);
create index if not exists skills_subject_order_idx on public.skills(subject, sort_order);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only a trusted server may change user roles';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_change on public.profiles;
create trigger prevent_profile_role_change before update on public.profiles
for each row execute procedure public.prevent_role_change();

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.user_skill_progress enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Authenticated users can read skills" on public.skills;
create policy "Authenticated users can read skills" on public.skills for select to authenticated using (true);

drop policy if exists "Users can read their own progress" on public.user_skill_progress;
create policy "Users can read their own progress" on public.user_skill_progress for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create their own progress" on public.user_skill_progress;
create policy "Users can create their own progress" on public.user_skill_progress for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own progress" on public.user_skill_progress;
create policy "Users can update their own progress" on public.user_skill_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select on public.skills to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.user_skill_progress to authenticated;

insert into public.skills (id, title, subtitle, subject, formula, prerequisites, position_x, position_y, sort_order) values
  ('vectors', 'เวกเตอร์', 'ปริมาณสเกลาร์และเวกเตอร์', 'mechanics', '\\vec{A} = A_x\\hat{i} + A_y\\hat{j}', '{}', 20, 60, 1),
  ('kinematics', 'การเคลื่อนที่', 'ตำแหน่ง · ความเร็ว · ความเร่ง', 'mechanics', 'v = u + at', '{vectors}', 250, 60, 2),
  ('projectile', 'โปรเจกไทล์', 'การเคลื่อนที่สองมิติ', 'mechanics', 'R = \\frac{u^2 \\sin 2\\theta}{g}', '{kinematics}', 480, 0, 3),
  ('newton', 'กฎของนิวตัน', 'แรงและสมดุล', 'mechanics', '\\sum \\vec{F} = m\\vec{a}', '{kinematics}', 480, 150, 4),
  ('energy', 'งานและพลังงาน', 'อนุรักษ์พลังงานกล', 'mechanics', 'K + U = \\mathrm{constant}', '{projectile,newton}', 710, 75, 5)
on conflict (id) do update set title = excluded.title, subtitle = excluded.subtitle, formula = excluded.formula, prerequisites = excluded.prerequisites, position_x = excluded.position_x, position_y = excluded.position_y, sort_order = excluded.sort_order;
