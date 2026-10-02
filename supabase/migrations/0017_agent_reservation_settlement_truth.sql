-- Make reservation settlement report whether this call actually changed
-- the reservation. A false result is safe for release paths (the reservation
-- may already be terminal), but must be treated as a hard failure after an
-- external side effect when settling as executed.

create or replace function public.ashqe_settle_agent_reservation(
  p_task_id uuid,
  p_user_id uuid,
  p_status text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation_id uuid;
begin
  if p_status not in ('executed','released') then
    return false;
  end if;

  select action_reservation_id
    into v_reservation_id
  from public.ashqe_agent_runs
  where task_id = p_task_id
    and user_id = p_user_id
  for update;

  if v_reservation_id is null then
    return false;
  end if;

  update public.ashqe_action_log
  set status = p_status,
      reason = case
        when p_status = 'executed' then 'agent_task_completed'
        else 'agent_task_not_executed'
      end,
      expires_at = null
  where id = v_reservation_id
    and user_id = p_user_id
    and status = 'reserved';

  return found;
end;
$$;

revoke all on function public.ashqe_settle_agent_reservation(uuid,uuid,text) from public;
