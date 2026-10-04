-- Decision lifecycle + safe decision->mission conversion invariants.
alter table public.ashqe_decisions
  add column if not exists status text not null default 'candidate';

alter table public.ashqe_decisions
  drop constraint if exists ashqe_decisions_status_check;

alter table public.ashqe_decisions
  add constraint ashqe_decisions_status_check
  check (status in ('candidate','approved','rejected','executing','completed','expired'));

drop index if exists public.ashqe_decision_active_dedupe_idx;
create unique index if not exists ashqe_decision_active_dedupe_idx
  on public.ashqe_decisions(user_id, opportunity_id, selected_action)
  where status in ('candidate','approved','executing');

create index if not exists ashqe_decisions_user_status_idx
  on public.ashqe_decisions(user_id,status,created_at desc);

-- A mission can only execute the decision it was created from for the same owner.
create or replace function public.ashqe_validate_mission_decision_owner()
returns trigger
language plpgsql
as $$
begin
  if new.decision_id is not null and not exists (
    select 1 from public.ashqe_decisions d
    where d.id = new.decision_id and d.user_id = new.user_id
  ) then
    raise exception 'mission_decision_owner_mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists ashqe_mission_decision_owner_guard on public.ashqe_missions;
create trigger ashqe_mission_decision_owner_guard
before insert or update of decision_id,user_id on public.ashqe_missions
for each row execute function public.ashqe_validate_mission_decision_owner();

-- Prevent duplicate active missions for the same decision.
create unique index if not exists ashqe_mission_active_decision_idx
  on public.ashqe_missions(decision_id)
  where decision_id is not null
    and status not in ('completed','cancelled','escalated','failed');

-- Foreign key is additive and safe for existing rows.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ashqe_missions_decision_fk'
  ) then
    alter table public.ashqe_missions
      add constraint ashqe_missions_decision_fk
      foreign key (decision_id) references public.ashqe_decisions(id) on delete set null;
  end if;
end $$;
