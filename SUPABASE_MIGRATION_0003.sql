-- Autonomous X execution controls. Keep publishing/replying disabled by default.
alter table public.ashqe_jobs add column if not exists action_type text not null default 'research';
alter table public.ashqe_jobs add column if not exists max_actions_per_run integer not null default 1;
alter table public.ashqe_jobs add column if not exists require_approval boolean not null default true;

create table if not exists public.ashqe_execution_policy (
  user_id uuid primary key references auth.users(id) on delete cascade,
  autonomous_enabled boolean not null default false,
  autonomous_posts boolean not null default false,
  autonomous_replies boolean not null default false,
  max_posts_per_day integer not null default 3,
  max_replies_per_day integer not null default 5,
  allowed_hours_start smallint not null default 8,
  allowed_hours_end smallint not null default 22,
  require_reply_opt_in boolean not null default true,
  require_ai_reply_approval boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.ashqe_action_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  target_id text,
  content text,
  status text not null default 'blocked',
  reason text,
  policy_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ashqe_execution_policy enable row level security;
alter table public.ashqe_action_log enable row level security;
create policy "own execution policy" on public.ashqe_execution_policy for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own action log" on public.ashqe_action_log for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
