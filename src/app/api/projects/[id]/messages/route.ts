import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/jobs/client';
import { z } from 'zod';
import { queueJob, recoverStaleActiveJob } from '@/app/api/_lib/jobs';

const MessageRequestSchema = z.object({
  instruction: z.string().min(1).max(4000),
  baseVersionId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { data: project } = await supabase.from('projects').select('id').eq('id', id).eq('user_id', user.id).single();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const { data, error } = await supabase.from('messages').select('id, role, content, status, created_at, base_version_id, result_version_id').eq('project_id', id).order('created_at', { ascending: true }).limit(100);
  if (error) return NextResponse.json({ error: 'Messages could not be loaded' }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

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
    const { instruction, baseVersionId, idempotencyKey } = MessageRequestSchema.parse(body);

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify base version exists and belongs to project
    const { data: version, error: versionError } = await supabase
      .from('product_versions')
      .select('id, project_id, spec, version_number')
      .eq('id', baseVersionId)
      .eq('project_id', id)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Check for existing active mutating job
    const activeJob = await recoverStaleActiveJob(supabase, id, ['build', 'edit']);

    if (activeJob) {
      return NextResponse.json(
        { error: 'Active job already running for this project', code: 'ACTIVE_JOB_CONFLICT' },
        { status: 409 }
      );
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

    // Create user message record
    const { data: message } = await supabase
      .from('messages')
      .insert({
        project_id: id,
        role: 'user',
        content: instruction,
        base_version_id: baseVersionId,
        status: 'pending',
      })
      .select()
      .single();
    if (!message) return NextResponse.json({ error: 'Message could not be saved' }, { status: 500 });

    let job;
    try { job = await queueJob(supabase, { projectId: id, ownerId: user.id, kind: 'edit', idempotencyKey, baseVersionId, requestPayload: { projectId: id, instruction, baseVersionId, messageId: message.id } }); } catch { return NextResponse.json({ error: 'Edit job could not be queued' }, { status: 500 }); }

    // Dispatch edit job
    await inngest.send({
      name: 'jobs/edit.requested',
      data: {
        projectId: id,
        instruction,
        baseVersionId,
        idempotencyKey,
        messageId: message?.id,
        jobId: job.id,
      },
    });

    return NextResponse.json(
      { data: { jobId: job.id, messageId: message.id } },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
