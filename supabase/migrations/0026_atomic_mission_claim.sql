-- Atomically claim the current step and increment its attempt counter.
create or replace function public.ashqe_claim_mission_step(
  p_user_id uuid,
  p_mission_id uuid,
  p_position integer,
  p_lease_seconds integer default 120
)
returns public.ashqe_mission_steps
language plpgsql
security invoker
as $$
declare s public.ashqe_mission_steps%rowtype;
begin
  select ms.* into s
  from public.ashqe_mission_steps ms
  join public.ashqe_missions m on m.id=ms.mission_id
  where ms.mission_id=p_mission_id and ms.position=p_position
    and m.id=p_mission_id and m.user_id=p_user_id
    and m.current_step=p_position and m.status in ('ready','running')
    and ms.status='ready'
  for update of ms;

  if not found then raise exception 'mission_step_already_claimed_or_not_ready'; end if;
  if s.attempt >= s.max_attempts then raise exception 'mission_step_retry_budget_exhausted'; end if;

  update public.ashqe_mission_steps
  set status='running', attempt=attempt+1, started_at=now(),
      lease_expires_at=now()+make_interval(secs=>greatest(30,least(p_lease_seconds,600))),
      last_heartbeat_at=now(), failure_reason=null
  where id=s.id
  returning * into s;
  return s;
end;
$$;
