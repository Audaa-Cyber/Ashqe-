-- Intelligence OS reliability v3: transactional decision conversion and per-user cycle leases.
-- All mutations remain owner-scoped and preserve the existing execution-policy boundary.

alter table public.ashqe_opportunity_state
  drop constraint if exists ashqe_opportunity_state_state_check;
alter table public.ashqe_opportunity_state
  add constraint ashqe_opportunity_state_state_check
  check (state in ('active','expired','dismissed','converted','contradicted'));

create table if not exists public.ashqe_intelligence_cycle_locks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lease_token uuid not null,
  lease_expires_at timestamptz not null,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.ashqe_intelligence_cycle_locks enable row level security;
drop policy if exists ashqe_intelligence_cycle_lock_owner on public.ashqe_intelligence_cycle_locks;
create policy ashqe_intelligence_cycle_lock_owner on public.ashqe_intelligence_cycle_locks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists ashqe_intelligence_cycle_lock_expiry_idx
  on public.ashqe_intelligence_cycle_locks(lease_expires_at);

create or replace function public.ashqe_claim_intelligence_cycle(
  p_user_id uuid,
  p_lease_seconds integer default 240
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_token uuid := gen_random_uuid();
  v_now timestamptz := now();
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'intelligence_cycle_owner_mismatch';
  end if;
  if not exists (select 1 from public.ashqe_execution_policy where user_id = p_user_id) then
    raise exception 'intelligence_cycle_user_not_found';
  end if;
  if p_lease_seconds < 30 or p_lease_seconds > 900 then
    raise exception 'invalid_intelligence_cycle_lease';
  end if;

  insert into public.ashqe_intelligence_cycle_locks(
    user_id, lease_token, lease_expires_at, last_started_at, last_error, updated_at
  )
  values (
    p_user_id, v_token, v_now + make_interval(secs => p_lease_seconds), v_now, null, v_now
  )
  on conflict (user_id) do update
    set lease_token = excluded.lease_token,
        lease_expires_at = excluded.lease_expires_at,
        last_started_at = excluded.last_started_at,
        last_error = null,
        updated_at = excluded.updated_at
    where public.ashqe_intelligence_cycle_locks.lease_expires_at <= v_now;

  if not found then
    return null;
  end if;
  return v_token;
end;
$function$;

create or replace function public.ashqe_release_intelligence_cycle(
  p_user_id uuid,
  p_lease_token uuid,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'intelligence_cycle_owner_mismatch';
  end if;

  update public.ashqe_intelligence_cycle_locks
    set lease_expires_at = v_now,
        last_completed_at = case when p_error is null then v_now else last_completed_at end,
        last_error = left(p_error, 1000),
        updated_at = v_now
  where user_id = p_user_id and lease_token = p_lease_token;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$function$;

create unique index if not exists ashqe_evidence_source_unique
  on public.ashqe_evidence_sources(source_type,source_id);

-- Atomic candidate-decision approval -> mission + step + decision/opportunity state.
create or replace function public.ashqe_approve_decision_create_mission(
  p_user_id uuid,
  p_decision_id uuid,
  p_authority_ceiling jsonb,
  p_step_input jsonb,
  p_expires_at timestamptz
)
returns table(mission_id uuid, reused boolean, action text)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_decision public.ashqe_decisions%rowtype;
  v_opportunity public.ashqe_opportunities%rowtype;
  v_mission public.ashqe_missions%rowtype;
  v_existing_mission_id uuid;
  v_existing_mission_status text;
begin
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'decision_owner_mismatch';
  end if;

  select * into v_decision
  from public.ashqe_decisions
  where id = p_decision_id and user_id = p_user_id
  for update;

  if not found then raise exception 'decision_not_found'; end if;
  if v_decision.status <> 'candidate' then
    select id,status into v_existing_mission_id, v_existing_mission_status
    from public.ashqe_missions
    where decision_id = p_decision_id
      and user_id = p_user_id
      and status not in ('completed','cancelled','escalated','failed')
    order by created_at desc limit 1;
    if found then
      mission_id := v_existing_mission_id; reused := true; action := v_decision.selected_action; return next; return;
    end if;
    raise exception 'decision_not_approvable';
  end if;

  if v_decision.opportunity_id is null then raise exception 'decision_opportunity_not_found'; end if;

  select * into v_opportunity
  from public.ashqe_opportunities
  where id = v_decision.opportunity_id and user_id = p_user_id
  for update;
  if not found then raise exception 'decision_opportunity_not_found'; end if;

  insert into public.ashqe_missions(
    user_id, objective, status, authority_ceiling, current_step, decision_id,
    checkpoint, expires_at
  )
  values (
    p_user_id, v_opportunity.title, 'planned', coalesce(p_authority_ceiling,'[]'::jsonb),
    0, v_decision.id,
    jsonb_build_object('approvedAt', now(), 'decisionId', v_decision.id),
    coalesce(p_expires_at, v_opportunity.expires_at)
  )
  returning * into v_mission;

  insert into public.ashqe_mission_steps(
    mission_id, position, objective, status, required_capabilities, input
  )
  values (
    v_mission.id, 0, v_opportunity.title, 'ready',
    coalesce(p_authority_ceiling,'[]'::jsonb), coalesce(p_step_input,'{}'::jsonb)
  );

  update public.ashqe_decisions
    set status = 'approved', mission_id = v_mission.id
  where id = v_decision.id and user_id = p_user_id and status = 'candidate';

  if not found then raise exception 'decision_approval_conflict'; end if;

  update public.ashqe_opportunities
    set status = 'acted', last_seen_at = now()
  where id = v_opportunity.id and user_id = p_user_id;

  update public.ashqe_opportunity_state
    set state = 'converted', last_seen_at = now()
  where user_id = p_user_id and fingerprint = v_opportunity.fingerprint;

  mission_id := v_mission.id; reused := false; action := v_decision.selected_action;
  return next;
end;
$function$;


revoke all on function public.ashqe_claim_intelligence_cycle(uuid,integer) from public, anon;
revoke all on function public.ashqe_release_intelligence_cycle(uuid,uuid,text) from public, anon;
revoke all on function public.ashqe_approve_decision_create_mission(uuid,uuid,jsonb,jsonb,timestamptz) from public, anon;
grant execute on function public.ashqe_claim_intelligence_cycle(uuid,integer) to authenticated, service_role;
grant execute on function public.ashqe_release_intelligence_cycle(uuid,uuid,text) to authenticated, service_role;
grant execute on function public.ashqe_approve_decision_create_mission(uuid,uuid,jsonb,jsonb,timestamptz) to authenticated, service_role;
