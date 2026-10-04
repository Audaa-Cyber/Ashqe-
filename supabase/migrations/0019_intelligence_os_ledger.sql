-- Intelligence OS durable ledger: evidence -> opportunity -> decision -> mission -> verification -> outcome -> learning.
-- This migration is additive and intentionally keeps the existing agent runtime,
-- action reservations, approval gates, and RLS boundaries as the execution authority.

create table if not exists public.ashqe_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  source_type text not null check (source_type in ('x','web','user','internal')),
  source_url text,
  claim text not null,
  classification text not null default 'direct' check (classification in ('direct','derived','inferred')),
  observed_at timestamptz not null default now(),
  expires_at timestamptz,
  confidence numeric(5,2) not null default 0,
  uncertainty numeric(5,2) not null default 1,
  provider_agreement numeric(5,2) not null default 0,
  contradiction_ids jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ashqe_evidence_sources (
  evidence_id uuid not null references public.ashqe_evidence(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  author_id text,
  metadata jsonb not null default '{}'::jsonb,
  primary key (evidence_id, source_type, source_id)
);

create table if not exists public.ashqe_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  type text not null,
  topic text not null,
  intent text,
  title text not null,
  why_now text not null,
  confidence numeric(5,2) not null default 0,
  urgency smallint not null default 3,
  freshness numeric(5,2) not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'open' check (status in ('open','acted','dismissed','expired','contradicted')),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, fingerprint)
);

create table if not exists public.ashqe_opportunity_evidence (
  opportunity_id uuid not null references public.ashqe_opportunities(id) on delete cascade,
  evidence_id uuid not null references public.ashqe_evidence(id) on delete cascade,
  primary key (opportunity_id, evidence_id)
);

create table if not exists public.ashqe_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.ashqe_opportunities(id) on delete set null,
  mission_id uuid,
  selected_action text not null,
  score numeric(7,4) not null,
  expected_value numeric(7,4) not null default 0,
  evidence_strength numeric(7,4) not null default 0,
  confidence numeric(7,4) not null default 0,
  freshness numeric(7,4) not null default 0,
  strategic_alignment numeric(7,4) not null default 0,
  relationship_value numeric(7,4) not null default 0,
  historical_success numeric(7,4) not null default 0,
  execution_cost numeric(7,4) not null default 0,
  risk numeric(7,4) not null default 0,
  uncertainty numeric(7,4) not null default 0,
  alternatives jsonb not null default '[]'::jsonb,
  rationale text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ashqe_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  objective text not null,
  status text not null default 'created' check (status in ('created','planned','ready','running','waiting_approval','executing','verifying','completed','failed','diagnosing','recovering','escalated','cancelled')),
  authority_ceiling jsonb not null default '[]'::jsonb,
  current_step integer not null default 0,
  attempt integer not null default 0,
  decision_id uuid references public.ashqe_decisions(id) on delete set null,
  parent_mission_id uuid references public.ashqe_missions(id) on delete set null,
  checkpoint jsonb not null default '{}'::jsonb,
  failure_class text,
  recovery_strategy text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.ashqe_mission_steps (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.ashqe_missions(id) on delete cascade,
  position integer not null,
  objective text not null,
  status text not null default 'pending' check (status in ('pending','ready','running','waiting_approval','executing','verifying','completed','failed','skipped')),
  required_capabilities jsonb not null default '[]'::jsonb,
  attempt integer not null default 0,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  verification_id uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (mission_id, position)
);

create table if not exists public.ashqe_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_id uuid,
  verification_type text not null,
  status text not null default 'pending' check (status in ('pending','checking','verified','unknown','contradicted')),
  expected_state jsonb not null default '{}'::jsonb,
  observed_state jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  confidence numeric(5,2) not null default 0,
  failure_reason text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ashqe_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_id uuid,
  verification_id uuid references public.ashqe_verifications(id) on delete set null,
  state text not null default 'unknown' check (state in ('unknown','observed','verified','attributed','contradicted','expired')),
  metrics jsonb not null default '{}'::jsonb,
  observed_at timestamptz,
  confidence numeric(5,2) not null default 0,
  unknown_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.ashqe_attributions (
  id uuid primary key default gen_random_uuid(),
  outcome_id uuid not null references public.ashqe_outcomes(id) on delete cascade,
  factor text not null,
  contribution numeric(7,4) not null default 0,
  confidence numeric(5,2) not null default 0,
  methodology text not null,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ashqe_learning (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hypothesis text not null,
  observation text not null,
  evidence jsonb not null default '[]'::jsonb,
  supporting_outcomes jsonb not null default '[]'::jsonb,
  confidence numeric(5,2) not null default 0,
  sample_size integer not null default 0,
  status text not null default 'candidate' check (status in ('candidate','supported','repeated','calibrated','contradicted','recalibrating')),
  created_at timestamptz not null default now(),
  last_validated_at timestamptz
);

create index if not exists ashqe_evidence_user_observed_idx on public.ashqe_evidence(user_id, observed_at desc);
create index if not exists ashqe_opportunities_user_status_idx on public.ashqe_opportunities(user_id, status, last_seen_at desc);
create index if not exists ashqe_decisions_user_created_idx on public.ashqe_decisions(user_id, created_at desc);
create index if not exists ashqe_missions_user_status_idx on public.ashqe_missions(user_id, status, created_at desc);
create index if not exists ashqe_mission_steps_mission_idx on public.ashqe_mission_steps(mission_id, position);
create index if not exists ashqe_verifications_user_created_idx on public.ashqe_verifications(user_id, created_at desc);
create index if not exists ashqe_outcomes_user_created_idx on public.ashqe_outcomes(user_id, created_at desc);
create index if not exists ashqe_learning_user_status_idx on public.ashqe_learning(user_id, status, last_validated_at desc);

alter table public.ashqe_evidence enable row level security;
alter table public.ashqe_evidence_sources enable row level security;
alter table public.ashqe_opportunities enable row level security;
alter table public.ashqe_opportunity_evidence enable row level security;
alter table public.ashqe_decisions enable row level security;
alter table public.ashqe_missions enable row level security;
alter table public.ashqe_mission_steps enable row level security;
alter table public.ashqe_verifications enable row level security;
alter table public.ashqe_outcomes enable row level security;
alter table public.ashqe_attributions enable row level security;
alter table public.ashqe_learning enable row level security;

create policy "users own evidence" on public.ashqe_evidence for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own evidence sources" on public.ashqe_evidence_sources for all using (exists (select 1 from public.ashqe_evidence e where e.id = evidence_id and e.user_id = auth.uid())) with check (exists (select 1 from public.ashqe_evidence e where e.id = evidence_id and e.user_id = auth.uid()));
create policy "users own opportunities" on public.ashqe_opportunities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own opportunity evidence" on public.ashqe_opportunity_evidence for all using (exists (select 1 from public.ashqe_opportunities o where o.id = opportunity_id and o.user_id = auth.uid())) with check (exists (select 1 from public.ashqe_opportunities o where o.id = opportunity_id and o.user_id = auth.uid()));
create policy "users own decisions" on public.ashqe_decisions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own missions" on public.ashqe_missions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own mission steps" on public.ashqe_mission_steps for all using (exists (select 1 from public.ashqe_missions m where m.id = mission_id and m.user_id = auth.uid())) with check (exists (select 1 from public.ashqe_missions m where m.id = mission_id and m.user_id = auth.uid()));
create policy "users own verifications" on public.ashqe_verifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own outcomes" on public.ashqe_outcomes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own attributions" on public.ashqe_attributions for all using (exists (select 1 from public.ashqe_outcomes o where o.id = outcome_id and o.user_id = auth.uid())) with check (exists (select 1 from public.ashqe_outcomes o where o.id = outcome_id and o.user_id = auth.uid()));
create policy "users own learning" on public.ashqe_learning for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.ashqe_mission_steps add constraint ashqe_mission_steps_verification_fk foreign key (verification_id) references public.ashqe_verifications(id) on delete set null;
