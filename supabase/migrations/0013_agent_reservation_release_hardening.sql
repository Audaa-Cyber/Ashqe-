-- Release an agent action reservation even when it could not be attached
-- to the AgentRun. This closes the attach-failure path where the existing
-- task-scoped settlement function has no reservation id to follow.

create or replace function public.ashqe_release_agent_reservation(
  p_task_id uuid,
  p_user_id uuid,
  p_reservation_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_task_id is null or p_user_id is null or p_reservation_id is null then
    return false;
  end if;

  update public.ashqe_action_log
  set status = 'released',
      reason = 'agent_reservation_attach_failed'
  where id = p_reservation_id
    and user_id = p_user_id
    and status = 'reserved'
    and task_id = p_task_id;

  return found;
end;
$$;

revoke all on function public.ashqe_release_agent_reservation(uuid,uuid,uuid) from public;
