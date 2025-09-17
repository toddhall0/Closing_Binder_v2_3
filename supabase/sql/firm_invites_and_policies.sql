-- Run this SQL in your Supabase project (SQL editor)

-- Tables
create table if not exists public.firm_users (
  firm_owner_id uuid not null references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin',
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (firm_owner_id, user_id)
);

create table if not exists public.firm_invites (
  id bigserial primary key,
  firm_owner_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  token text not null unique,
  expires_at timestamptz,
  accepted_at timestamptz,
  inserted_at timestamptz not null default now()
);

-- Basic indexes
create index if not exists firm_invites_owner_idx on public.firm_invites(firm_owner_id);
create index if not exists firm_invites_email_idx on public.firm_invites(email);

-- Enable RLS
alter table public.firm_users enable row level security;
alter table public.firm_invites enable row level security;

-- Policies
-- firm_users: user can read their own memberships; firm owner can read/insert memberships they own
drop policy if exists "select own firm memberships" on public.firm_users;
create policy "select own firm memberships" on public.firm_users
  for select using (
    auth.uid() = user_id or auth.uid() = firm_owner_id
  );

drop policy if exists "insert by firm owners" on public.firm_users;
create policy "insert by firm owners" on public.firm_users
  for insert with check (
    auth.uid() = firm_owner_id
  );

drop policy if exists "update by firm owners" on public.firm_users;
create policy "update by firm owners" on public.firm_users
  for update using (auth.uid() = firm_owner_id) with check (auth.uid() = firm_owner_id);

drop policy if exists "delete by firm owners" on public.firm_users;
create policy "delete by firm owners" on public.firm_users
  for delete using (auth.uid() = firm_owner_id);

-- firm_invites: only firm owner can manage their invites; invited user can select their invite by token via edge function (service role bypasses RLS)
drop policy if exists "select invites by owner" on public.firm_invites;
create policy "select invites by owner" on public.firm_invites
  for select using (auth.uid() = firm_owner_id);

drop policy if exists "insert invites by owner" on public.firm_invites;
create policy "insert invites by owner" on public.firm_invites
  for insert with check (auth.uid() = firm_owner_id);

drop policy if exists "update invites by owner" on public.firm_invites;
create policy "update invites by owner" on public.firm_invites
  for update using (auth.uid() = firm_owner_id) with check (auth.uid() = firm_owner_id);

drop policy if exists "delete invites by owner" on public.firm_invites;
create policy "delete invites by owner" on public.firm_invites
  for delete using (auth.uid() = firm_owner_id);

-- Suggested (adjust to your schema): lock down clients/projects to owner or client users
-- example clients policy (if not already set):
-- alter table public.clients enable row level security;
-- create policy "select client by owner or email" on public.clients for select using (
--   owner_id = auth.uid() or lower(email) = lower(auth.email()) or id in (
--     select client_id from public.client_users where lower(email) = lower(auth.email())
--   )
-- );


