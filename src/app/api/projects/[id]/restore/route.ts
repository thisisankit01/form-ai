import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const RestoreRequestSchema = z.object({
  versionId: z.string().uuid(),
  expectedCurrentVersionId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
});

export async function POST(
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
    const { versionId, expectedCurrentVersionId } = RestoreRequestSchema.parse(body);

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id, current_version_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check version conflict
    if (project.current_version_id !== expectedCurrentVersionId) {
      return NextResponse.json(
        { error: 'Version conflict - project has been modified', code: 'VERSION_CONFLICT' },
        { status: 409 }
      );
    }

    // Verify version exists
    const { data: version } = await supabase
      .from('product_versions')
      .select('id, spec, version_number')
      .eq('id', versionId)
      .eq('project_id', id)
      .single();

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Check quota
    const { data: quota } = await supabase
      .rpc('check_ai_quota', { p_user_id: user.id });

    if (!quota?.allowed) {
      return NextResponse.json(
        { error: 'Daily AI call limit reached', code: 'QUOTA_EXCEEDED' },
        { status: 429 }
      );
    }

    // Create new version from restored spec
    const { data: newVersion } = await supabase
      .from('product_versions')
      .insert({
        project_id: id,
        version_number: (await supabase.from('product_versions').select('version_number', { count: 'exact' }).eq('project_id', id)).count! + 1,
        parent_version_id: versionId,
        spec: version.spec,
        schema_version: 1,
        change_summary: [`Restored from version ${version.version_number}`],
        created_by: user.id,
      })
      .select()
      .single();

    // Update project
    await supabase
      .from('projects')
      .update({ current_version_id: newVersion?.id })
      .eq('id', id);

    // Record message
    await supabase.from('messages').insert({
      project_id: id,
      role: 'assistant',
      content: `Restored from version ${version.version_number}`,
      base_version_id: expectedCurrentVersionId,
      result_version_id: newVersion?.id,
      status: 'completed',
    });

    return NextResponse.json({ data: { versionId: newVersion?.id } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Restore error:', error);
    return NextResponse.json(
      { error: 'Failed to restore version' },
      { status: 500 }
    );
  }
}
