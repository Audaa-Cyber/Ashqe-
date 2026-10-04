-- Intelligence OS maturity: durable opportunities, decisions, attribution,
-- experiments and relationship trajectories.
create table if not exists public.ashqe_opportunity_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  opportunity_key text not null,
  type text not null,
  title text not null,
  state text not null default 'active' check (state in ('active','expired','dismissed','converted')),
  score numeric not null default 0 check (score between 0 and 1),
  confidence numeric not null default 0 check (confidence between 0 and 1),
  urgency numeric not null default 0 check (urgency between 0 and 10),
  evidence_ids jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(user_id, fingerprint)
);
create index if not exists ashqe_opportunity_state_user_idx on public.ashqe_opportunity_state(user_id,state,last_seen_at desc);

create table if not exists public.ashqe_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hypothesis text not null,
  variable text not null,
  control text not null,
  treatment text not null,
  success_metric text not null,
  baseline numeric,
  target numeric,
  status text not null default 'draft' check (status in ('draft','planned','running','paused','completed','invalidated')),
  sample_size integer not null default 0 check (sample_size >= 0),
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ashqe_experiments_user_idx on public.ashqe_experiments(user_id,status,created_at desc);

create table if not exists public.ashqe_experiment_observations (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.ashqe_experiments(id) on delete cascade,
  outcome_id uuid references public.ashqe_outcomes(id) on delete set null,
  variant text not null check (variant in ('control','treatment')),
  metric_value numeric not null,
  observed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists ashqe_experiment_obs_idx on public.ashqe_experiment_observations(experiment_id,observed_at desc);

create table if not exists public.ashqe_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null,
  subject_handle text,
  reach_score numeric not null default 0 check (reach_score between 0 and 1),
  relationship_score numeric not null default 0 check (relationship_score between 0 and 1),
  relevance_score numeric not null default 0 check (relevance_score between 0 and 1),
  reciprocity_score numeric not null default 0 check (reciprocity_score between 0 and 1),
  trajectory numeric not null default 0 check (trajectory between -1 and 1),
  unresolved_loops integer not null default 0 check (unresolved_loops >= 0),
  confidence numeric not null default 0 check (confidence between 0 and 1),
  last_interaction_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id,subject_id)
);
create index if not exists ashqe_relationships_user_idx on public.ashqe_relationships(user_id,relationship_score desc);

create table if not exists public.ashqe_voice_validations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  score numeric not null default 0 check (score between 0 and 100),
  factuality_score numeric not null default 0 check (factuality_score between 0 and 1),
  risk_score numeric not null default 0 check (risk_score between 0 and 1),
  status text not null check (status in ('pass','review','block')),
  flags jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ashqe_voice_validations_user_idx on public.ashqe_voice_validations(user_id,created_at desc);

alter table public.ashqe_opportunity_state enable row level security;
alter table public.ashqe_experiments enable row level security;
alter table public.ashqe_experiment_observations enable row level security;
alter table public.ashqe_relationships enable row level security;
alter table public.ashqe_voice_validations enable row level security;

create policy ashqe_opportunity_state_owner on public.ashqe_opportunity_state for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy ashqe_experiments_owner on public.ashqe_experiments for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy ashqe_relationships_owner on public.ashqe_relationships for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy ashqe_voice_validations_owner on public.ashqe_voice_validations for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy ashqe_experiment_observations_owner on public.ashqe_experiment_observations for all
  using (exists(select 1 from public.ashqe_experiments e where e.id=experiment_id and e.user_id=auth.uid()))
  with check (exists(select 1 from public.ashqe_experiments e where e.id=experiment_id and e.user_id=auth.uid()));

-- One durable decision per user/opportunity/action while active.
create unique index if not exists ashqe_decision_active_dedupe_idx
  on public.ashqe_decisions(user_id,opportunity_id,action)
  where status in ('candidate','approved','executing');
