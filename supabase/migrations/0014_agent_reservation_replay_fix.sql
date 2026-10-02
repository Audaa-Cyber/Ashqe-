-- Make task-scoped action reservations replay-safe.
-- A completed task must never be re-authorized, while a released reservation
-- may be reused by the same task after a legitimate retry.

create or replace function public.ashqe_claim_agent_action(
  p_user_id uuid,
  p_task_id uuid,
  p_action_type text,
  p_target_id text default null,
  p_policy jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
  v_id uuid;
  v_status text;
begin
  if p_action_type not in ('post','reply') then return null; end if;

  perform pg_advisory_xact_lock(hashtext('agent-action:' || p_user_id::text || ':' || p_action_type));

  select id, status
    into v_id, v_status
  from public.ashqe_action_log
  where task_id = p_task_id
    and user_id = p_user_id
    and action_type = p_action_type
  order by created_at desc
  limit 1
  for update;

  if v_id is not null then
    if v_status = 'reserved' then
      return v_id;
    end if;

    if v_status = 'executed' then
      return null;
    end if;

    if v_status = 'released' then
      update public.ashqe_action_log
      set status = 'reserved',
          target_id = p_target_id,
          reason = 'policy_passed_retry',
          policy_snapshot = p_policy,
          created_at = now()
      where id = v_id
        and status = 'released';

      if found then return v_id; end if;
      return null;
    end if;

    return null;
  end if;

  v_limit := case
    when p_action_type = 'post' then coalesce((p_policy->>'max_posts_per_day')::integer, 3)
    else coalesce((p_policy->>'max_replies_per_day')::integer, 5)
  end;

  select count(*) into v_count
  from public.ashqe_action_log
  where user_id = p_user_id
    and action_type = p_action_type
    and status in ('reserved','executed')
    and created_at >= date_trunc('day', now());

  if v_count >= greatest(v_limit, 0) then return null; end if;

  insert into public.ashqe_action_log(
    user_id, task_id, action_type, target_id, status, reason, policy_snapshot
  )
  values(
    p_user_id, p_task_id, p_action_type, p_target_id, 'reserved', 'policy_passed', p_policy
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    return null;
end;
$$;

revoke all on function public.ashqe_claim_agent_action(uuid,uuid,text,text,jsonb) from public;
