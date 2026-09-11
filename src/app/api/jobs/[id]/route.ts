import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        id,
        kind,
        status,
        stage,
        error_code,
        error_message,
        cancel_requested,
        created_at,
        started_at,
        finished_at,
        result_id,
         request_payload,
         project_id
      `)
      .eq('id', id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify ownership via project
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', job.project_id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Fetch job steps
    const { data: steps } = await supabase
      .from('job_steps')
      .select('stage_key, status, attempt, prompt_version, model, usage, duration_ms, error_code, output_ref')
      .eq('job_id', id)
      .order('created_at');

    return NextResponse.json({ 
      data: { 
        ...job, 
        steps: steps || [] 
      } 
    });
  } catch (error) {
    console.error('Job status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}
