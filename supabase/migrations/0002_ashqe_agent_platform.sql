-- Ashqe agent platform foundation
create extension if not exists pgcrypto;

create table if not exists public.ashqe_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('voice','interest','opinion','project','person','goal','rule','fact')),
  title text not null,
  content text not null,
  importance smallint not null default 3 check (importance between 1 and 5),
  source text not null default 'user',
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ashqe_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  instruction text not null,
  schedule text not null,
  timezone text not null default 'UTC',
  enabled boolean not null default true,
  destination text not null default 'app' check (destination in ('app','telegram','both')),
  permission text not null default 'suggest' check (permission in ('suggest','draft','execute')),
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ashqe_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.ashqe_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('queued','running','succeeded','failed')),
  summary text,
  result jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.ashqe_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('trend','conversation','content','bd','research','insight')),
  title text not null,
  summary text not null,
  confidence numeric(5,2),
  urgency smallint default 3,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','saved','dismissed','acted')),
  created_at timestamptz not null default now()
);

create table if not exists public.ashqe_content_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('post','reply','thread')),
  source_text text not null,
  ai_likeness numeric(5,2),
  quality_score numeric(5,2),
  authenticity_flags jsonb not null default '[]'::jsonb,
  recommendation text not null default 'review',
  created_at timestamptz not null default now()
);

create table if not exists public.ashqe_telegram_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chat_id text not null unique,
  username text,
  connected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists ashqe_memories_user_idx on public.ashqe_memories(user_id, updated_at desc);
create index if not exists ashqe_jobs_due_idx on public.ashqe_jobs(enabled, next_run_at);
create index if not exists ashqe_signals_user_idx on public.ashqe_signals(user_id, created_at desc);
create index if not exists ashqe_reviews_user_idx on public.ashqe_content_reviews(user_id, created_at desc);

alter table public.ashqe_memories enable row level security;
alter table public.ashqe_jobs enable row level security;
alter table public.ashqe_job_runs enable row level security;
alter table public.ashqe_signals enable row level security;
alter table public.ashqe_content_reviews enable row level security;
alter table public.ashqe_telegram_connections enable row level security;

create policy "users own memories" on public.ashqe_memories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own jobs" on public.ashqe_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own job runs" on public.ashqe_job_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own signals" on public.ashqe_signals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own reviews" on public.ashqe_content_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own telegram" on public.ashqe_telegram_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.set_ashqe_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists ashqe_memories_updated on public.ashqe_memories;
create trigger ashqe_memories_updated before update on public.ashqe_memories for each row execute function public.set_ashqe_updated_at();
drop trigger if exists ashqe_jobs_updated on public.ashqe_jobs;
create trigger ashqe_jobs_updated before update on public.ashqe_jobs for each row execute function public.set_ashqe_updated_at();
