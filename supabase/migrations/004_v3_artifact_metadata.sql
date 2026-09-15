-- V3 metadata is additive. Existing rows remain explicitly legacy JSON specs.
alter table public.product_versions
  add column if not exists engine text not null default 'legacy-spec'
    check (engine in ('legacy-spec', 'code-artifact-v3')),
  add column if not exists design_plan jsonb,
  add column if not exists asset_manifest jsonb,
  add column if not exists artifact_manifest jsonb,
  add column if not exists source_hash text,
  add column if not exists build_hash text,
  add column if not exists dependency_lock_hash text;

-- Runtime credentials are deliberately not columns on product_versions. RLS
-- cannot hide individual columns from an authenticated project owner.
create table if not exists public.artifact_runtime_secrets (
  version_id uuid primary key references public.product_versions(id) on delete cascade,
  preview_url text not null,
  preview_token text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);
alter table public.artifact_runtime_secrets enable row level security;

create index if not exists product_versions_engine_idx
  on public.product_versions (project_id, engine, version_number desc);
