-- Publish a V3 version and its private runtime credential as one transaction.
alter table public.product_versions
  add column if not exists design_plan_id uuid,
  add column if not exists asset_manifest_id uuid;

alter table public.artifact_runtime_secrets
  add column if not exists sandbox_id text,
  add column if not exists expires_at timestamptz;

create or replace function public.publish_v3_artifact(
  p_project_id uuid,
  p_owner_id uuid,
  p_spec jsonb,
  p_design_plan jsonb,
  p_asset_manifest jsonb,
  p_artifact_manifest jsonb,
  p_design_plan_id uuid,
  p_asset_manifest_id uuid,
  p_source_hash text,
  p_build_hash text,
  p_dependency_lock_hash text,
  p_preview_url text,
  p_preview_token text,
  p_sandbox_id text
)
returns table(id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version_id uuid;
  v_version_number integer;
begin
  if not exists (select 1 from projects where projects.id = p_project_id and projects.owner_id = p_owner_id) then
    raise exception 'Project owner mismatch';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_project_id::text, 0));

  select pv.id into v_version_id
  from product_versions pv
  where pv.project_id = p_project_id
    and pv.engine = 'code-artifact-v3'
    and pv.artifact_manifest->>'id' = p_artifact_manifest->>'id'
  limit 1;

  if v_version_id is null then
    select coalesce(max(version_number), 0) + 1 into v_version_number
    from product_versions where project_id = p_project_id;
    insert into product_versions (
      project_id, version_number, spec, schema_version, engine, design_plan,
      asset_manifest, artifact_manifest, design_plan_id, asset_manifest_id,
      source_hash, build_hash, dependency_lock_hash, change_summary, created_by
    ) values (
      p_project_id, v_version_number, p_spec, 3, 'code-artifact-v3', p_design_plan,
      p_asset_manifest, p_artifact_manifest, p_design_plan_id, p_asset_manifest_id,
      p_source_hash, p_build_hash, p_dependency_lock_hash, '["Initial V3 code artifact"]'::jsonb, p_owner_id
    ) returning product_versions.id into v_version_id;
  end if;

  insert into artifact_runtime_secrets (version_id, preview_url, preview_token, sandbox_id, expires_at)
  values (v_version_id, p_preview_url, p_preview_token, p_sandbox_id, timezone('utc', now()) + interval '30 minutes')
  on conflict (version_id) do update set
    preview_url = excluded.preview_url,
    preview_token = excluded.preview_token,
    sandbox_id = excluded.sandbox_id,
    expires_at = excluded.expires_at;

  update projects set current_version_id = v_version_id, status = 'built' where projects.id = p_project_id;
  return query select v_version_id;
end;
$$;

revoke all on function public.publish_v3_artifact(uuid, uuid, jsonb, jsonb, jsonb, jsonb, uuid, uuid, text, text, text, text, text, text) from public;
grant execute on function public.publish_v3_artifact(uuid, uuid, jsonb, jsonb, jsonb, jsonb, uuid, uuid, text, text, text, text, text, text) to service_role;
