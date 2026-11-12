-- Backend adoption: move browser-saved bill requests into Postgres.
-- Owner-scoped rows with a stable (owner, source collection, source id) key so
-- legacy browser records can be replayed idempotently without duplicates.

create table if not exists public.bill_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  source_collection text not null default 'bill_requests_v1',
  source_id text not null,
  title text not null,
  amount_owed numeric(14, 2) not null default 0,
  description text,
  proof_file_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bill_requests_owner_source_key unique (owner_id, source_collection, source_id)
);

create index if not exists bill_requests_owner_submitted_idx
  on public.bill_requests (owner_id, submitted_at desc);

alter table public.bill_requests enable row level security;

drop policy if exists "bill_requests select own" on public.bill_requests;
create policy "bill_requests select own"
  on public.bill_requests for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "bill_requests insert own" on public.bill_requests;
create policy "bill_requests insert own"
  on public.bill_requests for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "bill_requests update own" on public.bill_requests;
create policy "bill_requests update own"
  on public.bill_requests for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "bill_requests delete own" on public.bill_requests;
create policy "bill_requests delete own"
  on public.bill_requests for delete to authenticated
  using (auth.uid() = owner_id);

grant select, insert, update, delete on public.bill_requests to authenticated;
