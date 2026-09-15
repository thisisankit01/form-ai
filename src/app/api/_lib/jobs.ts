/* eslint-disable @typescript-eslint/no-explicit-any */
const STALE_QUEUED_MS = 2 * 60 * 1000;
const STALE_RUNNING_MS = 15 * 60 * 1000;

export async function recoverStaleActiveJob(supabase: any, projectId: string, kinds: string[]) {
  const { data: jobs, error } = await supabase.from('jobs').select('id, status, created_at, started_at, cancel_requested')
    .eq('project_id', projectId).in('kind', kinds).in('status', ['queued', 'running']).order('created_at', { ascending: true });
  if (error) throw error;
  const now = Date.now();
  const staleJobs = (jobs || []).filter((job: any) => job.cancel_requested || now - new Date(job.status === 'running' ? job.started_at || job.created_at : job.created_at).getTime() > (job.status === 'running' ? STALE_RUNNING_MS : STALE_QUEUED_MS));
  for (const stale of staleJobs) {
    await supabase.from('jobs').update({
      status: stale.cancel_requested ? 'cancelled' : 'failed',
      error_code: stale.cancel_requested ? 'CANCELLED' : 'STALE_WORKER',
      error_message: stale.cancel_requested ? 'Cancelled by user.' : 'Worker timed out. The request can be retried.',
      finished_at: new Date().toISOString(),
    }).eq('id', stale.id).eq('project_id', projectId);
  }
  return (jobs || []).find((job: any) => !staleJobs.some((stale: any) => stale.id === job.id)) || null;
}

export async function queueJob(supabase: any, input: { projectId: string; ownerId: string; kind: string; idempotencyKey: string; requestPayload: Record<string, unknown>; baseVersionId?: string }) {
  const { data: existing, error } = await supabase.from('jobs').select('id, status').eq('project_id', input.projectId)
    .eq('owner_id', input.ownerId).eq('kind', input.kind).eq('idempotency_key', input.idempotencyKey).maybeSingle();
  if (error) throw error;
  if (existing?.status === 'failed' || existing?.status === 'cancelled') {
    const { data: retried, error: retryError } = await supabase.from('jobs').update({ status: 'queued', stage: input.kind, error_code: null, error_message: null, finished_at: null, cancel_requested: false, request_payload: input.requestPayload })
      .eq('id', existing.id).eq('project_id', input.projectId).select('id').single();
    if (retryError) throw retryError;
    return retried;
  }
  if (existing) return existing;
  const { data: job, error: insertError } = await supabase.from('jobs').insert({
    project_id: input.projectId, owner_id: input.ownerId, kind: input.kind, status: 'queued', stage: input.kind,
    idempotency_key: input.idempotencyKey, base_version_id: input.baseVersionId, request_payload: input.requestPayload,
  }).select('id').single();
  if (insertError?.code === '23505') {
    const { data: duplicate, error: duplicateError } = await supabase.from('jobs').select('id, status').eq('project_id', input.projectId).eq('owner_id', input.ownerId).eq('kind', input.kind).eq('idempotency_key', input.idempotencyKey).single();
    if (duplicateError) throw duplicateError;
    return duplicate;
  }
  if (insertError) throw insertError;
  return job;
}
