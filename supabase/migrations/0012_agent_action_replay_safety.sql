-- Replay-safe autonomous-action reservations and complete agent-run lifecycle transitions.
-- Each Operator task gets at most one action reservation, so duplicate dispatches
-- cannot consume the daily quota twice.

alter table public.ashqe_action_log
  add column if not exists task_id uuid;

create unique index if not exists ashqe_action_log_task_unique_idx
  on public.ashqe_action_log(task_id)
  where task_id is not null;

alter table public.ashqe_agent_runs
  add column if not exists action_reservation_id uuid references public.ashqe_action_log(id);

create index if not exists ashqe_agent_runs_action_reservation_idx
  on public.ashqe_agent_runs(action_reservation_id)
  where action_reservation_id is not null;

-- Preserve the original four-argument RPC for existing callers.
-- AgentRuntime uses this task-bound variant for replay-safe reservations.
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
begin
  if p_action_type not in ('post','reply') then return null; end if;

  perform pg_advisory_xact_lock(hashtext('agent-action:' || p_user_id::text || ':' || p_action_type));

  select id into v_id
  from public.ashqe_action_log
  where task_id = p_task_id and user_id = p_user_id
    and action_type = p_action_type and status = 'reserved'
  limit 1;

  if v_id is not null then return v_id; end if;

  select id into v_id
  from public.ashqe_action_log
  where task_id = p_task_id and user_id = p_user_id
    and action_type = p_action_type and status = 'executed'
  limit 1;

  if v_id is not null then return v_id; end if;

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
    select id into v_id
    from public.ashqe_action_log
    where task_id = p_task_id and user_id = p_user_id
    limit 1;
    return v_id;
end;
$$;

revoke all on function public.ashqe_claim_agent_action(uuid,uuid,text,text,jsonb) from public;

create or replace function public.ashqe_attach_agent_reservation(
  p_task_id uuid,
  p_user_id uuid,
  p_reservation_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ashqe_agent_runs
  set action_reservation_id = p_reservation_id
  where task_id = p_task_id
    and user_id = p_user_id
    and status = 'queued'
    and exists (
      select 1
      from public.ashqe_action_log
      where id = p_reservation_id
        and task_id = p_task_id
        and user_id = p_user_id
        and status = 'reserved'
    );

  return found;
end;
$$;

revoke all on function public.ashqe_attach_agent_reservation(uuid,uuid,uuid) from public;

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

  select action_reservation_id into v_reservation_id
  from public.ashqe_agent_runs
  where task_id = p_task_id
    and user_id = p_user_id
  for update;

  if v_reservation_id is null then return true; end if;

  update public.ashqe_action_log
  set status = p_status,
      reason = case
        when p_status = 'executed' then 'agent_task_completed'
        else 'agent_task_not_executed'
      end
  where id = v_reservation_id
    and user_id = p_user_id
    and status = 'reserved';

  return true;
end;
$$;

revoke all on function public.ashqe_settle_agent_reservation(uuid,uuid,text) from public;

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

  if p_status in ('completed','failed') and current_status <> 'running' then
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


-- Final side-effect guard for Operator handlers.
-- A write must still own an active reservation immediately before the external side effect.
create or replace function public.ashqe_assert_agent_action_reservation(
  p_task_id uuid,
  p_user_id uuid,
  p_action_type text,
  p_target_id text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation_id uuid;
begin
  if p_action_type not in ('post','reply') then return false; end if;

  select ar.action_reservation_id into v_reservation_id
  from public.ashqe_agent_runs ar
  join public.ashqe_action_log al on al.id = ar.action_reservation_id
  where ar.task_id = p_task_id
    and ar.user_id = p_user_id
    and ar.status = 'running'
    and al.user_id = p_user_id
    and al.action_type = p_action_type
    and al.status = 'reserved'
    and (p_target_id is null or al.target_id = p_target_id)
  for update of al;

  return v_reservation_id is not null;
end;
$$;

revoke all on function public.ashqe_assert_agent_action_reservation(uuid,uuid,text,text) from public;
