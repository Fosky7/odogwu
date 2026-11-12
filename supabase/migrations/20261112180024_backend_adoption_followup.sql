-- Follow-up to supabase/migrations/0001_backend_adoption.sql, which is already live and stays unchanged.
-- Only the statements that were added or changed are applied here.

-- Backend adoption: bill requests that used to live only in the browser
-- (`odogwu.bill-requests.v1` / collection `bill_requests_v1`).
--
-- One row per browser record, owned by the signed-in account. Idempotency is
-- enforced by UNIQUE (owner_id, source_collection, source_id) so the legacy
-- copier can retry, reload and run on another device without ever creating a
-- duplicate row.

create extension if not exists "pgcrypto";

create table if not exists public.bill_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  source_collection text not null default 'bill_requests_v1',
  source_id text not null,
  title text not null,
  amount_owed numeric(14, 2) not null default 0,
  description text,
  proof_file_name text not null default '',
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bill_requests_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint bill_requests_owner_collection_source_key
    unique (owner_id, source_collection, source_id)
);

create index if not exists bill_requests_owner_idx
  on public.bill_requests (owner_id, submitted_at desc);

grant all on public.bill_requests to service_role;
