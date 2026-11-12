-- Follow-up to supabase/migrations/0002_backend_keys.sql, which is already live and stays unchanged.
-- Only the statements that were added or changed are applied here.

-- Backend adoption: the browser's remembered backend key
-- (`kross:backend-key:<project>` / collection `backend_key_`).
--
-- Only the public browser key is ever stored. Owner-scoped and idempotent on
-- (owner_id, source_collection, source_id) so retries never duplicate a row.

create table if not exists public.backend_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  source_collection text not null default 'backend_key_',
  source_id text not null,
  key_value text not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint backend_keys_owner_collection_source_key
    unique (owner_id, source_collection, source_id)
);

grant all on public.backend_keys to service_role;
