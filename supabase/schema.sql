-- homi database setup. Paste this whole file into the Supabase SQL Editor and click Run.
-- Safe to run more than once.

-- 1. profiles: one row per person who signs up (passwords are kept by Supabase Auth, not here).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- 2. warranties: one row per warranty in the Warranty Vault.
create table if not exists public.warranties (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item text not null,
  warranty_type text not null default 'other'
    check (warranty_type in ('manufacturer', 'workmanship', 'home-warranty', 'other')),
  provider text not null default '',
  phone text not null default '',
  email text not null default '',
  start_date date not null,
  length_years integer not null default 0 check (length_years >= 0),
  length_months integer not null default 0 check (length_months >= 0),
  covered text not null default '',
  not_covered text not null default '',
  document_name text,
  document_type text,
  document_path text,
  created_at timestamptz not null default now()
);
create index if not exists warranties_owner_idx on public.warranties (owner);

-- 3. quotes: one row per contractor quote in the Quote Checker.
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_name text not null,
  contractor_name text not null default '',
  line_items jsonb not null default '[]'::jsonb,
  deposit_percent numeric,
  deposit_amount numeric,
  warranty_terms text,
  created_at timestamptz not null default now()
);
create index if not exists quotes_owner_idx on public.quotes (owner);

-- 4. Create a profile automatically whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Row level security: turned on for every table.
alter table public.profiles enable row level security;
alter table public.warranties enable row level security;
alter table public.quotes enable row level security;

-- profiles: a signed-in person can read and edit only their own row.
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- warranties: a signed-in person can read, add, edit and delete only their own rows.
drop policy if exists "warranties: read own" on public.warranties;
create policy "warranties: read own" on public.warranties
  for select to authenticated using ((select auth.uid()) = owner);

drop policy if exists "warranties: add own" on public.warranties;
create policy "warranties: add own" on public.warranties
  for insert to authenticated with check ((select auth.uid()) = owner);

drop policy if exists "warranties: edit own" on public.warranties;
create policy "warranties: edit own" on public.warranties
  for update to authenticated
  using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);

drop policy if exists "warranties: delete own" on public.warranties;
create policy "warranties: delete own" on public.warranties
  for delete to authenticated using ((select auth.uid()) = owner);

-- quotes: same rules as warranties.
drop policy if exists "quotes: read own" on public.quotes;
create policy "quotes: read own" on public.quotes
  for select to authenticated using ((select auth.uid()) = owner);

drop policy if exists "quotes: add own" on public.quotes;
create policy "quotes: add own" on public.quotes
  for insert to authenticated with check ((select auth.uid()) = owner);

drop policy if exists "quotes: edit own" on public.quotes;
create policy "quotes: edit own" on public.quotes
  for update to authenticated
  using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);

drop policy if exists "quotes: delete own" on public.quotes;
create policy "quotes: delete own" on public.quotes
  for delete to authenticated using ((select auth.uid()) = owner);

-- 6. Private storage bucket for warranty PDFs and photos (10MB limit, PDFs and images only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'warranty-documents', 'warranty-documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
)
on conflict (id) do nothing;

-- Files live in a folder named after the owner's id, and only that person can touch them.
drop policy if exists "documents: read own" on storage.objects;
create policy "documents: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'warranty-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "documents: add own" on storage.objects;
create policy "documents: add own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'warranty-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "documents: edit own" on storage.objects;
create policy "documents: edit own" on storage.objects
  for update to authenticated
  using (bucket_id = 'warranty-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "documents: delete own" on storage.objects;
create policy "documents: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'warranty-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
