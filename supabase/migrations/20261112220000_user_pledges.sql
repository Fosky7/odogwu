-- Signed-in donors' pledges, so "My pledges" follows the account across devices.
create extension if not exists "pgcrypto";

create table if not exists public.user_pledges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  cause_id text not null,
  cause_title text not null default '',
  amount_naira numeric(14, 2) not null check (amount_naira > 0),
  reference text not null,
  created_at timestamptz not null default now(),
  constraint user_pledges_owner_reference_key unique (owner_id, reference)
);

create index if not exists user_pledges_owner_idx on public.user_pledges (owner_id, created_at desc);

grant select, insert on public.user_pledges to authenticated;
grant all on public.user_pledges to service_role;

alter table public.user_pledges enable row level security;

drop policy if exists "Donors read their own pledges" on public.user_pledges;
create policy "Donors read their own pledges" on public.user_pledges
  for select to authenticated using (auth.uid() = owner_id);

drop policy if exists "Donors add their own pledges" on public.user_pledges;
create policy "Donors add their own pledges" on public.user_pledges
  for insert to authenticated with check (auth.uid() = owner_id);
