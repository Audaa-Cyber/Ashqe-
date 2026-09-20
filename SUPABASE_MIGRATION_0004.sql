-- Production intelligence hardening.
alter table public.ashqe_jobs add column if not exists config jsonb not null default '{}'::jsonb;
alter table public.ashqe_job_runs add column if not exists attempts integer not null default 0;
create index if not exists ashqe_signals_user_created_idx on public.ashqe_signals(user_id, created_at desc);
create index if not exists ashqe_signals_user_type_idx on public.ashqe_signals(user_id, type, created_at desc);
create index if not exists ashqe_jobs_enabled_idx on public.ashqe_jobs(enabled, next_run_at);
create index if not exists ashqe_action_log_user_created_idx on public.ashqe_action_log(user_id, created_at desc);
create index if not exists ashqe_action_log_daily_idx on public.ashqe_action_log(user_id, action_type, status, created_at desc);
create index if not exists ashqe_memories_user_updated_idx on public.ashqe_memories(user_id, updated_at desc);
