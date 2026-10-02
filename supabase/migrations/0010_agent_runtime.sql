-- Durable Ashqe agent runtime state and audit trail.
create table if not exists public.ashqe_agent_runs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null unique, parent_task_id uuid, issuer text not null, target text not null,
  status text not null check (status in ('queued','running','completed','blocked','failed','expired','cancelled')),
  risk text not null check (risk in ('low','medium','high','critical')), goal text not null,
  input jsonb not null default '{}'::jsonb, output jsonb, reason text,
  depth integer not null default 0 check (depth >= 0 and depth <= 32), expires_at timestamptz not null,
  started_at timestamptz, finished_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ashqe_agent_events (
  id bigint generated always as identity primary key, run_id uuid not null references public.ashqe_agent_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, task_id uuid not null, agent text not null,
  event_type text not null, decision text, tool_name text, policy_version text,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists ashqe_agent_runs_user_created_idx on public.ashqe_agent_runs(user_id, created_at desc);
create index if not exists ashqe_agent_runs_status_idx on public.ashqe_agent_runs(status, created_at desc);
create index if not exists ashqe_agent_events_task_idx on public.ashqe_agent_events(task_id, created_at asc);
alter table public.ashqe_agent_runs enable row level security;
alter table public.ashqe_agent_events enable row level security;
create policy "users own agent runs" on public.ashqe_agent_runs for select using (auth.uid() = user_id);
create policy "users own agent events" on public.ashqe_agent_events for select using (auth.uid() = user_id);
drop trigger if exists ashqe_agent_runs_updated on public.ashqe_agent_runs;
create trigger ashqe_agent_runs_updated before update on public.ashqe_agent_runs for each row execute function public.set_ashqe_updated_at();
