-- Keep E2B preview credentials outside product_versions. RLS does not provide
-- column-level secrecy for rows a project owner can otherwise read.
create table if not exists public.artifact_runtime_secrets (
  version_id uuid primary key references public.product_versions(id) on delete cascade,
  preview_url text not null,
  preview_token text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.artifact_runtime_secrets enable row level security;
