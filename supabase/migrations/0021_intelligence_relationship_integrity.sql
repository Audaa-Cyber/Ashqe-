-- Intelligence OS relationship integrity and mission ownership constraints.
alter table public.ashqe_decisions
  add constraint ashqe_decisions_mission_fk
  foreign key (mission_id) references public.ashqe_missions(id) on delete set null;

create index if not exists ashqe_decisions_opportunity_idx
  on public.ashqe_decisions(opportunity_id, created_at desc);

create index if not exists ashqe_mission_steps_status_idx
  on public.ashqe_mission_steps(mission_id, status, position);

-- Prevent a mission decision from pointing across users.
create or replace function public.ashqe_validate_decision_mission_owner()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.mission_id is not null and not exists (
    select 1 from public.ashqe_missions m
    where m.id = new.mission_id and m.user_id = new.user_id
  ) then
    raise exception 'decision_mission_user_mismatch';
  end if;
  if new.opportunity_id is not null and not exists (
    select 1 from public.ashqe_opportunities o
    where o.id = new.opportunity_id and o.user_id = new.user_id
  ) then
    raise exception 'decision_opportunity_user_mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists ashqe_decision_owner_guard on public.ashqe_decisions;
create trigger ashqe_decision_owner_guard
before insert or update on public.ashqe_decisions
for each row execute function public.ashqe_validate_decision_mission_owner();
