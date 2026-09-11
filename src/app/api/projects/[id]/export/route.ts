import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/jobs/client';
import { z } from 'zod';
import { apiError, internalError, validationError } from '@/app/api/_lib/response';
import { queueJob, recoverStaleActiveJob } from '@/app/api/_lib/jobs';

const ExportRequestSchema = z.object({
  versionId: z.string().uuid(),
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
      return apiError('UNAUTHORIZED', 'Authentication is required.', 401);
    }

    const { id } = await params;
    const body = await request.json();
    const { versionId, idempotencyKey } = ExportRequestSchema.parse(body);

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return apiError('NOT_FOUND', 'Project not found.', 404);
    }

    // Verify version
    const { data: version } = await supabase
      .from('product_versions')
      .select('id')
      .eq('id', versionId)
      .eq('project_id', id)
      .single();

    if (!version) {
      return apiError('NOT_FOUND', 'Version not found.', 404);
    }

    // Check for existing export
    const { data: existingExport } = await supabase
      .from('exports')
      .select('id, status, storage_path')
      .eq('project_id', id)
      .eq('version_id', versionId)
      .single();

    if (existingExport && existingExport.status === 'completed') {
      return NextResponse.json({ data: { exportId: existingExport.id, status: 'existing' } });
    }

    await recoverStaleActiveJob(supabase, id, ['export']);

    // Check quota
    const { data: quota } = await supabase
      .rpc('check_ai_quota', { p_user_id: user.id });

    if (!quota?.allowed) {
      return apiError('QUOTA_EXCEEDED', 'Daily AI call limit reached.', 429);
    }

    let job;
    try { job = await queueJob(supabase, { projectId: id, ownerId: user.id, kind: 'export', idempotencyKey, requestPayload: { projectId: id, versionId } }); } catch { return internalError('Export job could not be queued.'); }

    // Dispatch export job
    await inngest.send({
      name: 'jobs/export.requested',
      data: {
        projectId: id,
        versionId,
        idempotencyKey,
        jobId: job.id,
      },
    });

    return NextResponse.json(
      { data: { jobId: job.id } },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError({ fieldErrors: error.flatten().fieldErrors });
    }
    console.error('Export error:', error);
    return internalError('Failed to start export.');
  }
}
