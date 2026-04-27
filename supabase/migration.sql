-- Agent Guardian Phase 2 Supabase schema
-- Run this in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  tier text not null default 'free' check (tier in ('free', 'guardian', 'guardian_pro')),
  created_at timestamptz not null default now()
);

create table if not exists public.agent_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  cid text not null,
  ipfs_url text not null,
  status text not null default 'success' check (status in ('queued', 'uploading', 'complete', 'success', 'failed')),
  backed_up_at timestamptz not null default now()
);

create index if not exists agent_backups_user_time_idx
  on public.agent_backups(user_id, backed_up_at desc);

alter table public.profiles enable row level security;
alter table public.agent_backups enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "agent_backups_select_own"
  on public.agent_backups for select
  using (auth.uid() = user_id);

create policy "agent_backups_insert_own"
  on public.agent_backups for insert
  with check (auth.uid() = user_id);

create policy "agent_backups_update_own"
  on public.agent_backups for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, tier)
  values (new.id, new.email, 'free')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
