import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recoverStaleActiveJob } from '@/app/api/_lib/jobs';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch project with related data
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        target_customer,
        source_url,
        status,
        current_analysis_id,
        current_version_id,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await recoverStaleActiveJob(supabase, id, ['analyze', 'build', 'edit', 'qa', 'export']);

    // Fetch current analysis if exists
    let analysis = null;
    if (project.current_analysis_id) {
      const { data } = await supabase
        .from('analyses')
        .select(`
          id,
          source_url,
          source_text,
          screenshot_url,
          schema_version,
          summary_claim,
          summary_status,
          core_problem_text,
          core_problem_status,
          business_model_text,
          business_model_status,
          ui_direction,
          created_at,
          analysis_target_users (claim_text, claim_status, ord),
          analysis_key_features (claim_text, claim_status, ord),
          analysis_improvements (title, rationale, priority, ord),
          analysis_mvp_features (title, user_value, priority, ord),
          analysis_evidence (source_url, excerpt),
          analysis_visual (layout, palette, hierarchy, density, useful_patterns, issues)
        `)
        .eq('id', project.current_analysis_id)
        .single();
      analysis = data;
    }

    // Fetch current version if exists
    let version = null;
    if (project.current_version_id) {
      const { data: rawVersion } = await supabase
        .from('product_versions')
        .select('id, version_number, spec, schema_version, change_summary, created_at, engine, design_plan, asset_manifest, artifact_manifest')
        .eq('id', project.current_version_id)
        .single();
      if (rawVersion?.engine === 'code-artifact-v3') {
        const artifact = rawVersion.artifact_manifest && typeof rawVersion.artifact_manifest === 'object'
          ? rawVersion.artifact_manifest as { id?: string; templateVersion?: string; routes?: unknown; capabilities?: unknown; sourceHash?: string }
          : {};
        version = {
          id: rawVersion.id,
          version_number: rawVersion.version_number,
          spec: rawVersion.spec,
          schema_version: rawVersion.schema_version,
          change_summary: rawVersion.change_summary,
          created_at: rawVersion.created_at,
          engine: rawVersion.engine,
          design_plan: rawVersion.design_plan,
          asset_manifest: rawVersion.asset_manifest,
          artifact: {
            id: artifact.id || null,
            templateVersion: artifact.templateVersion || null,
            routes: Array.isArray(artifact.routes) ? artifact.routes : [],
            capabilities: Array.isArray(artifact.capabilities) ? artifact.capabilities : [],
            sourceHash: artifact.sourceHash || null,
            previewUrl: `/api/projects/${id}/versions/${rawVersion.id}/preview/`,
          },
        };
      } else {
        if (rawVersion) {
          version = {
            id: rawVersion.id,
            version_number: rawVersion.version_number,
            spec: rawVersion.spec,
            schema_version: rawVersion.schema_version,
            change_summary: rawVersion.change_summary,
            created_at: rawVersion.created_at,
            engine: rawVersion.engine,
          };
        }
      }
    }

    // Fetch recent jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, kind, status, stage, created_at, started_at, finished_at, error_code, error_message')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    const jobsWithSteps = await Promise.all((jobs || []).map(async (job) => {
      const { data: steps } = await supabase
        .from('job_steps')
        .select('stage_key, status, started_at, finished_at, output_ref, error_code')
        .eq('job_id', job.id)
        .order('created_at', { ascending: true });
      return { ...job, steps: steps || [] };
    }));

    const [{ data: captures }, { data: qaReports }, { data: exportsList }] = await Promise.all([
      supabase.from('source_captures').select('id, kind, requested_url, final_url, title, screenshot_path, captured_at, metadata').eq('project_id', id).order('captured_at', { ascending: false }).limit(5),
      supabase.from('qa_reports').select('id, version_id, checks, ai_findings, screenshot_paths, status, created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(5),
      supabase.from('exports').select('id, version_id, storage_path, checksum, status, created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(5),
    ]);
    const capturesWithUrls = await Promise.all((captures || []).map(async (capture) => {
      if (!capture.screenshot_path || capture.screenshot_path.startsWith('http')) return capture;
      const { data: signed } = await supabase.storage.from('form-assets').createSignedUrl(capture.screenshot_path, 900);
      return { ...capture, screenshot_path: signed?.signedUrl || null };
    }));

    return NextResponse.json({
      data: {
        project,
        analysis,
        version,
        recentJobs: jobsWithSteps,
        captures: capturesWithUrls,
        qaReports: qaReports || [],
        exports: exportsList || [],
      },
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Project detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || name.length > 80) {
      return NextResponse.json(
        { error: 'Name is required and must be <= 80 characters' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('projects')
      .update({ name })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Project update error:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete project (cascades to related tables via FK)
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Project delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
