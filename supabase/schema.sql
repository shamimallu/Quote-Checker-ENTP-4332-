-- homi database setup.
-- Paste this whole file into the Supabase SQL Editor (Dashboard → SQL Editor → New query) and click Run.
-- Safe to run more than once. Written for a new, empty Supabase project.

-- =====================================================================
-- 1. Tables
-- =====================================================================

-- profiles: one row per person who signs up. Passwords are kept by Supabase Auth, not here.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

-- jobs: one repair project, like "Replace water heater".
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  status text not null default 'getting_quotes'
    check (status in ('getting_quotes', 'hired', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);
create index if not exists jobs_owner_idx on public.jobs (owner);

-- job_members: people a job is shared with (a spouse or roommate). The owner is not listed here.
create table if not exists public.job_members (
  job_id uuid not null references public.jobs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('viewer', 'editor')),
  added_at timestamptz not null default now(),
  primary key (job_id, user_id)
);
create index if not exists job_members_user_idx on public.job_members (user_id);

-- quotes: one contractor quote for a job, plus the Quote Checker's analysis of it.
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  contractor_name text not null default '',
  price numeric(12, 2) check (price >= 0),
  deposit_terms text,
  deposit_percent numeric(5, 2) check (deposit_percent between 0 and 100),
  deposit_amount numeric(12, 2) check (deposit_amount >= 0),
  warranty_terms text,
  line_items jsonb not null default '[]'::jsonb,
  analysis jsonb,
  file_name text,
  file_path text,
  created_at timestamptz not null default now()
);
create index if not exists quotes_job_idx on public.quotes (job_id);

-- job_files: photos, contracts, receipts and other documents for a job.
create table if not exists public.job_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  kind text not null default 'other' check (kind in ('photo', 'contract', 'receipt', 'other')),
  name text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index if not exists job_files_job_idx on public.job_files (job_id);

-- proof_log_entries: dated notes and photos of the work as it happens.
create table if not exists public.proof_log_entries (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  entry_date date not null default current_date,
  note text not null default '',
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists proof_log_entries_job_idx on public.proof_log_entries (job_id);

-- warranties: a warranty for a product or service. Usually linked to a job, but it outlives
-- the job: deleting the job only unlinks it (job_id becomes empty) so it stays in the Vault.
create table if not exists public.warranties (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  product_or_service text not null check (length(trim(product_or_service)) > 0),
  warranty_type text not null default 'other'
    check (warranty_type in ('manufacturer', 'workmanship', 'home-warranty', 'other')),
  provider text not null default '', -- the contractor or manufacturer
  phone text not null default '',
  email text not null default '',
  start_date date not null,
  length_years integer not null default 0 check (length_years >= 0),
  length_months integer not null default 0 check (length_months >= 0),
  -- Worked out by the database from the start date and length, so it is never out of step.
  expires_on date generated always as
    ((start_date + make_interval(years => length_years, months => length_months))::date) stored,
  covered text not null default '',
  not_covered text not null default '',
  document_name text,
  document_type text,
  document_path text,
  created_at timestamptz not null default now()
);
create index if not exists warranties_owner_idx on public.warranties (owner);
create index if not exists warranties_job_idx on public.warranties (job_id);

-- muse_conversations: a chat with Muse, the AI assistant. Private to the person who started it.
create table if not exists public.muse_conversations (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);
create index if not exists muse_conversations_owner_idx on public.muse_conversations (owner);

-- muse_messages: one message in a Muse conversation, from the homeowner or from Muse.
create table if not exists public.muse_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.muse_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists muse_messages_conversation_idx on public.muse_messages (conversation_id, created_at);

-- =====================================================================
-- 2. Create a profile automatically whenever someone signs up
-- =====================================================================

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

-- =====================================================================
-- 3. Access helpers
-- Kept in a "private" schema the website's API can't reach. They run with extra rights only
-- to look up job ownership and sharing, so the policies below don't loop into each other.
-- =====================================================================

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_job_owner(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jobs where id = p_job_id and owner = (select auth.uid())
  );
$$;

create or replace function private.can_view_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jobs where id = p_job_id and owner = (select auth.uid())
  ) or exists (
    select 1 from public.job_members where job_id = p_job_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.can_edit_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jobs where id = p_job_id and owner = (select auth.uid())
  ) or exists (
    select 1 from public.job_members
    where job_id = p_job_id and user_id = (select auth.uid()) and role = 'editor'
  );
$$;

-- True when the signed-in person and p_user_id are on at least one job together.
create or replace function private.shares_a_job_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.jobs j
    left join public.job_members m on m.job_id = j.id
    where (j.owner = (select auth.uid()) and m.user_id = p_user_id)
       or (j.owner = p_user_id and m.user_id = (select auth.uid()))
  ) or exists (
    select 1
    from public.job_members a
    join public.job_members b on a.job_id = b.job_id
    where a.user_id = (select auth.uid()) and b.user_id = p_user_id
  );
$$;

-- Storage helpers: files live in folders named after the job or warranty they belong to.
create or replace function private.can_view_warranty(p_warranty_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.warranties w
    where w.id = p_warranty_id
      and (w.owner = (select auth.uid()) or (w.job_id is not null and private.can_view_job(w.job_id)))
  );
$$;

create or replace function private.can_edit_warranty(p_warranty_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.warranties w
    where w.id = p_warranty_id
      and (w.owner = (select auth.uid()) or (w.job_id is not null and private.can_edit_job(w.job_id)))
  );
$$;

-- Turns a folder name into an id, or null if it isn't one (so odd paths are simply refused).
create or replace function private.to_uuid(p_text text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end;
$$;

grant execute on all functions in schema private to authenticated;

-- =====================================================================
-- 4. Sharing a job by email
-- Called from the app as supabase.rpc('share_job', {...}). Only the job's owner can share,
-- and the other person must already have a homi account.
-- =====================================================================

create or replace function public.share_job(p_job_id uuid, p_email text, p_role text default 'editor')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if not private.is_job_owner(p_job_id) then
    raise exception 'Only the owner of this job can share it.';
  end if;
  if p_role not in ('viewer', 'editor') then
    raise exception 'Role must be viewer or editor.';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then
    raise exception 'No homi account uses that email. Ask them to sign up first.';
  end if;
  if v_user_id = (select auth.uid()) then
    raise exception 'You already own this job.';
  end if;

  insert into public.job_members (job_id, user_id, role)
  values (p_job_id, v_user_id, p_role)
  on conflict (job_id, user_id) do update set role = excluded.role;
end;
$$;

revoke execute on function public.share_job(uuid, text, text) from public, anon;
grant execute on function public.share_job(uuid, text, text) to authenticated;

-- =====================================================================
-- 5. Row level security: turned on for every table
-- Nobody who is signed out can read or change anything.
-- =====================================================================

-- Signed-in people may use these tables at all; the policies below decide which rows.
-- (New Supabase projects don't grant this automatically.) Signed-out visitors get nothing.
grant select, insert, update, delete on
  public.profiles, public.jobs, public.job_members, public.quotes, public.job_files,
  public.proof_log_entries, public.warranties, public.muse_conversations, public.muse_messages
  to authenticated;
revoke all on
  public.profiles, public.jobs, public.job_members, public.quotes, public.job_files,
  public.proof_log_entries, public.warranties, public.muse_conversations, public.muse_messages
  from anon;

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_members enable row level security;
alter table public.quotes enable row level security;
alter table public.job_files enable row level security;
alter table public.proof_log_entries enable row level security;
alter table public.warranties enable row level security;
alter table public.muse_conversations enable row level security;
alter table public.muse_messages enable row level security;

-- profiles: you can see your own profile and the profiles of people you share a job with.
-- You can only change your own.
drop policy if exists "profiles: read" on public.profiles;
create policy "profiles: read" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_a_job_with(id));

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- jobs: owner and people it's shared with can see it; owner and editors can change it;
-- only the owner can create it as theirs or delete it.
drop policy if exists "jobs: read" on public.jobs;
create policy "jobs: read" on public.jobs
  for select to authenticated
  using (owner = (select auth.uid()) or private.can_view_job(id));

drop policy if exists "jobs: add own" on public.jobs;
create policy "jobs: add own" on public.jobs
  for insert to authenticated with check (owner = (select auth.uid()));

drop policy if exists "jobs: edit" on public.jobs;
create policy "jobs: edit" on public.jobs
  for update to authenticated
  using (owner = (select auth.uid()) or private.can_edit_job(id))
  with check (owner = (select auth.uid()) or private.can_edit_job(id));

drop policy if exists "jobs: delete own" on public.jobs;
create policy "jobs: delete own" on public.jobs
  for delete to authenticated using (owner = (select auth.uid()));

-- Editors may change a job's title and status, but nobody can hand a job to someone else.
revoke update on public.jobs from authenticated, anon;
grant update (title, status) on public.jobs to authenticated;

-- job_members: everyone on a job can see who else is on it. Only the owner adds people
-- (through share_job) or changes their role. The owner can remove anyone; members can remove themselves.
drop policy if exists "job_members: read" on public.job_members;
create policy "job_members: read" on public.job_members
  for select to authenticated using (private.can_view_job(job_id));

drop policy if exists "job_members: owner changes role" on public.job_members;
create policy "job_members: owner changes role" on public.job_members
  for update to authenticated
  using (private.is_job_owner(job_id)) with check (private.is_job_owner(job_id));

drop policy if exists "job_members: owner removes or member leaves" on public.job_members;
create policy "job_members: owner removes or member leaves" on public.job_members
  for delete to authenticated
  using (private.is_job_owner(job_id) or user_id = (select auth.uid()));

revoke update on public.job_members from authenticated, anon;
grant update (role) on public.job_members to authenticated;

-- quotes, job_files, proof_log_entries: anyone on the job can see them; the owner and editors
-- can add, change and delete them. Viewers can only look.
drop policy if exists "quotes: read" on public.quotes;
create policy "quotes: read" on public.quotes
  for select to authenticated using (private.can_view_job(job_id));
drop policy if exists "quotes: add" on public.quotes;
create policy "quotes: add" on public.quotes
  for insert to authenticated
  with check (private.can_edit_job(job_id) and created_by = (select auth.uid()));
drop policy if exists "quotes: edit" on public.quotes;
create policy "quotes: edit" on public.quotes
  for update to authenticated
  using (private.can_edit_job(job_id)) with check (private.can_edit_job(job_id));
drop policy if exists "quotes: delete" on public.quotes;
create policy "quotes: delete" on public.quotes
  for delete to authenticated using (private.can_edit_job(job_id));

drop policy if exists "job_files: read" on public.job_files;
create policy "job_files: read" on public.job_files
  for select to authenticated using (private.can_view_job(job_id));
drop policy if exists "job_files: add" on public.job_files;
create policy "job_files: add" on public.job_files
  for insert to authenticated
  with check (private.can_edit_job(job_id) and created_by = (select auth.uid()));
drop policy if exists "job_files: edit" on public.job_files;
create policy "job_files: edit" on public.job_files
  for update to authenticated
  using (private.can_edit_job(job_id)) with check (private.can_edit_job(job_id));
drop policy if exists "job_files: delete" on public.job_files;
create policy "job_files: delete" on public.job_files
  for delete to authenticated using (private.can_edit_job(job_id));

drop policy if exists "proof_log_entries: read" on public.proof_log_entries;
create policy "proof_log_entries: read" on public.proof_log_entries
  for select to authenticated using (private.can_view_job(job_id));
drop policy if exists "proof_log_entries: add" on public.proof_log_entries;
create policy "proof_log_entries: add" on public.proof_log_entries
  for insert to authenticated
  with check (private.can_edit_job(job_id) and created_by = (select auth.uid()));
drop policy if exists "proof_log_entries: edit" on public.proof_log_entries;
create policy "proof_log_entries: edit" on public.proof_log_entries
  for update to authenticated
  using (private.can_edit_job(job_id)) with check (private.can_edit_job(job_id));
drop policy if exists "proof_log_entries: delete" on public.proof_log_entries;
create policy "proof_log_entries: delete" on public.proof_log_entries
  for delete to authenticated using (private.can_edit_job(job_id));

-- warranties: the person who added it, plus everyone on its job, can see it. The person who
-- added it and the job's editors can change it. Only the person who added it or the job's
-- owner can delete it.
drop policy if exists "warranties: read" on public.warranties;
create policy "warranties: read" on public.warranties
  for select to authenticated
  using (owner = (select auth.uid()) or (job_id is not null and private.can_view_job(job_id)));

drop policy if exists "warranties: add own" on public.warranties;
create policy "warranties: add own" on public.warranties
  for insert to authenticated
  with check (owner = (select auth.uid()) and (job_id is null or private.can_edit_job(job_id)));

drop policy if exists "warranties: edit" on public.warranties;
create policy "warranties: edit" on public.warranties
  for update to authenticated
  using (owner = (select auth.uid()) or (job_id is not null and private.can_edit_job(job_id)))
  with check (
    (owner = (select auth.uid()) or (job_id is not null and private.can_edit_job(job_id)))
    and (job_id is null or private.can_edit_job(job_id))
  );

drop policy if exists "warranties: delete" on public.warranties;
create policy "warranties: delete" on public.warranties
  for delete to authenticated
  using (owner = (select auth.uid()) or (job_id is not null and private.is_job_owner(job_id)));

-- muse_conversations and muse_messages: only the person who started the conversation can
-- see, add to, rename or delete it. Conversations are never shared.
drop policy if exists "muse_conversations: own" on public.muse_conversations;
create policy "muse_conversations: own" on public.muse_conversations
  for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

drop policy if exists "muse_messages: own" on public.muse_messages;
create policy "muse_messages: own" on public.muse_messages
  for all to authenticated
  using (exists (
    select 1 from public.muse_conversations c
    where c.id = conversation_id and c.owner = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.muse_conversations c
    where c.id = conversation_id and c.owner = (select auth.uid())
  ));

-- =====================================================================
-- 6. File storage: one private bucket for every uploaded file (10 MB limit, PDFs and images)
--   jobs/<job id>/...           quote files, job files and proof log photos
--   warranties/<warranty id>/... warranty documents
-- Who can open or change a file follows the same rules as the job or warranty it belongs to.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homi-files', 'homi-files', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "homi-files: read" on storage.objects;
create policy "homi-files: read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'homi-files' and (
      ((storage.foldername(name))[1] = 'jobs'
        and private.can_view_job(private.to_uuid((storage.foldername(name))[2])))
      or ((storage.foldername(name))[1] = 'warranties'
        and private.can_view_warranty(private.to_uuid((storage.foldername(name))[2])))
    )
  );

drop policy if exists "homi-files: add" on storage.objects;
create policy "homi-files: add" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'homi-files' and (
      ((storage.foldername(name))[1] = 'jobs'
        and private.can_edit_job(private.to_uuid((storage.foldername(name))[2])))
      or ((storage.foldername(name))[1] = 'warranties'
        and private.can_edit_warranty(private.to_uuid((storage.foldername(name))[2])))
    )
  );

drop policy if exists "homi-files: edit" on storage.objects;
create policy "homi-files: edit" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'homi-files' and (
      ((storage.foldername(name))[1] = 'jobs'
        and private.can_edit_job(private.to_uuid((storage.foldername(name))[2])))
      or ((storage.foldername(name))[1] = 'warranties'
        and private.can_edit_warranty(private.to_uuid((storage.foldername(name))[2])))
    )
  );

drop policy if exists "homi-files: delete" on storage.objects;
create policy "homi-files: delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'homi-files' and (
      ((storage.foldername(name))[1] = 'jobs'
        and private.can_edit_job(private.to_uuid((storage.foldername(name))[2])))
      or ((storage.foldername(name))[1] = 'warranties'
        and private.can_edit_warranty(private.to_uuid((storage.foldername(name))[2])))
    )
  );
