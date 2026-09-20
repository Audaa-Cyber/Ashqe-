-- Crypto-only billing: USDC / USDT on Solana, Base and Arc.
create table if not exists public.ashqe_billing_plans (
  id text primary key,
  name text not null,
  description text not null default '',
  monthly_usd numeric(12,2) not null check (monthly_usd >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ashqe_payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.ashqe_billing_plans(id),
  chain text not null check (chain in ('solana','base','arc')),
  token text not null check (token in ('USDC','USDT')),
  amount_usd numeric(12,2) not null check (amount_usd > 0),
  amount_units numeric(78,0) not null check (amount_units > 0),
  recipient text not null,
  status text not null default 'pending' check (status in ('pending','confirming','paid','expired','underpaid','rejected','cancelled')),
  expires_at timestamptz not null,
  paid_at timestamptz,
  tx_hash text,
  sender_address text,
  block_number bigint,
  last_scanned_block bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists ashqe_payment_intents_user_idx on public.ashqe_payment_intents(user_id, created_at desc);
create index if not exists ashqe_payment_intents_pending_idx on public.ashqe_payment_intents(status, expires_at);
create unique index if not exists ashqe_payment_intents_tx_unique on public.ashqe_payment_intents(chain, tx_hash) where tx_hash is not null;

create table if not exists public.ashqe_payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid references public.ashqe_payment_intents(id) on delete set null,
  chain text not null,
  token text not null,
  tx_hash text not null,
  event_key text not null unique,
  sender_address text,
  recipient_address text not null,
  amount_units numeric(78,0) not null,
  block_number bigint,
  confirmations integer not null default 0,
  verified boolean not null default false,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create index if not exists ashqe_payment_events_intent_idx on public.ashqe_payment_events(payment_intent_id, created_at desc);

create table if not exists public.ashqe_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.ashqe_billing_plans(id),
  status text not null default 'active' check (status in ('active','past_due','cancelled','expired')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  payment_intent_id uuid references public.ashqe_payment_intents(id) on delete set null,
  chain text not null,
  token text not null,
  tx_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists ashqe_subscriptions_active_user_idx on public.ashqe_subscriptions(user_id) where status='active';

alter table public.ashqe_billing_plans enable row level security;
alter table public.ashqe_payment_intents enable row level security;
alter table public.ashqe_payment_events enable row level security;
alter table public.ashqe_subscriptions enable row level security;
create policy "public active billing plans" on public.ashqe_billing_plans for select using (active = true);
create policy "own payment intents" on public.ashqe_payment_intents for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own payment events" on public.ashqe_payment_events for select using (exists (select 1 from public.ashqe_payment_intents p where p.id=payment_intent_id and p.user_id=auth.uid()));
create policy "own subscriptions" on public.ashqe_subscriptions for select using (auth.uid()=user_id);
insert into public.ashqe_billing_plans (id,name,description,monthly_usd) values
('pro','Pro','Research, radar, growth and higher automation limits.',20),
('operator','Operator','Full intelligence OS with advanced automation and execution controls.',50)
on conflict (id) do update set name=excluded.name, description=excluded.description, monthly_usd=excluded.monthly_usd, updated_at=now();
