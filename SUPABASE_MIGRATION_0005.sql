-- Secure Telegram linking.
alter table public.ashqe_telegram_connections alter column chat_id drop not null;
alter table public.ashqe_telegram_connections add column if not exists link_token_hash text unique;
create index if not exists ashqe_telegram_link_token_idx on public.ashqe_telegram_connections(link_token_hash);
