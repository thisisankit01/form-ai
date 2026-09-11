-- ============================================================================
-- FORM database schema — idempotent migration
-- Safe to run in the Supabase SQL Editor as a single block, any number of times.
-- Uses: CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS, CREATE INDEX IF NOT EXISTS
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Projects table (workspace/projects)
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Analyses table (capture and analysis results)
create table if not exists analyses (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects on delete cascade not null,
  source_url text not null,
  source_text text, -- normalized captured text
  screenshot_url text, -- stored in Supabase bucket
  schema_version integer default 1,
  summary_claim text not null,
  summary_status text not null check (summary_status in ('observed', 'inferred', 'unknown')),
  core_problem_text text not null,
  core_problem_status text not null check (core_problem_status in ('observed', 'inferred', 'unknown')),
  business_model_text text not null,
  business_model_status text not null check (business_model_status in ('observed', 'inferred', 'unknown')),
  ui_direction text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Analysis target users (1..6 claims)
create table if not exists analysis_target_users (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid references analyses on delete cascade not null,
  claim_text text not null,
  claim_status text not null check (claim_status in ('observed', 'inferred', 'unknown')),
  ord integer not null
);

-- Analysis key features (1..10 claims)
create table if not exists analysis_key_features (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid references analyses on delete cascade not null,
  claim_text text not null,
  claim_status text not null check (claim_status in ('observed', 'inferred', 'unknown')),
  ord integer not null
);

-- Analysis improvements
create table if not exists analysis_improvements (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid references analyses on delete cascade not null,
  title text not null,
  rationale text not null,
  priority text not null check (priority in ('high', 'medium', 'low')),
  ord integer not null
);

-- Analysis MVP features
create table if not exists analysis_mvp_features (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid references analyses on delete cascade not null,
  title text not null,
  user_value text not null,
  priority text not null check (priority in ('must', 'should')),
  ord integer not null
);

-- Analysis evidence
create table if not exists analysis_evidence (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid references analyses on delete cascade not null,
  source_url text not null,
  excerpt text not null check (char_length(excerpt) <= 500)
);

-- Analysis visual (nullable)
create table if not exists analysis_visual (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid references analyses on delete cascade not null,
  layout text not null,
  palette text not null, -- JSON array as text
  hierarchy text not null,
  density text not null check (density in ('low', 'medium', 'high')),
  useful_patterns text not null, -- JSON array as text
  issues text not null -- JSON array as text
);

-- Product specifications
create table if not exists product_specs (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid references analyses on delete cascade not null,
  name text not null check (char_length(name) between 2 and 60),
  description text not null check (char_length(description) between 20 and 500),
  audience text not null check (char_length(audience) between 3 and 240),
  positioning text not null check (char_length(positioning) <= 500),
  schema_version integer default 1,
  ui_direction text not null check (char_length(ui_direction) <= 800),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Product spec features
create table if not exists product_spec_features (
  id uuid primary key default uuid_generate_v4(),
  product_spec_id uuid references product_specs on delete cascade not null,
  title text not null,
  description text not null,
  priority text not null check (priority in ('must', 'should')),
  ord integer not null
);

-- Product spec theme
create table if not exists product_spec_themes (
  id uuid primary key default uuid_generate_v4(),
  product_spec_id uuid references product_specs on delete cascade not null,
  preset text not null check (preset in ('editorial-light', 'precision-dark', 'warm-service')),
  accent text not null check (accent in ('lime', 'cobalt', 'terracotta')),
  density text not null check (density in ('comfortable', 'compact')),
  radius text not null check (radius in ('sharp', 'soft'))
);

-- Product spec navigation
create table if not exists product_spec_navigation (
  id uuid primary key default uuid_generate_v4(),
  product_spec_id uuid references product_specs on delete cascade not null,
  label text not null,
  page_id uuid not null, -- references product_spec_pages
  ord integer not null
);

-- Product spec pages
create table if not exists product_spec_pages (
  id uuid primary key default uuid_generate_v4(),
  product_spec_id uuid references product_specs on delete cascade not null,
  slug text not null,
  title text not null,
  kind text not null check (kind in ('landing', 'dashboard', 'pricing', 'about')),
  ord integer not null,
  unique(product_spec_id, slug)
);

-- Sections (within pages)
create table if not exists sections (
  id uuid primary key default uuid_generate_v4(),
  product_spec_page_id uuid references product_spec_pages on delete cascade not null,
  type text not null check (type in (
    'hero', 'feature-list', 'steps', 'pricing', 'faq', 'cta',
    'metric-row', 'data-table', 'activity-list', 'rich-text'
  )),
  ord integer not null
);

-- Hero section
create table if not exists section_heroes (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references sections on delete cascade not null,
  eyebrow text check (char_length(eyebrow) <= 60),
  headline text not null check (char_length(headline) <= 100),
  body text not null check (char_length(body) <= 320),
  composition text not null check (composition in ('split', 'centered')),
  primary_action_kind text not null check (primary_action_kind in ('navigate', 'scroll', 'demo-dialog')),
  primary_action_label text not null,
  primary_action_page_id uuid, -- references product_spec_pages
  primary_action_section_id uuid, -- references sections
  primary_action_dialog_title text,
  primary_action_dialog_body text,
  secondary_action_kind text check (secondary_action_kind in ('navigate', 'scroll', 'demo-dialog')),
  secondary_action_label text,
  secondary_action_page_id uuid, -- references product_spec_pages
  secondary_action_section_id uuid, -- references sections
  secondary_action_dialog_title text,
  secondary_action_dialog_body text
);

-- Feature list section
create table if not exists section_feature_list_items (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references sections on delete cascade not null,
  title text not null check (char_length(title) <= 70),
  body text not null check (char_length(body) <= 220),
  ord integer not null
);

-- Steps section
create table if not exists section_steps_items (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references sections on delete cascade not null,
  title text not null,
  body text not null,
  ord integer not null
);

-- Pricing section
create table if not exists section_pricing_plans (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references sections on delete cascade not null,
  name text not null,
  price_label text not null,
  description text not null,
  ord integer not null
);

create table if not exists section_pricing_plan_features (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid references section_pricing_plans on delete cascade not null,
  feature text not null,
  ord integer not null
);

create table if not exists section_pricing_plan_actions (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid references section_pricing_plans on delete cascade not null,
  action_kind text not null check (action_kind in ('navigate', 'scroll', 'demo-dialog')),
  action_label text not null,
  action_page_id uuid, -- references product_spec_pages
  action_section_id uuid, -- references sections
  action_dialog_title text,
  action_dialog_body text
);

-- FAQ section
create table if not exists section_faq_items (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references sections on delete cascade not null,
  question text not null,
  answer text not null,
  ord integer not null
);

-- CTA section
create table if not exists section_ctas (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references sections on delete cascade not null,
  heading text not null check (char_length(heading) <= 100),
  body text not null check (char_length(body) <= 220),
  action_kind text not null check (action_kind in ('navigate', 'scroll', 'demo-dialog')),
  action_label text not null,
  action_page_id uuid, -- references product_spec_pages
  action_section_id uuid, -- references sections
  action_dialog_title text,
  action_dialog_body text
);

-- Metric row section
create table if not exists section_metric_row_metrics (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references sections on delete cascade not null,
  label text not null,
  value text not null,
  delta text,
  ord integer not null
);

-- Data table section
create table if not exists section_data_table_columns (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references sections on delete cascade not null,
  key text not null,
  label text not null,
  ord integer not null
);

create table if not exists section_data_table_rows (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references sections on delete cascade not null,
  ord integer not null
);

create table if not exists section_data_table_cells (
  id uuid primary key default uuid_generate_v4(),
  row_id uuid references section_data_table_rows on delete cascade not null,
  column_id uuid references section_data_table_columns on delete cascade not null,
  value text not null check (char_length(value) <= 160),
  unique(row_id, column_id)
);

-- Activity list section
create table if not exists section_activity_list_items (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references sections on delete cascade not null,
  title text not null,
  detail text not null,
  time_label text not null,
  ord integer not null
);

-- Rich text section
create table if not exists section_rich_text_paragraphs (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references sections on delete cascade not null,
  paragraph text not null check (char_length(paragraph) <= 500),
  ord integer not null
);

-- ============================================================================
-- ROW LEVEL SECURITY (idempotent — enabling is safe to repeat)
-- ============================================================================

alter table projects enable row level security;
alter table analyses enable row level security;
alter table analysis_target_users enable row level security;
alter table analysis_key_features enable row level security;
alter table analysis_improvements enable row level security;
alter table analysis_mvp_features enable row level security;
alter table analysis_evidence enable row level security;
alter table analysis_visual enable row level security;
alter table product_specs enable row level security;
alter table product_spec_features enable row level security;
alter table product_spec_themes enable row level security;
alter table product_spec_navigation enable row level security;
alter table product_spec_pages enable row level security;
alter table sections enable row level security;
alter table section_heroes enable row level security;
alter table section_feature_list_items enable row level security;
alter table section_steps_items enable row level security;
alter table section_pricing_plans enable row level security;
alter table section_pricing_plan_features enable row level security;
alter table section_pricing_plan_actions enable row level security;
alter table section_faq_items enable row level security;
alter table section_ctas enable row level security;
alter table section_metric_row_metrics enable row level security;
alter table section_data_table_columns enable row level security;
alter table section_data_table_rows enable row level security;
alter table section_data_table_cells enable row level security;
alter table section_activity_list_items enable row level security;
alter table section_rich_text_paragraphs enable row level security;

-- ============================================================================
-- POLICIES — projects
-- ============================================================================

drop policy if exists "Users can view their own projects" on projects;
create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own projects" on projects;
create policy "Users can insert their own projects"
  on projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own projects" on projects;
create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own projects" on projects;
create policy "Users can delete their own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- POLICIES — analyses (linked to projects)
-- ============================================================================

drop policy if exists "Users can view analyses of their projects" on analyses;
create policy "Users can view analyses of their projects"
  on analyses for select
  using (
    exists (
      select 1 from projects
      where projects.id = analyses.project_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert analyses for their projects" on analyses;
create policy "Users can insert analyses for their projects"
  on analyses for insert
  with check (
    exists (
      select 1 from projects
      where projects.id = analyses.project_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update analyses of their projects" on analyses;
create policy "Users can update analyses of their projects"
  on analyses for update
  using (
    exists (
      select 1 from projects
      where projects.id = analyses.project_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete analyses of their projects" on analyses;
create policy "Users can delete analyses of their projects"
  on analyses for delete
  using (
    exists (
      select 1 from projects
      where projects.id = analyses.project_id
      and projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES — analysis-related tables
-- ============================================================================

drop policy if exists "Users can view analysis_target_users of their analyses" on analysis_target_users;
create policy "Users can view analysis_target_users of their analyses"
  on analysis_target_users for select
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_target_users.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert analysis_target_users for their analyses" on analysis_target_users;
create policy "Users can insert analysis_target_users for their analyses"
  on analysis_target_users for insert
  with check (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_target_users.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update analysis_target_users of their analyses" on analysis_target_users;
create policy "Users can update analysis_target_users of their analyses"
  on analysis_target_users for update
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_target_users.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete analysis_target_users of their analyses" on analysis_target_users;
create policy "Users can delete analysis_target_users of their analyses"
  on analysis_target_users for delete
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_target_users.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view analysis_key_features of their analyses" on analysis_key_features;
create policy "Users can view analysis_key_features of their analyses"
  on analysis_key_features for select
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_key_features.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert analysis_key_features for their analyses" on analysis_key_features;
create policy "Users can insert analysis_key_features for their analyses"
  on analysis_key_features for insert
  with check (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_key_features.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update analysis_key_features of their analyses" on analysis_key_features;
create policy "Users can update analysis_key_features of their analyses"
  on analysis_key_features for update
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_key_features.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete analysis_key_features of their analyses" on analysis_key_features;
create policy "Users can delete analysis_key_features of their analyses"
  on analysis_key_features for delete
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_key_features.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view analysis_improvements of their analyses" on analysis_improvements;
create policy "Users can view analysis_improvements of their analyses"
  on analysis_improvements for select
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_improvements.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert analysis_improvements for their analyses" on analysis_improvements;
create policy "Users can insert analysis_improvements for their analyses"
  on analysis_improvements for insert
  with check (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_improvements.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update analysis_improvements of their analyses" on analysis_improvements;
create policy "Users can update analysis_improvements of their analyses"
  on analysis_improvements for update
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_improvements.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete analysis_improvements of their analyses" on analysis_improvements;
create policy "Users can delete analysis_improvements of their analyses"
  on analysis_improvements for delete
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_improvements.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view analysis_mvp_features of their analyses" on analysis_mvp_features;
create policy "Users can view analysis_mvp_features of their analyses"
  on analysis_mvp_features for select
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_mvp_features.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert analysis_mvp_features for their analyses" on analysis_mvp_features;
create policy "Users can insert analysis_mvp_features for their analyses"
  on analysis_mvp_features for insert
  with check (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_mvp_features.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update analysis_mvp_features of their analyses" on analysis_mvp_features;
create policy "Users can update analysis_mvp_features of their analyses"
  on analysis_mvp_features for update
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_mvp_features.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete analysis_mvp_features of their analyses" on analysis_mvp_features;
create policy "Users can delete analysis_mvp_features of their analyses"
  on analysis_mvp_features for delete
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_mvp_features.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view analysis_evidence of their analyses" on analysis_evidence;
create policy "Users can view analysis_evidence of their analyses"
  on analysis_evidence for select
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_evidence.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert analysis_evidence for their analyses" on analysis_evidence;
create policy "Users can insert analysis_evidence for their analyses"
  on analysis_evidence for insert
  with check (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_evidence.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update analysis_evidence of their analyses" on analysis_evidence;
create policy "Users can update analysis_evidence of their analyses"
  on analysis_evidence for update
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_evidence.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete analysis_evidence of their analyses" on analysis_evidence;
create policy "Users can delete analysis_evidence of their analyses"
  on analysis_evidence for delete
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_evidence.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view analysis_visual of their analyses" on analysis_visual;
create policy "Users can view analysis_visual of their analyses"
  on analysis_visual for select
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_visual.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert analysis_visual for their analyses" on analysis_visual;
create policy "Users can insert analysis_visual for their analyses"
  on analysis_visual for insert
  with check (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_visual.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update analysis_visual of their analyses" on analysis_visual;
create policy "Users can update analysis_visual of their analyses"
  on analysis_visual for update
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_visual.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete analysis_visual of their analyses" on analysis_visual;
create policy "Users can delete analysis_visual of their analyses"
  on analysis_visual for delete
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = analysis_visual.analysis_id
      and projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES — product_specs (linked to analyses/projects)
-- ============================================================================

drop policy if exists "Users can view product specs of their analyses" on product_specs;
create policy "Users can view product specs of their analyses"
  on product_specs for select
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = product_specs.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert product specs for their analyses" on product_specs;
create policy "Users can insert product specs for their analyses"
  on product_specs for insert
  with check (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = product_specs.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update product specs of their analyses" on product_specs;
create policy "Users can update product specs of their analyses"
  on product_specs for update
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = product_specs.analysis_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete product specs of their analyses" on product_specs;
create policy "Users can delete product specs of their analyses"
  on product_specs for delete
  using (
    exists (
      select 1 from analyses
      join projects on analyses.project_id = projects.id
      where analyses.id = product_specs.analysis_id
      and projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES — product_spec-related tables
-- ============================================================================

drop policy if exists "Users can view product_spec_features of their product specs" on product_spec_features;
create policy "Users can view product_spec_features of their product specs"
  on product_spec_features for select
  using (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_features.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert product_spec_features for their product specs" on product_spec_features;
create policy "Users can insert product_spec_features for their product specs"
  on product_spec_features for insert
  with check (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_features.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update product_spec_features of their product specs" on product_spec_features;
create policy "Users can update product_spec_features of their product specs"
  on product_spec_features for update
  using (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_features.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete product_spec_features of their product specs" on product_spec_features;
create policy "Users can delete product_spec_features of their product specs"
  on product_spec_features for delete
  using (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_features.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view product_spec_themes of their product specs" on product_spec_themes;
create policy "Users can view product_spec_themes of their product specs"
  on product_spec_themes for select
  using (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_themes.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert product_spec_themes for their product specs" on product_spec_themes;
create policy "Users can insert product_spec_themes for their product specs"
  on product_spec_themes for insert
  with check (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_themes.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update product_spec_themes of their product specs" on product_spec_themes;
create policy "Users can update product_spec_themes of their product specs"
  on product_spec_themes for update
  using (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_themes.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete product_spec_themes of their product specs" on product_spec_themes;
create policy "Users can delete product_spec_themes of their product specs"
  on product_spec_themes for delete
  using (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_themes.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view product_spec_navigation of their product specs" on product_spec_navigation;
create policy "Users can view product_spec_navigation of their product specs"
  on product_spec_navigation for select
  using (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_navigation.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert product_spec_navigation for their product specs" on product_spec_navigation;
create policy "Users can insert product_spec_navigation for their product specs"
  on product_spec_navigation for insert
  with check (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_navigation.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update product_spec_navigation of their product specs" on product_spec_navigation;
create policy "Users can update product_spec_navigation of their product specs"
  on product_spec_navigation for update
  using (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_navigation.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete product_spec_navigation of their product specs" on product_spec_navigation;
create policy "Users can delete product_spec_navigation of their product specs"
  on product_spec_navigation for delete
  using (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_navigation.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view product_spec_pages of their product specs" on product_spec_pages;
create policy "Users can view product_spec_pages of their product specs"
  on product_spec_pages for select
  using (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_pages.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert product_spec_pages for their product specs" on product_spec_pages;
create policy "Users can insert product_spec_pages for their product specs"
  on product_spec_pages for insert
  with check (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_pages.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update product_spec_pages of their product specs" on product_spec_pages;
create policy "Users can update product_spec_pages of their product specs"
  on product_spec_pages for update
  using (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_pages.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete product_spec_pages of their product specs" on product_spec_pages;
create policy "Users can delete product_spec_pages of their product specs"
  on product_spec_pages for delete
  using (
    exists (
      select 1 from product_specs
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_specs.id = product_spec_pages.product_spec_id
      and projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES — sections
-- ============================================================================

drop policy if exists "Users can view sections of their sections" on sections;
create policy "Users can view sections of their sections"
  on sections for select
  using (
    exists (
      select 1 from product_spec_pages
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_spec_pages.id = sections.product_spec_page_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert sections for their sections" on sections;
create policy "Users can insert sections for their sections"
  on sections for insert
  with check (
    exists (
      select 1 from product_spec_pages
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_spec_pages.id = sections.product_spec_page_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update sections of their sections" on sections;
create policy "Users can update sections of their sections"
  on sections for update
  using (
    exists (
      select 1 from product_spec_pages
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_spec_pages.id = sections.product_spec_page_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete sections of their sections" on sections;
create policy "Users can delete sections of their sections"
  on sections for delete
  using (
    exists (
      select 1 from product_spec_pages
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where product_spec_pages.id = sections.product_spec_page_id
      and projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES — section child tables (join sections via section_id)
-- ============================================================================

drop policy if exists "Users can view section_heroes of their sections" on section_heroes;
create policy "Users can view section_heroes of their sections"
  on section_heroes for select
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_heroes.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_heroes for their sections" on section_heroes;
create policy "Users can insert section_heroes for their sections"
  on section_heroes for insert
  with check (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_heroes.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_heroes of their sections" on section_heroes;
create policy "Users can update section_heroes of their sections"
  on section_heroes for update
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_heroes.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_heroes of their sections" on section_heroes;
create policy "Users can delete section_heroes of their sections"
  on section_heroes for delete
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_heroes.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view section_feature_list_items of their sections" on section_feature_list_items;
create policy "Users can view section_feature_list_items of their sections"
  on section_feature_list_items for select
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_feature_list_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_feature_list_items for their sections" on section_feature_list_items;
create policy "Users can insert section_feature_list_items for their sections"
  on section_feature_list_items for insert
  with check (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_feature_list_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_feature_list_items of their sections" on section_feature_list_items;
create policy "Users can update section_feature_list_items of their sections"
  on section_feature_list_items for update
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_feature_list_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_feature_list_items of their sections" on section_feature_list_items;
create policy "Users can delete section_feature_list_items of their sections"
  on section_feature_list_items for delete
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_feature_list_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view section_steps_items of their sections" on section_steps_items;
create policy "Users can view section_steps_items of their sections"
  on section_steps_items for select
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_steps_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_steps_items for their sections" on section_steps_items;
create policy "Users can insert section_steps_items for their sections"
  on section_steps_items for insert
  with check (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_steps_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_steps_items of their sections" on section_steps_items;
create policy "Users can update section_steps_items of their sections"
  on section_steps_items for update
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_steps_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_steps_items of their sections" on section_steps_items;
create policy "Users can delete section_steps_items of their sections"
  on section_steps_items for delete
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_steps_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view section_pricing_plans of their sections" on section_pricing_plans;
create policy "Users can view section_pricing_plans of their sections"
  on section_pricing_plans for select
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_pricing_plans.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_pricing_plans for their sections" on section_pricing_plans;
create policy "Users can insert section_pricing_plans for their sections"
  on section_pricing_plans for insert
  with check (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_pricing_plans.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_pricing_plans of their sections" on section_pricing_plans;
create policy "Users can update section_pricing_plans of their sections"
  on section_pricing_plans for update
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_pricing_plans.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_pricing_plans of their sections" on section_pricing_plans;
create policy "Users can delete section_pricing_plans of their sections"
  on section_pricing_plans for delete
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_pricing_plans.section_id
      and projects.user_id = auth.uid()
    )
  );

-- section_pricing_plan_features (child of section_pricing_plans)
drop policy if exists "Users can view section_pricing_plan_features of their sections" on section_pricing_plan_features;
create policy "Users can view section_pricing_plan_features of their sections"
  on section_pricing_plan_features for select
  using (
    exists (
      select 1 from section_pricing_plans
      join sections on section_pricing_plans.section_id = sections.id
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where section_pricing_plans.id = section_pricing_plan_features.plan_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_pricing_plan_features for their sections" on section_pricing_plan_features;
create policy "Users can insert section_pricing_plan_features for their sections"
  on section_pricing_plan_features for insert
  with check (
    exists (
      select 1 from section_pricing_plans
      join sections on section_pricing_plans.section_id = sections.id
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where section_pricing_plans.id = section_pricing_plan_features.plan_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_pricing_plan_features of their sections" on section_pricing_plan_features;
create policy "Users can update section_pricing_plan_features of their sections"
  on section_pricing_plan_features for update
  using (
    exists (
      select 1 from section_pricing_plans
      join sections on section_pricing_plans.section_id = sections.id
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where section_pricing_plans.id = section_pricing_plan_features.plan_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_pricing_plan_features of their sections" on section_pricing_plan_features;
create policy "Users can delete section_pricing_plan_features of their sections"
  on section_pricing_plan_features for delete
  using (
    exists (
      select 1 from section_pricing_plans
      join sections on section_pricing_plans.section_id = sections.id
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where section_pricing_plans.id = section_pricing_plan_features.plan_id
      and projects.user_id = auth.uid()
    )
  );

-- section_pricing_plan_actions (child of section_pricing_plans)
drop policy if exists "Users can view section_pricing_plan_actions of their sections" on section_pricing_plan_actions;
create policy "Users can view section_pricing_plan_actions of their sections"
  on section_pricing_plan_actions for select
  using (
    exists (
      select 1 from section_pricing_plans
      join sections on section_pricing_plans.section_id = sections.id
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where section_pricing_plans.id = section_pricing_plan_actions.plan_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_pricing_plan_actions for their sections" on section_pricing_plan_actions;
create policy "Users can insert section_pricing_plan_actions for their sections"
  on section_pricing_plan_actions for insert
  with check (
    exists (
      select 1 from section_pricing_plans
      join sections on section_pricing_plans.section_id = sections.id
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where section_pricing_plans.id = section_pricing_plan_actions.plan_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_pricing_plan_actions of their sections" on section_pricing_plan_actions;
create policy "Users can update section_pricing_plan_actions of their sections"
  on section_pricing_plan_actions for update
  using (
    exists (
      select 1 from section_pricing_plans
      join sections on section_pricing_plans.section_id = sections.id
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where section_pricing_plans.id = section_pricing_plan_actions.plan_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_pricing_plan_actions of their sections" on section_pricing_plan_actions;
create policy "Users can delete section_pricing_plan_actions of their sections"
  on section_pricing_plan_actions for delete
  using (
    exists (
      select 1 from section_pricing_plans
      join sections on section_pricing_plans.section_id = sections.id
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where section_pricing_plans.id = section_pricing_plan_actions.plan_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view section_faq_items of their sections" on section_faq_items;
create policy "Users can view section_faq_items of their sections"
  on section_faq_items for select
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_faq_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_faq_items for their sections" on section_faq_items;
create policy "Users can insert section_faq_items for their sections"
  on section_faq_items for insert
  with check (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_faq_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_faq_items of their sections" on section_faq_items;
create policy "Users can update section_faq_items of their sections"
  on section_faq_items for update
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_faq_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_faq_items of their sections" on section_faq_items;
create policy "Users can delete section_faq_items of their sections"
  on section_faq_items for delete
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_faq_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view section_ctas of their sections" on section_ctas;
create policy "Users can view section_ctas of their sections"
  on section_ctas for select
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_ctas.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_ctas for their sections" on section_ctas;
create policy "Users can insert section_ctas for their sections"
  on section_ctas for insert
  with check (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_ctas.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_ctas of their sections" on section_ctas;
create policy "Users can update section_ctas of their sections"
  on section_ctas for update
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_ctas.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_ctas of their sections" on section_ctas;
create policy "Users can delete section_ctas of their sections"
  on section_ctas for delete
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_ctas.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view section_metric_row_metrics of their sections" on section_metric_row_metrics;
create policy "Users can view section_metric_row_metrics of their sections"
  on section_metric_row_metrics for select
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_metric_row_metrics.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_metric_row_metrics for their sections" on section_metric_row_metrics;
create policy "Users can insert section_metric_row_metrics for their sections"
  on section_metric_row_metrics for insert
  with check (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_metric_row_metrics.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_metric_row_metrics of their sections" on section_metric_row_metrics;
create policy "Users can update section_metric_row_metrics of their sections"
  on section_metric_row_metrics for update
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_metric_row_metrics.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_metric_row_metrics of their sections" on section_metric_row_metrics;
create policy "Users can delete section_metric_row_metrics of their sections"
  on section_metric_row_metrics for delete
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_metric_row_metrics.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view section_data_table_columns of their sections" on section_data_table_columns;
create policy "Users can view section_data_table_columns of their sections"
  on section_data_table_columns for select
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_data_table_columns.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_data_table_columns for their sections" on section_data_table_columns;
create policy "Users can insert section_data_table_columns for their sections"
  on section_data_table_columns for insert
  with check (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_data_table_columns.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_data_table_columns of their sections" on section_data_table_columns;
create policy "Users can update section_data_table_columns of their sections"
  on section_data_table_columns for update
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_data_table_columns.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_data_table_columns of their sections" on section_data_table_columns;
create policy "Users can delete section_data_table_columns of their sections"
  on section_data_table_columns for delete
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_data_table_columns.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view section_data_table_rows of their sections" on section_data_table_rows;
create policy "Users can view section_data_table_rows of their sections"
  on section_data_table_rows for select
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_data_table_rows.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_data_table_rows for their sections" on section_data_table_rows;
create policy "Users can insert section_data_table_rows for their sections"
  on section_data_table_rows for insert
  with check (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_data_table_rows.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_data_table_rows of their sections" on section_data_table_rows;
create policy "Users can update section_data_table_rows of their sections"
  on section_data_table_rows for update
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_data_table_rows.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_data_table_rows of their sections" on section_data_table_rows;
create policy "Users can delete section_data_table_rows of their sections"
  on section_data_table_rows for delete
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_data_table_rows.section_id
      and projects.user_id = auth.uid()
    )
  );

-- section_data_table_cells (child of section_data_table_rows)
drop policy if exists "Users can view section_data_table_cells of their sections" on section_data_table_cells;
create policy "Users can view section_data_table_cells of their sections"
  on section_data_table_cells for select
  using (
    exists (
      select 1 from section_data_table_rows
      join sections on section_data_table_rows.section_id = sections.id
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where section_data_table_rows.id = section_data_table_cells.row_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_data_table_cells for their sections" on section_data_table_cells;
create policy "Users can insert section_data_table_cells for their sections"
  on section_data_table_cells for insert
  with check (
    exists (
      select 1 from section_data_table_rows
      join sections on section_data_table_rows.section_id = sections.id
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where section_data_table_rows.id = section_data_table_cells.row_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_data_table_cells of their sections" on section_data_table_cells;
create policy "Users can update section_data_table_cells of their sections"
  on section_data_table_cells for update
  using (
    exists (
      select 1 from section_data_table_rows
      join sections on section_data_table_rows.section_id = sections.id
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where section_data_table_rows.id = section_data_table_cells.row_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_data_table_cells of their sections" on section_data_table_cells;
create policy "Users can delete section_data_table_cells of their sections"
  on section_data_table_cells for delete
  using (
    exists (
      select 1 from section_data_table_rows
      join sections on section_data_table_rows.section_id = sections.id
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where section_data_table_rows.id = section_data_table_cells.row_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view section_activity_list_items of their sections" on section_activity_list_items;
create policy "Users can view section_activity_list_items of their sections"
  on section_activity_list_items for select
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_activity_list_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_activity_list_items for their sections" on section_activity_list_items;
create policy "Users can insert section_activity_list_items for their sections"
  on section_activity_list_items for insert
  with check (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_activity_list_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_activity_list_items of their sections" on section_activity_list_items;
create policy "Users can update section_activity_list_items of their sections"
  on section_activity_list_items for update
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_activity_list_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_activity_list_items of their sections" on section_activity_list_items;
create policy "Users can delete section_activity_list_items of their sections"
  on section_activity_list_items for delete
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_activity_list_items.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view section_rich_text_paragraphs of their sections" on section_rich_text_paragraphs;
create policy "Users can view section_rich_text_paragraphs of their sections"
  on section_rich_text_paragraphs for select
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_rich_text_paragraphs.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert section_rich_text_paragraphs for their sections" on section_rich_text_paragraphs;
create policy "Users can insert section_rich_text_paragraphs for their sections"
  on section_rich_text_paragraphs for insert
  with check (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_rich_text_paragraphs.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update section_rich_text_paragraphs of their sections" on section_rich_text_paragraphs;
create policy "Users can update section_rich_text_paragraphs of their sections"
  on section_rich_text_paragraphs for update
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_rich_text_paragraphs.section_id
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete section_rich_text_paragraphs of their sections" on section_rich_text_paragraphs;
create policy "Users can delete section_rich_text_paragraphs of their sections"
  on section_rich_text_paragraphs for delete
  using (
    exists (
      select 1 from sections
      join product_spec_pages on sections.product_spec_page_id = product_spec_pages.id
      join product_specs on product_spec_pages.product_spec_id = product_specs.id
      join analyses on product_specs.analysis_id = analyses.id
      join projects on analyses.project_id = projects.id
      where sections.id = section_rich_text_paragraphs.section_id
      and projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- INDEXES (idempotent)
-- ============================================================================

create index if not exists idx_analyses_project_id on analyses(project_id);
create index if not exists idx_analysis_target_users_analysis_id on analysis_target_users(analysis_id);
create index if not exists idx_analysis_key_features_analysis_id on analysis_key_features(analysis_id);
create index if not exists idx_analysis_improvements_analysis_id on analysis_improvements(analysis_id);
create index if not exists idx_analysis_mvp_features_analysis_id on analysis_mvp_features(analysis_id);
create index if not exists idx_analysis_evidence_analysis_id on analysis_evidence(analysis_id);
create index if not exists idx_product_specs_analysis_id on product_specs(analysis_id);
create index if not exists idx_product_spec_features_product_spec_id on product_spec_features(product_spec_id);
create index if not exists idx_product_spec_themes_product_spec_id on product_spec_themes(product_spec_id);
create index if not exists idx_product_spec_navigation_product_spec_id on product_spec_navigation(product_spec_id);
create index if not exists idx_product_spec_pages_product_spec_id on product_spec_pages(product_spec_id);
create index if not exists idx_sections_product_spec_page_id on sections(product_spec_page_id);
create index if not exists idx_section_heroes_section_id on section_heroes(section_id);
create index if not exists idx_section_feature_list_items_section_id on section_feature_list_items(section_id);
create index if not exists idx_section_steps_items_section_id on section_steps_items(section_id);
create index if not exists idx_section_pricing_plans_section_id on section_pricing_plans(section_id);
create index if not exists idx_section_pricing_plan_features_plan_id on section_pricing_plan_features(plan_id);
create index if not exists idx_section_pricing_plan_actions_plan_id on section_pricing_plan_actions(plan_id);
create index if not exists idx_section_faq_items_section_id on section_faq_items(section_id);
create index if not exists idx_section_ctas_section_id on section_ctas(section_id);
create index if not exists idx_section_metric_row_metrics_section_id on section_metric_row_metrics(section_id);
create index if not exists idx_section_data_table_columns_section_id on section_data_table_columns(section_id);
create index if not exists idx_section_data_table_rows_section_id on section_data_table_rows(section_id);
create index if not exists idx_section_data_table_cells_row_id on section_data_table_cells(row_id);
create index if not exists idx_section_data_table_cells_column_id on section_data_table_cells(column_id);
create index if not exists idx_section_activity_list_items_section_id on section_activity_list_items(section_id);
create index if not exists idx_section_rich_text_paragraphs_section_id on section_rich_text_paragraphs(section_id);

-- ============================================================================
-- updated_at TRIGGERS (idempotent)
-- ============================================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language 'plpgsql';

drop trigger if exists update_projects_updated_at on projects;
create trigger update_projects_updated_at
  before update on projects
  for each row execute function update_updated_at_column();

drop trigger if exists update_analyses_updated_at on analyses;
create trigger update_analyses_updated_at
  before update on analyses
  for each row execute function update_updated_at_column();

drop trigger if exists update_product_specs_updated_at on product_specs;
create trigger update_product_specs_updated_at
  before update on product_specs
  for each row execute function update_updated_at_column();