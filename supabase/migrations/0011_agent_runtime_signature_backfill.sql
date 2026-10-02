-- Backfill signature enforcement for environments where 0010 was already applied.
alter table public.ashqe_agent_runs
  add column if not exists signature text;

update public.ashqe_agent_runs
set signature = '0000000000000000000000000000000000000000000000000000000000000000'
where signature is null;

alter table public.ashqe_agent_runs
  alter column signature set not null;

alter table public.ashqe_agent_runs
  drop constraint if exists ashqe_agent_runs_signature_check;

alter table public.ashqe_agent_runs
  add constraint ashqe_agent_runs_signature_check
  check (signature ~ '^[a-f0-9]{64}$');
