-- Mission watchdog recovery v2: stale-step recovery also restores a runnable mission state
-- or escalates exhausted retry budgets instead of leaving executing/verifying missions stranded.

create or replace function public.ashqe_recover_stale_mission_steps(
  p_now timestamptz default now(),
  p_limit integer default 25
)
returns integer
language plpgsql
security invoker
as $function$
declare
  rec record;
  recovered integer := 0;
  next_status text;
begin
  for rec in
    select
      s.id,
      s.mission_id,
      s.attempt,
      s.max_attempts,
      s.position,
      m.status as mission_status,
      m.current_step
    from public.ashqe_mission_steps s
    join public.ashqe_missions m on m.id=s.mission_id
    where s.status in ('running','executing','verifying')
      and s.lease_expires_at is not null
      and s.lease_expires_at < p_now
      and m.status not in ('completed','cancelled','escalated')
    order by s.lease_expires_at
    for update of s skip locked
    limit greatest(1, least(p_limit, 100))
  loop
    if rec.attempt >= rec.max_attempts then
      update public.ashqe_mission_steps
      set status = 'failed',
          lease_expires_at = null,
          last_heartbeat_at = null,
          failure_reason = 'stale_execution_lease_retry_budget_exhausted'
      where id = rec.id;

      update public.ashqe_missions
      set status = 'diagnosing',
          current_step = rec.position,
          failure_class = 'transient',
          recovery_strategy = 'escalate',
          checkpoint = coalesce(checkpoint,'{}'::jsonb) ||
            jsonb_build_object(
              'staleRecovery', true,
              'staleStepId', rec.id,
              'staleRecoveryAt', p_now,
              'retryBudgetExhausted', true
            )
      where id = rec.mission_id
        and status not in ('completed','cancelled','escalated');
    else
      next_status := case
        when rec.mission_status in ('executing','verifying','running') then 'ready'
        else rec.mission_status
      end;

      update public.ashqe_mission_steps
      set status = 'ready',
          lease_expires_at = null,
          last_heartbeat_at = null,
          failure_reason = 'stale_execution_lease_recovered'
      where id = rec.id;

      update public.ashqe_missions
      set status = next_status,
          current_step = rec.position,
          checkpoint = coalesce(checkpoint,'{}'::jsonb) ||
            jsonb_build_object(
              'staleRecovery', true,
              'staleStepId', rec.id,
              'staleRecoveryAt', p_now,
              'retryBudgetExhausted', false
            )
      where id = rec.mission_id
        and status not in ('completed','cancelled','escalated');
    end if;

    recovered := recovered + 1;
  end loop;

  return recovered;
end;
$function$;
