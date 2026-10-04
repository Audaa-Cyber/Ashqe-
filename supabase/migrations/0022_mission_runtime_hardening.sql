-- Mission runtime hardening: explicit pause state, durable task lease identity,
-- and fields needed to recover safely after process crashes.
alter table public.ashqe_missions
  drop constraint if exists ashqe_missions_status_check;

alter table public.ashqe_missions
  add constraint ashqe_missions_status_check check (
    status in ('created','planned','ready','running','waiting_approval','executing',
      'verifying','completed','failed','diagnosing','recovering','escalated','cancelled','paused')
  );

alter table public.ashqe_mission_steps
  add column if not exists task_id uuid,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists failure_reason text;

create unique index if not exists ashqe_mission_steps_task_idx
  on public.ashqe_mission_steps(task_id) where task_id is not null;

create index if not exists ashqe_mission_steps_lease_idx
  on public.ashqe_mission_steps(status, lease_expires_at)
  where status in ('running','executing','verifying');

-- Recover only stale in-flight work. Never resurrect terminal or approval states.
create or replace function public.ashqe_recover_stale_mission_steps(
  p_now timestamptz default now(),
  p_limit integer default 25
)
returns integer
language plpgsql
security invoker
as $$
declare
  recovered integer;
begin
  with stale as (
    select id
    from public.ashqe_mission_steps
    where status in ('running','executing','verifying')
      and lease_expires_at is not null
      and lease_expires_at < p_now
    order by lease_expires_at
    for update skip locked
    limit greatest(1, least(p_limit, 100))
  )
  update public.ashqe_mission_steps s
  set status = 'ready',
      lease_expires_at = null,
      last_heartbeat_at = null,
      failure_reason = 'stale_execution_lease_recovered'
  from stale
  where s.id = stale.id;

  get diagnostics recovered = row_count;
  return recovered;
end;
$$;

-- Transactionally finish a step and advance exactly one checkpoint.
-- This prevents the step-completed / next-step-ready / mission-checkpoint
-- sequence from becoming partially committed.
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
  select * into s
  from public.ashqe_mission_steps
  where id = p_step_id and mission_id = p_mission_id
  for update;

  if not found then raise exception 'mission_step_not_found'; end if;
  if s.status <> 'running' then raise exception 'mission_step_completion_conflict'; end if;

  select * into mission
  from public.ashqe_missions
  where id = p_mission_id and user_id = p_user_id
  for update;

  if not found then raise exception 'mission_not_found'; end if;
  if mission.status not in ('running','executing','verifying') then
    raise exception 'mission_not_executable';
  end if;

  update public.ashqe_mission_steps
  set status='completed', output=coalesce(p_output,'{}'::jsonb),
      verification_id=p_verification_id, completed_at=now(),
      lease_expires_at=null, last_heartbeat_at=now()
  where id=s.id;

  next_position := s.position + 1;
  select id into next_id
  from public.ashqe_mission_steps
  where mission_id=p_mission_id and position=next_position and status='pending'
  for update;

  checkpoint := jsonb_build_object(
    'completedStepId', s.id,
    'completedAt', now(),
    'verificationId', p_verification_id
  );

  if next_id is not null then
    update public.ashqe_mission_steps set status='ready' where id=next_id;
    update public.ashqe_missions
      set status='running', current_step=next_position, checkpoint=checkpoint
      where id=p_mission_id;
  else
    update public.ashqe_missions
      set status='completed', current_step=s.position, checkpoint=checkpoint, completed_at=now()
      where id=p_mission_id;
  end if;

  return jsonb_build_object(
    'step_id', s.id,
    'mission_id', p_mission_id,
    'completed', next_id is null,
    'next_step_id', next_id,
    'current_step', case when next_id is null then s.position else next_position end
  );
end;
$$;
