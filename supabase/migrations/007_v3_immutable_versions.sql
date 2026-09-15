-- V3 candidates are published artifacts. Owners may read them, but may not
-- mutate their source/build identity after publication. Legacy restore still
-- needs insert access and legacy rows remain removable by the owner.
drop policy if exists "Owners can access product versions" on public.product_versions;

create policy "Owners can read product versions"
  on public.product_versions for select
  using (exists (
    select 1 from public.projects p
    where p.id = product_versions.project_id and p.owner_id = auth.uid()
  ));

create policy "Owners can insert legacy product versions"
  on public.product_versions for insert
  with check (
    engine = 'legacy-spec' and exists (
      select 1 from public.projects p
      where p.id = product_versions.project_id and p.owner_id = auth.uid()
    )
  );

create policy "Owners can delete legacy product versions"
  on public.product_versions for delete
  using (
    engine = 'legacy-spec' and exists (
      select 1 from public.projects p
      where p.id = product_versions.project_id and p.owner_id = auth.uid()
    )
  );
