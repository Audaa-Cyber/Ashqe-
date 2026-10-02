-- Allow durable agent runs to reach a terminal failed state before execution starts.
-- Approval, policy, lifecycle persistence, and pre-execution failures can occur
-- after the run is claimed (queued) but before task.started moves the run to
-- running. Keeping failed terminalization available from queued prevents stale
-- queued runs when those failures are persisted.
--
-- Keep the existing RPC signature (returns void) for compatibility with the
-- earlier migration and current callers.

create or replace function public.ashqe_transition_agent_run(
  p_task_id uuid,
  p_user_id uuid,
  p_status text,
  p_output jsonb default null,
  p_reason text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_status text;
begin
  select status into current_status
  from public.ashqe_agent_runs
  where task_id = p_task_id and user_id = p_user_id
  for update;

  if current_status is null then
    raise exception 'agent_run_not_found';
  end if;

  if p_status = 'running' and current_status <> 'queued' then
    raise exception 'invalid_agent_run_transition';
  end if;

  if p_status = 'blocked' and current_status not in ('queued','running') then
    raise exception 'invalid_agent_run_transition';
  end if;

  if p_status = 'failed' and current_status not in ('queued','running') then
    raise exception 'invalid_agent_run_transition';
  end if;

  if p_status = 'completed' and current_status <> 'running' then
    raise exception 'invalid_agent_run_transition';
  end if;

  update public.ashqe_agent_runs
  set status = p_status,
      output = case when p_status in ('completed','blocked','failed') then p_output else output end,
      reason = case when p_status in ('completed','blocked','failed') then p_reason else reason end,
      started_at = case when p_status = 'running' then coalesce(started_at, now()) else started_at end,
      finished_at = case when p_status in ('completed','blocked','failed') then now() else finished_at end
  where task_id = p_task_id and user_id = p_user_id;
end;
$$;
