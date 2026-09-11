-- FORM operational schema.
-- Additive and rerunnable: does not drop user data or existing application tables.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

alter table projects add column if not exists owner_id uuid;
alter table projects add column if not exists source_url text;
alter table projects add column if not exists target_customer text;
alter table projects add column if not exists status text not null default 'draft';
alter table projects add column if not exists current_analysis_id uuid;
alter table projects add column if not exists current_version_id uuid;
update projects set owner_id = user_id where owner_id is null;
alter table projects alter column owner_id set not null;

create table if not exists source_captures (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in ('url', 'user_pasted')),
  requested_url text not null,
  final_url text,
  title text,
  normalized_text text not null,
  screenshot_path text,
  captured_at timestamptz not null default timezone('utc'::text, now()),
  metadata jsonb not null default '{}'::jsonb
);

alter table analyses
  add column if not exists capture_id uuid references source_captures(id);

create table if not exists product_versions (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  version_number integer not null,
  parent_version_id uuid references product_versions(id),
  spec jsonb not null,
  schema_version integer not null default 1,
  change_summary jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique(project_id, version_number)
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 4000),
  base_version_id uuid references product_versions(id),
  result_version_id uuid references product_versions(id),
  job_id uuid,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  kind text not null check (kind in ('analyze', 'build', 'edit', 'qa', 'export')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  stage text,
  idempotency_key text not null,
  request_payload jsonb not null default '{}'::jsonb,
  base_version_id uuid references product_versions(id),
  result_id uuid,
  error_code text,
  error_message text,
  cancel_requested boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  started_at timestamptz,
  finished_at timestamptz,
  unique(owner_id, idempotency_key)
);

create table if not exists job_steps (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references jobs(id) on delete cascade,
  stage_key text not null,
  status text not null default 'queued',
  attempt integer not null default 1,
  prompt_version text,
  model text,
  usage jsonb,
  duration_ms integer,
  started_at timestamptz,
  finished_at timestamptz,
  error_code text,
  output_ref text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique(job_id, stage_key)
);

create table if not exists qa_reports (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  version_id uuid not null references product_versions(id) on delete cascade,
  checks jsonb not null default '[]'::jsonb,
  ai_findings jsonb not null default '[]'::jsonb,
  screenshot_paths jsonb not null default '[]'::jsonb,
  status text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists exports (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  version_id uuid not null references product_versions(id) on delete cascade,
  storage_path text not null,
  checksum text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique(project_id, version_id)
);

create table if not exists usage_counters (
  scope text not null check (scope in ('user', 'global')),
  subject_key text not null,
  day date not null,
  reserved_calls integer not null default 0,
  completed_calls integer not null default 0,
  primary key(scope, subject_key, day)
);

alter table source_captures enable row level security;
alter table product_versions enable row level security;
alter table messages enable row level security;
alter table jobs enable row level security;
alter table job_steps enable row level security;
alter table qa_reports enable row level security;
alter table exports enable row level security;

drop policy if exists "Owners can access source captures" on source_captures;
create policy "Owners can access source captures" on source_captures for all using (
  exists (select 1 from projects p where p.id = source_captures.project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from projects p where p.id = source_captures.project_id and p.owner_id = auth.uid())
);

drop policy if exists "Owners can access product versions" on product_versions;
create policy "Owners can access product versions" on product_versions for all using (
  exists (select 1 from projects p where p.id = product_versions.project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from projects p where p.id = product_versions.project_id and p.owner_id = auth.uid())
);

drop policy if exists "Owners can access messages" on messages;
create policy "Owners can access messages" on messages for all using (
  exists (select 1 from projects p where p.id = messages.project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from projects p where p.id = messages.project_id and p.owner_id = auth.uid())
);

drop policy if exists "Owners can access jobs" on jobs;
create policy "Owners can access jobs" on jobs for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Owners can access job steps" on job_steps;
create policy "Owners can access job steps" on job_steps for all using (
  exists (select 1 from jobs j where j.id = job_steps.job_id and j.owner_id = auth.uid())
) with check (
  exists (select 1 from jobs j where j.id = job_steps.job_id and j.owner_id = auth.uid())
);

drop policy if exists "Owners can access QA reports" on qa_reports;
create policy "Owners can access QA reports" on qa_reports for all using (
  exists (select 1 from projects p where p.id = qa_reports.project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from projects p where p.id = qa_reports.project_id and p.owner_id = auth.uid())
);

drop policy if exists "Owners can access exports" on exports;
create policy "Owners can access exports" on exports for all using (
  exists (select 1 from projects p where p.id = exports.project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from projects p where p.id = exports.project_id and p.owner_id = auth.uid())
);

create index if not exists idx_projects_owner_updated on projects(owner_id, updated_at desc);
create index if not exists idx_source_captures_project_captured on source_captures(project_id, captured_at desc);
create index if not exists idx_versions_project_created on product_versions(project_id, created_at desc);
create index if not exists idx_messages_project_created on messages(project_id, created_at);
create index if not exists idx_jobs_owner_status on jobs(owner_id, status);
create index if not exists idx_jobs_project_status on jobs(project_id, status);

insert into storage.buckets (id, name, public)
values ('form-assets', 'form-assets', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

drop policy if exists "Owners can access form assets" on storage.objects;
create policy "Owners can access form assets" on storage.objects for all using (
  bucket_id = 'form-assets' and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'form-assets' and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Owners can access exports" on storage.objects;
create policy "Owners can access exports" on storage.objects for all using (
  bucket_id = 'exports' and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'exports' and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function check_ai_quota(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_calls integer;
  global_calls integer;
begin
  select coalesce(sum(reserved_calls), 0) into user_calls
  from usage_counters where scope = 'user' and subject_key = p_user_id::text and day = current_date;
  select coalesce(sum(reserved_calls), 0) into global_calls
  from usage_counters where scope = 'global' and subject_key = 'global' and day = current_date;
  return jsonb_build_object('allowed', user_calls < 30 and global_calls < 300, 'userCalls', user_calls, 'globalCalls', global_calls);
end;
$$;

revoke all on function check_ai_quota(uuid) from public;
grant execute on function check_ai_quota(uuid) to authenticated;
