import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/jobs/client';
import { z } from 'zod';
import { apiError, internalError, validationError } from '@/app/api/_lib/response';
import { queueJob, recoverStaleActiveJob } from '@/app/api/_lib/jobs';

const BuildRequestSchema = z.object({
  analysisId: z.string().uuid(),
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
    const { analysisId, idempotencyKey } = BuildRequestSchema.parse(body);

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return apiError('NOT_FOUND', 'Project not found.', 404);
    }

    // Verify analysis belongs to project
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('id, project_id')
      .eq('id', analysisId)
      .eq('project_id', id)
      .single();

    if (analysisError || !analysis) {
      return apiError('NOT_FOUND', 'Analysis not found.', 404);
    }

    // Check for existing active job
    const activeJob = await recoverStaleActiveJob(supabase, id, ['build', 'edit']);

    if (activeJob) {
      return apiError('ACTIVE_JOB_CONFLICT', 'Active job already running for this project.', 409);
    }

    // Check quota
    const { data: quota } = await supabase
      .rpc('check_ai_quota', { p_user_id: user.id });

    if (!quota?.allowed) {
      return apiError('QUOTA_EXCEEDED', 'Daily AI call limit reached.', 429);
    }

    let job;
    try { job = await queueJob(supabase, { projectId: id, ownerId: user.id, kind: 'build', idempotencyKey, requestPayload: { projectId: id, analysisId } }); } catch { return internalError('Build job could not be queued.'); }

    // Dispatch build job
    await inngest.send({
      name: 'jobs/build.requested',
      data: {
        projectId: id,
        analysisId,
        jobId: job.id,
        idempotencyKey,
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
    console.error('Build error:', error);
    return internalError('Failed to start build.');
  }
}
