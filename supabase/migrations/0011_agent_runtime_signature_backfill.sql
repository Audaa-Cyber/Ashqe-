-- Backfill signature enforcement for environments where 0010 was already applied.
-- Legacy runs may predate signed task authorization, so the column remains nullable.
alter table public.ashqe_agent_runs
  add column if not exists signature text;

alter table public.ashqe_agent_runs
  drop constraint if exists ashqe_agent_runs_signature_check;

alter table public.ashqe_agent_runs
  add constraint ashqe_agent_runs_signature_check
  check (signature is null or signature ~ '^[a-f0-9]{64}$');
