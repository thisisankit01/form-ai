import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, versionId } = await params;

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: rawVersion, error } = await supabase
      .from('product_versions')
      .select('id, version_number, spec, schema_version, change_summary, created_at, engine, design_plan, asset_manifest, artifact_manifest')
      .eq('id', versionId)
      .eq('project_id', id)
      .single();

    if (error || !rawVersion) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    if (rawVersion.engine === 'code-artifact-v3') {
      const artifact = rawVersion.artifact_manifest && typeof rawVersion.artifact_manifest === 'object'
        ? rawVersion.artifact_manifest as { id?: string; templateVersion?: string; routes?: unknown; capabilities?: unknown; sourceHash?: string }
        : {};
      return NextResponse.json({ data: {
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
          previewUrl: `/api/projects/${id}/versions/${versionId}/preview/`,
        },
      } });
    }
    return NextResponse.json({ data: {
      id: rawVersion.id,
      version_number: rawVersion.version_number,
      spec: rawVersion.spec,
      schema_version: rawVersion.schema_version,
      change_summary: rawVersion.change_summary,
      created_at: rawVersion.created_at,
      engine: rawVersion.engine,
    } });
  } catch (error) {
    console.error('Version detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version' },
      { status: 500 }
    );
  }
}
