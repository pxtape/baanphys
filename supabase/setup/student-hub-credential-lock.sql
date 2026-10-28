alter table public.classroom_accounts add column credential_lock uuid, add column credential_lock_until timestamptz;
alter table public.classroom_mock_tests add column legacy_event_id uuid unique references public.classroom_tutor_events(id);
