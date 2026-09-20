-- Atomic autonomous-action claims and billing settlement.
create or replace function public.ashqe_claim_autonomous_action(
  p_user_id uuid,
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
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_action_type));
  v_limit := case when p_action_type='post' then coalesce((p_policy->>'max_posts_per_day')::integer,3) else coalesce((p_policy->>'max_replies_per_day')::integer,5) end;
  select count(*) into v_count from public.ashqe_action_log
    where user_id=p_user_id and action_type=p_action_type and status in ('reserved','executed')
    and created_at >= date_trunc('day', now());
  if v_count >= greatest(v_limit,0) then return null; end if;
  insert into public.ashqe_action_log(user_id,action_type,target_id,status,reason,policy_snapshot)
    values(p_user_id,p_action_type,p_target_id,'reserved','policy_passed',p_policy)
    returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.ashqe_claim_autonomous_action(uuid,text,text,jsonb) from public;

create or replace function public.ashqe_settle_payment_intent(
  p_intent_id uuid,
  p_user_id uuid,
  p_tx_hash text,
  p_sender_address text,
  p_block_number bigint,
  p_chain text,
  p_token text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id text;
  v_status text;
  v_start timestamptz := now();
  v_end timestamptz := now() + interval '30 days';
begin
  perform pg_advisory_xact_lock(hashtext('billing:' || p_user_id::text));
  select plan_id, status into v_plan_id, v_status
    from public.ashqe_payment_intents
    where id = p_intent_id and user_id = p_user_id
    for update;
  if v_plan_id is null then return false; end if;
  if v_status = 'paid' then return true; end if;
  if v_status not in ('pending','confirming') then return false; end if;
  update public.ashqe_payment_intents set status='paid', paid_at=v_start, tx_hash=p_tx_hash,
    sender_address=p_sender_address, block_number=p_block_number, updated_at=v_start
    where id=p_intent_id and user_id=p_user_id and status <> 'paid';
  update public.ashqe_subscriptions set status='expired', updated_at=v_start
    where user_id=p_user_id and status='active';
  insert into public.ashqe_subscriptions(user_id,plan_id,status,current_period_start,current_period_end,payment_intent_id,chain,token,tx_hash)
    values(p_user_id,v_plan_id,'active',v_start,v_end,p_intent_id,p_chain,p_token,p_tx_hash);
  return true;
exception when unique_violation then return false;
end;
$$;
revoke all on function public.ashqe_settle_payment_intent(uuid,uuid,text,text,bigint,text,text) from public;
