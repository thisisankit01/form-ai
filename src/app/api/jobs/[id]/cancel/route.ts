import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { data: job } = await supabase
      .from('jobs')
      .select('id, project_id, status')
      .eq('id', id)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', job.project_id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Only allow cancellation of queued/running jobs
    if (!['queued', 'running'].includes(job.status)) {
      return NextResponse.json(
        { error: 'Job cannot be cancelled in current state' },
        { status: 400 }
      );
    }

    // Request cancellation (inngest job checks cancel_requested)
    await supabase
      .from('jobs')
      .update({ cancel_requested: true, ...(job.status === 'queued' ? { status: 'cancelled', stage: 'cancelled', finished_at: new Date().toISOString() } : {}) })
      .eq('id', id);

    return NextResponse.json({ data: { cancelled: true } });
  } catch (error) {
    console.error('Cancel job error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}
