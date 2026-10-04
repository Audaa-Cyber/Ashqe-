-- Growth OS reliability: deterministic assignments must be durable and idempotent.

alter table public.ashqe_experiment_observations
  add column if not exists assignment_key text;

create unique index if not exists ashqe_experiment_assignment_unique
  on public.ashqe_experiment_observations(experiment_id, assignment_key)
  where assignment_key is not null;

create index if not exists ashqe_experiment_variant_idx
  on public.ashqe_experiment_observations(experiment_id, variant, observed_at desc);
