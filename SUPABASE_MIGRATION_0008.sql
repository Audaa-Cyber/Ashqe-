-- Core X connection + voice profile tables.
-- Safe to run on an existing project: tables/columns/indexes/policies are created only when missing.

create table if not exists public.x_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  x_user_id text not null,
  x_username text not null,
  x_name text,
  x_avatar_url text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  scope text,
  recent_posts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.x_connections add column if not exists user_id uuid;
alter table public.x_connections add column if not exists x_user_id text;
alter table public.x_connections add column if not exists x_username text;
alter table public.x_connections add column if not exists x_name text;
alter table public.x_connections add column if not exists x_avatar_url text;
alter table public.x_connections add column if not exists access_token text;
alter table public.x_connections add column if not exists refresh_token text;
alter table public.x_connections add column if not exists expires_at timestamptz;
alter table public.x_connections add column if not exists scope text;
alter table public.x_connections add column if not exists recent_posts jsonb not null default '[]'::jsonb;
alter table public.x_connections add column if not exists updated_at timestamptz not null default now();

create unique index if not exists x_connections_user_id_uidx on public.x_connections(user_id);
create unique index if not exists x_connections_x_user_id_uidx on public.x_connections(x_user_id);
create index if not exists x_connections_user_id_idx on public.x_connections(user_id);
create index if not exists x_connections_x_user_id_idx on public.x_connections(x_user_id);

alter table public.x_connections enable row level security;

drop policy if exists "Users can read own X connection" on public.x_connections;
create policy "Users can read own X connection" on public.x_connections for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own X connection" on public.x_connections;
create policy "Users can insert own X connection" on public.x_connections for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own X connection" on public.x_connections;
create policy "Users can update own X connection" on public.x_connections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own X connection" on public.x_connections;
create policy "Users can delete own X connection" on public.x_connections for delete using (auth.uid() = user_id);


create table if not exists public.style_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tone text,
  length_pref text,
  rhythm text,
  topics jsonb not null default '[]'::jsonb,
  signature_phrases jsonb not null default '[]'::jsonb,
  do_list jsonb not null default '[]'::jsonb,
  dont_list jsonb not null default '[]'::jsonb,
  summary text,
  sample_posts jsonb not null default '[]'::jsonb,
  posts_analyzed integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.style_profiles add column if not exists user_id uuid;
alter table public.style_profiles add column if not exists tone text;
alter table public.style_profiles add column if not exists length_pref text;
alter table public.style_profiles add column if not exists rhythm text;
alter table public.style_profiles add column if not exists topics jsonb not null default '[]'::jsonb;
alter table public.style_profiles add column if not exists signature_phrases jsonb not null default '[]'::jsonb;
alter table public.style_profiles add column if not exists do_list jsonb not null default '[]'::jsonb;
alter table public.style_profiles add column if not exists dont_list jsonb not null default '[]'::jsonb;
alter table public.style_profiles add column if not exists summary text;
alter table public.style_profiles add column if not exists sample_posts jsonb not null default '[]'::jsonb;
alter table public.style_profiles add column if not exists posts_analyzed integer not null default 0;
alter table public.style_profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists style_profiles_user_id_uidx on public.style_profiles(user_id);
create index if not exists style_profiles_user_id_idx on public.style_profiles(user_id);

alter table public.style_profiles enable row level security;

drop policy if exists "Users can read own style profile" on public.style_profiles;
create policy "Users can read own style profile" on public.style_profiles for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own style profile" on public.style_profiles;
create policy "Users can insert own style profile" on public.style_profiles for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own style profile" on public.style_profiles;
create policy "Users can update own style profile" on public.style_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own style profile" on public.style_profiles;
create policy "Users can delete own style profile" on public.style_profiles for delete using (auth.uid() = user_id);
