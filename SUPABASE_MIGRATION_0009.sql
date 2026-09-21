-- Chat + drafts tables used by the dashboard and AI operating loop.
-- Safe to run on an existing project: tables/columns/indexes/policies are created only when missing.

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chat_sessions add column if not exists user_id uuid;
alter table public.chat_sessions add column if not exists title text not null default 'New chat';
alter table public.chat_sessions add column if not exists created_at timestamptz not null default now();
alter table public.chat_sessions add column if not exists updated_at timestamptz not null default now();

create index if not exists chat_sessions_user_updated_idx
  on public.chat_sessions(user_id, updated_at desc);

alter table public.chat_sessions enable row level security;

drop policy if exists "Users can read own chat sessions" on public.chat_sessions;
create policy "Users can read own chat sessions"
  on public.chat_sessions for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own chat sessions" on public.chat_sessions;
create policy "Users can insert own chat sessions"
  on public.chat_sessions for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own chat sessions" on public.chat_sessions;
create policy "Users can update own chat sessions"
  on public.chat_sessions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own chat sessions" on public.chat_sessions;
create policy "Users can delete own chat sessions"
  on public.chat_sessions for delete using (auth.uid() = user_id);


create table if not exists public.chat_messages (
  id text primary key,
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  parts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.chat_messages add column if not exists session_id uuid;
alter table public.chat_messages add column if not exists user_id uuid;
alter table public.chat_messages add column if not exists role text;
alter table public.chat_messages add column if not exists parts jsonb not null default '[]'::jsonb;
alter table public.chat_messages add column if not exists created_at timestamptz not null default now();

create index if not exists chat_messages_session_created_idx
  on public.chat_messages(session_id, created_at asc);
create index if not exists chat_messages_user_created_idx
  on public.chat_messages(user_id, created_at asc);

alter table public.chat_messages enable row level security;

drop policy if exists "Users can read own chat messages" on public.chat_messages;
create policy "Users can read own chat messages"
  on public.chat_messages for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own chat messages" on public.chat_messages;
create policy "Users can insert own chat messages"
  on public.chat_messages for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own chat messages" on public.chat_messages;
create policy "Users can update own chat messages"
  on public.chat_messages for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own chat messages" on public.chat_messages;
create policy "Users can delete own chat messages"
  on public.chat_messages for delete using (auth.uid() = user_id);


create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete set null,
  topic text,
  content text not null,
  status text not null default 'draft',
  x_post_id text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.drafts add column if not exists user_id uuid;
alter table public.drafts add column if not exists session_id uuid;
alter table public.drafts add column if not exists topic text;
alter table public.drafts add column if not exists content text;
alter table public.drafts add column if not exists status text not null default 'draft';
alter table public.drafts add column if not exists x_post_id text;
alter table public.drafts add column if not exists published_at timestamptz;
alter table public.drafts add column if not exists created_at timestamptz not null default now();
alter table public.drafts add column if not exists updated_at timestamptz not null default now();

create index if not exists drafts_user_created_idx
  on public.drafts(user_id, created_at desc);
create index if not exists drafts_session_idx
  on public.drafts(session_id);

alter table public.drafts enable row level security;

drop policy if exists "Users can read own drafts" on public.drafts;
create policy "Users can read own drafts"
  on public.drafts for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own drafts" on public.drafts;
create policy "Users can insert own drafts"
  on public.drafts for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own drafts" on public.drafts;
create policy "Users can update own drafts"
  on public.drafts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own drafts" on public.drafts;
create policy "Users can delete own drafts"
  on public.drafts for delete using (auth.uid() = user_id);
