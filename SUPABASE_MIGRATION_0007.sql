-- Atomic autonomous-action claims. Prevent concurrent requests from bypassing daily caps.
create or replace function public.ashqe_claim_autonomous_action(
  p_user_id uuid,
  p_action_type text,
  p_target_id text default null,
  p_policy jsonb default '{}'::jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if p_action_type not in ('post','reply') then return false; end if;
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_action_type));
  v_limit := case when p_action_type='post' then coalesce((p_policy->>'max_posts_per_day')::integer,3) else coalesce((p_policy->>'max_replies_per_day')::integer,5) end;
  select count(*) into v_count from public.ashqe_action_log
    where user_id=p_user_id and action_type=p_action_type and status='executed'
    and created_at >= date_trunc('day', now());
  return v_count < greatest(v_limit,0);
end;
$$;
revoke all on function public.ashqe_claim_autonomous_action(uuid,text,text,jsonb) from public;
