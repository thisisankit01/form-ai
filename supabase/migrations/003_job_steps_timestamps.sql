-- Keep job step lifecycle timestamps aligned with the worker and workspace UI.
alter table if exists job_steps
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz;
