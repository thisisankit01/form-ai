import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/jobs/client';
import { z } from 'zod';
import { apiError, internalError, validationError } from '@/app/api/_lib/response';
import { queueJob, recoverStaleActiveJob } from '@/app/api/_lib/jobs';

const AnalyzeRequestSchema = z.object({
  idempotencyKey: z.string().uuid(),
  refresh: z.boolean().optional(),
  pastedContent: z.string().optional(),
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
    const { idempotencyKey, refresh, pastedContent } = AnalyzeRequestSchema.parse(body);

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

    // Check for existing active job
    const activeJob = await recoverStaleActiveJob(supabase, id, ['analyze', 'build', 'edit']);
    if (activeJob) {
      return apiError('ACTIVE_JOB_CONFLICT', 'Active job already running for this project.', 409);
    }

    // Check quota
    const { data: quota } = await supabase
      .rpc('check_ai_quota', { p_user_id: user.id });

    if (!quota?.allowed) {
      return apiError('QUOTA_EXCEEDED', 'Daily AI call limit reached.', 429);
    }

    // Get project details for the job
    const { data: projectDetails } = await supabase
      .from('projects')
      .select('description, target_customer, source_url')
      .eq('id', id)
      .single();

    const captureId = crypto.randomUUID();
    let job;
    try { job = await queueJob(supabase, { projectId: id, ownerId: user.id, kind: 'analyze', idempotencyKey, requestPayload: { projectId: id, captureId, refresh, pastedContent } }); } catch {
      return NextResponse.json({ error: 'Analysis job could not be queued' }, { status: 500 });
    }

    // Dispatch analyze job
    await inngest.send({
      name: 'jobs/analyze.requested',
      data: {
        projectId: id,
         captureId,
         jobId: job.id,
        idempotencyKey,
        refresh,
        pastedContent,
        description: projectDetails?.description || '',
        targetCustomer: projectDetails?.target_customer || '',
        url: projectDetails?.source_url || '',
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
    console.error('Analyze error:', error);
    return internalError('Failed to start analysis.');
  }
}
