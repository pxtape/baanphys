-- Additive optional solution files; existing classroom_items RLS applies.
alter table public.classroom_items add column answer_file_id text check (answer_file_id ~ '^[a-zA-Z0-9_-]{10,200}$'), add column solution_file_id text check (solution_file_id ~ '^[a-zA-Z0-9_-]{10,200}$');
