-- Backend adoption: persist the public browser backend key per signed-in account.
-- Owner-scoped with a stable (owner, source collection, source id) key so the
-- adoption and retries are idempotent and never duplicate rows.

create table if not exists public.backend_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  source_collection text not null default 'backend_key_',
  source_id text not null,
  key_value text not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint backend_keys_owner_source_key unique (owner_id, source_collection, source_id)
);

create index if not exists backend_keys_owner_idx
  on public.backend_keys (owner_id);

alter table public.backend_keys enable row level security;

drop policy if exists "backend_keys select own" on public.backend_keys;
create policy "backend_keys select own"
  on public.backend_keys for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "backend_keys insert own" on public.backend_keys;
create policy "backend_keys insert own"
  on public.backend_keys for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "backend_keys update own" on public.backend_keys;
create policy "backend_keys update own"
  on public.backend_keys for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "backend_keys delete own" on public.backend_keys;
create policy "backend_keys delete own"
  on public.backend_keys for delete to authenticated
  using (auth.uid() = owner_id);

grant select, insert, update, delete on public.backend_keys to authenticated;
