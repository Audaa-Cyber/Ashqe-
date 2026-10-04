-- Attribution/learning durability: idempotent factors and explainable calibration records.
create unique index if not exists ashqe_attribution_factor_unique
  on public.ashqe_attributions(outcome_id,factor);

create index if not exists ashqe_learning_hypothesis_idx
  on public.ashqe_learning(user_id,hypothesis,status,last_validated_at desc);

alter table public.ashqe_experiment_observations
  add column if not exists assignment_key text;

create unique index if not exists ashqe_experiment_assignment_unique
  on public.ashqe_experiment_observations(experiment_id,assignment_key)
  where assignment_key is not null;

alter table public.ashqe_relationships
  add column if not exists evidence jsonb not null default '[]'::jsonb;

create index if not exists ashqe_relationships_last_interaction_idx
  on public.ashqe_relationships(user_id,last_interaction_at desc);
