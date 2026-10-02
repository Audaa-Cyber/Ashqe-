-- Allow durable agent runs to reach a terminal failed state before execution starts.
-- Approval, policy, lifecycle-persistence, and pre-execution failures can occur
-- after the run is claimed (queued) but before task.started transitions it to
-- running. Keeping failed terminalization available from queued prevents stale
-- queued runs when those failures are persisted.

create or replace function public.ashqe_transition_agent_run(
  p_run_id uuid,
  p_user_id uuid,
  p_status text,
  p_output jsonb default null,
  p_reason text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
begin
  select status
    into v_current
  from public.ashqe_agent_runs
  where id = p_run_id
    and user_id = p_user_id
  for update;

  if not found then
    return false;
  end if;

  if p_status = 'running' and v_current <> 'queued' then
    return false;
  end if;

  if p_status = 'blocked' and v_current not in ('queued','running') then
    return false;
  end if;

  if p_status = 'failed' and v_current not in ('queued','running') then
    return false;
  end if;

  if p_status = 'completed' and v_current <> 'running' then
    return false;
  end if;

  update public.ashqe_agent_runs
  set status = p_status,
      output = coalesce(p_output, output),
      reason = coalesce(p_reason, reason),
      started_at = case when p_status = 'running' then coalesce(started_at, now()) else started_at end,
      finished_at = case when p_status in ('completed','blocked','failed','expired','cancelled') then now() else finished_at end,
      updated_at = now()
  where id = p_run_id
    and user_id = p_user_id;

  return found;
end;
$$;

revoke all on function public.ashqe_transition_agent_run(uuid,uuid,text,jsonb,text) from public;
