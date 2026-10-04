-- Execution reliability hardening: bounded attempts, heartbeat leases and
-- transactional completion integrity.
alter table public.ashqe_mission_steps
  add column if not exists max_attempts integer not null default 3
  check (max_attempts between 1 and 20);

create or replace function public.ashqe_heartbeat_mission_step(
  p_user_id uuid,
  p_mission_id uuid,
  p_step_id uuid,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
security invoker
as $$
begin
  update public.ashqe_mission_steps s
  set lease_expires_at = now() + make_interval(secs => greatest(30, least(p_lease_seconds, 600))),
      last_heartbeat_at = now()
  from public.ashqe_missions m
  where s.id=p_step_id and s.mission_id=p_mission_id
    and m.id=s.mission_id and m.user_id=p_user_id
    and s.status in ('running','executing','verifying')
    and (s.lease_expires_at is null or s.lease_expires_at >= now());
  return found;
end;
$$;

create or replace function public.ashqe_recover_stale_mission_steps(
  p_now timestamptz default now(),
  p_limit integer default 25
)
returns integer
language plpgsql
security invoker
as $$
declare recovered integer;
begin
  with stale as (
    select s.id, s.attempt, s.max_attempts
    from public.ashqe_mission_steps s
    join public.ashqe_missions m on m.id=s.mission_id
    where s.status in ('running','executing','verifying')
      and s.lease_expires_at is not null
      and s.lease_expires_at < p_now
      and m.status not in ('completed','cancelled','escalated')
    order by s.lease_expires_at
    for update of s skip locked
    limit greatest(1, least(p_limit, 100))
  )
  update public.ashqe_mission_steps s
  set status = case when stale.attempt >= stale.max_attempts then 'failed' else 'ready' end,
      lease_expires_at = null,
      last_heartbeat_at = null,
      failure_reason = case when stale.attempt >= stale.max_attempts
        then 'stale_execution_lease_retry_budget_exhausted'
        else 'stale_execution_lease_recovered' end
  from stale
  where s.id=stale.id;

  get diagnostics recovered = row_count;
  return recovered;
end;
$$;

create or replace function public.ashqe_complete_mission_step(
  p_user_id uuid,
  p_mission_id uuid,
  p_step_id uuid,
  p_output jsonb default '{}'::jsonb,
  p_verification_id uuid default null
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  s public.ashqe_mission_steps%rowtype;
  next_id uuid;
  next_position integer;
  mission public.ashqe_missions%rowtype;
  checkpoint jsonb;
begin
  select * into s from public.ashqe_mission_steps
  where id=p_step_id and mission_id=p_mission_id for update;
  if not found then raise exception 'mission_step_not_found'; end if;
  if s.status <> 'running' then raise exception 'mission_step_completion_conflict'; end if;

  select * into mission from public.ashqe_missions
  where id=p_mission_id and user_id=p_user_id for update;
  if not found then raise exception 'mission_not_found'; end if;
  if mission.status not in ('running','executing','verifying') then raise exception 'mission_not_executable'; end if;

  if p_verification_id is not null and not exists (
    select 1 from public.ashqe_verifications v
    where v.id=p_verification_id and v.user_id=p_user_id
  ) then
    raise exception 'verification_owner_mismatch';
  end if;

  update public.ashqe_mission_steps
  set status='completed', output=coalesce(p_output,'{}'::jsonb),
      verification_id=p_verification_id, completed_at=now(),
      lease_expires_at=null, last_heartbeat_at=now(), failure_reason=null
  where id=s.id;

  next_position := s.position + 1;
  select id into next_id from public.ashqe_mission_steps
  where mission_id=p_mission_id and position=next_position and status='pending'
  for update;

  checkpoint := coalesce(mission.checkpoint,'{}'::jsonb) ||
    jsonb_build_object('completedStepId',s.id,'completedAt',now(),'verificationId',p_verification_id);

  if next_id is not null then
    update public.ashqe_mission_steps set status='ready' where id=next_id;
    update public.ashqe_missions set status='running',current_step=next_position,checkpoint=checkpoint
      where id=p_mission_id;
  else
    update public.ashqe_missions set status='completed',current_step=s.position,checkpoint=checkpoint,completed_at=now()
      where id=p_mission_id;
  end if;

  return jsonb_build_object('step_id',s.id,'mission_id',p_mission_id,'completed',next_id is null,
    'next_step_id',next_id,'current_step',case when next_id is null then s.position else next_position end);
end;
$$;
