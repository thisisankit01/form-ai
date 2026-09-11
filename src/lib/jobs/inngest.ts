/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from './client';
import { createAdminClient } from '@/lib/supabase/admin';
import { ProductSpec } from '@/lib/product/schema';
import { runRenderedQA, validateProductSpec } from '@/lib/qa';

async function getJobSupabase() {
  return createAdminClient();
}

function getFailureMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const value = error as { message?: unknown; error?: unknown };
    if (typeof value.message === 'string') return value.message;
    if (typeof value.error === 'string') return value.error;
  }
  return 'The worker failed without a usable error message.';
}

function isFinalAttempt(attempt?: number, maxAttempts?: number): boolean {
  return maxAttempts === undefined || attempt === undefined || attempt >= maxAttempts - 1;
}

async function updateJobStep(
  supabase: any,
  jobId: string,
  stageKey: string,
  updates: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const enriched = updates.status === 'running'
    ? { started_at: timestamp, ...updates }
    : ['succeeded', 'failed', 'cancelled'].includes(String(updates.status))
      ? { finished_at: timestamp, ...updates }
      : updates;
  const { error } = await supabase
    .from('job_steps')
    .upsert({
      job_id: jobId,
      stage_key: stageKey,
      ...enriched,
    }, { onConflict: 'job_id,stage_key' });
  if (error) throw error;
}

async function updateJobStatus(
  supabase: any,
  jobId: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', jobId)
    .select('id')
    .single();
  if (error) throw error;
}

function requireData<T>(data: T | null | undefined, error: Error | null | undefined, message: string): T {
  if (error) throw error;
  if (data === null || data === undefined) throw new Error(message);
  return data;
}

function requireError(error: Error | null | undefined): void {
  if (error) throw error;
}

async function stopIfCancelled(supabase: any, jobId: string, projectId: string): Promise<boolean> {
  const { data: job, error } = await supabase.from('jobs').select('status, cancel_requested').eq('id', jobId).eq('project_id', projectId).single();
  requireData(job, error, 'Job not found');
  if (!job?.cancel_requested && job?.status !== 'cancelled') return false;
  await updateJobStatus(supabase, jobId, { status: 'cancelled', stage: 'cancelled', finished_at: new Date().toISOString() });
  return true;
}

const STALE_JOB_MS = 15 * 60 * 1000;

async function claimJob(supabase: any, input: {
  projectId: string;
  kind: string;
  idempotencyKey: string;
  jobId?: string;
  ownerId: string;
  requestPayload: Record<string, unknown>;
  baseVersionId?: string;
}) {
  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await supabase
    .from('jobs')
    .select('*')
    .eq('project_id', input.projectId)
    .eq('kind', input.kind)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();
  requireError(existingError);

  if (existing?.status === 'succeeded') return { job: existing, duplicate: true };
  if (existing?.status === 'running' && existing.started_at && Date.now() - new Date(existing.started_at).getTime() <= STALE_JOB_MS) {
    return { job: existing, duplicate: true };
  }

  if (existing) {
    const { data: job, error } = await supabase.from('jobs').update({
      status: 'running', stage: existing.stage || input.kind, started_at: now,
      finished_at: null, error_code: null, error_message: null, cancel_requested: false,
    }).eq('id', existing.id).eq('project_id', input.projectId).select().single();
    return { job: requireData(job, error, 'Job could not be claimed'), duplicate: false };
  }

  if (input.jobId) {
    const { data: queued, error } = await supabase.from('jobs').select('*').eq('id', input.jobId)
      .eq('project_id', input.projectId).eq('kind', input.kind).maybeSingle();
    requireError(error);
    if (queued) {
      const { data: job, error: updateError } = await supabase.from('jobs').update({
        status: 'running', started_at: now, finished_at: null, error_code: null, error_message: null, cancel_requested: false,
      }).eq('id', queued.id).eq('project_id', input.projectId).select().single();
      return { job: requireData(job, updateError, 'Job could not be claimed'), duplicate: false };
    }
  }

  const { data: job, error } = await supabase.from('jobs').insert({
    project_id: input.projectId, owner_id: input.ownerId, kind: input.kind, status: 'running',
    stage: input.kind, idempotency_key: input.idempotencyKey, base_version_id: input.baseVersionId,
    request_payload: input.requestPayload,
  }).select().single();
  if (error?.code === '23505') {
    const { data: retried, error: retryError } = await supabase.from('jobs').select('*')
      .eq('project_id', input.projectId).eq('kind', input.kind).eq('idempotency_key', input.idempotencyKey).single();
    return { job: requireData(retried, retryError, 'Job could not be claimed'), duplicate: true };
  }
  return { job: requireData(job, error, 'Job could not be created'), duplicate: false };
}

async function loadProject(supabase: any, projectId: string) {
  const { data, error } = await supabase.from('projects').select('id, user_id, description').eq('id', projectId).single();
  return requireData(data, error, 'Project not found');
}

// Type definitions for Inngest event data
interface AnalyzeEventData {
  projectId: string;
  captureId: string;
  jobId?: string;
  idempotencyKey: string;
  refresh?: boolean;
  pastedContent?: string;
  url?: string;
  description?: string;
  targetCustomer?: string;
}

interface InngestEvent<T> {
  data: T;
}

// ANALYZE JOB
export const analyzeJob = inngest.createFunction(
  { id: 'analyze-website', retries: 2, triggers: [{ event: 'jobs/analyze.requested' }] },
  async ({ event, step, attempt, maxAttempts }: { event: InngestEvent<AnalyzeEventData>; step: any; attempt?: number; maxAttempts?: number }) => {
    const input = event.data;
    const { projectId, captureId, idempotencyKey, jobId: queuedJobId } = input;

    const supabase = await getJobSupabase();
    const project = await loadProject(supabase, projectId);
    const claimed = await claimJob(supabase, { projectId, kind: 'analyze', idempotencyKey, jobId: queuedJobId, ownerId: project.user_id, requestPayload: input as unknown as Record<string, unknown> });
    const jobId = claimed.job.id;
    if (claimed.duplicate) return { jobId, status: 'duplicate' };

    try {
      if (await stopIfCancelled(supabase, jobId, projectId)) return { jobId, status: 'cancelled' };
      // Stage 1: Capture (or reuse)
      let captureResult: any;
      let persistedCaptureId = captureId;
      if (input.pastedContent) {
        captureResult = await step.run('capture-pasted', async () => {
          const { captureFromPastedContent } = await import('@/lib/capture/firecrawl');
          return captureFromPastedContent(input.pastedContent || '', input.url || '');
        });

        // Store capture
        const { data: persistedCapture, error: captureError } = await supabase.from('source_captures').insert({
          project_id: projectId,
          kind: 'user_pasted',
          requested_url: input.url || '',
          final_url: input.url || '',
          title: 'Pasted content',
          normalized_text: captureResult.normalizedText,
          screenshot_path: null,
          captured_at: captureResult.capturedAt,
          metadata: captureResult.metadata,
        }).select('id').single();
        persistedCaptureId = requireData(persistedCapture, captureError, 'Pasted capture could not be persisted').id;
      } else {
        const { data: existingCapture } = await supabase
          .from('source_captures')
          .select('*')
          .eq('project_id', projectId)
          .order('captured_at', { ascending: false })
          .limit(1)
          .single();

        if (existingCapture && !input.refresh) {
          captureResult = existingCapture;
          persistedCaptureId = existingCapture.id;
        } else {
          captureResult = await step.run('capture-website', async () => {
            const { captureWebsite } = await import('@/lib/capture/firecrawl');
            return captureWebsite(input.url || '');
          });

          const { data: persistedCapture, error: captureError } = await supabase.from('source_captures').insert({
            project_id: projectId,
            kind: 'url',
            requested_url: input.url || '',
            final_url: captureResult.finalUrl,
            title: captureResult.title,
            normalized_text: captureResult.normalizedText,
            screenshot_path: captureResult.screenshotPath,
            captured_at: captureResult.capturedAt,
            metadata: captureResult.metadata,
          }).select('id').single();
          persistedCaptureId = requireData(persistedCapture, captureError, 'Website capture could not be persisted').id;
        }
      }

      captureResult = {
        ...captureResult,
        normalized_text: captureResult.normalized_text ?? captureResult.normalizedText,
        screenshot_path: captureResult.screenshot_path ?? captureResult.screenshotPath,
        final_url: captureResult.final_url ?? captureResult.finalUrl,
      };
      if (captureResult.screenshotData && persistedCaptureId) {
        const screenshotPath = `captures/${projectId}/${persistedCaptureId}.png`;
        const upload = await supabase.storage.from('form-assets').upload(screenshotPath, Buffer.from(captureResult.screenshotData, 'base64'), { contentType: 'image/png', upsert: true });
        if (upload.error) throw upload.error;
        {
          const signed = await supabase.storage.from('form-assets').createSignedUrl(screenshotPath, 3600);
          if (signed.error) throw signed.error;
          captureResult.screenshot_path = signed.data?.signedUrl || captureResult.screenshot_path;
           const { error: screenshotUpdateError } = await supabase.from('source_captures').update({ screenshot_path: screenshotPath, metadata: { ...(captureResult.metadata || {}), fidelity: captureResult.fidelity || null } }).eq('id', persistedCaptureId).eq('project_id', projectId);
          requireError(screenshotUpdateError);
        }
      }
      await updateJobStep(supabase as any, jobId, 'capture', { status: 'succeeded', output_ref: persistedCaptureId });

      // Stage 2: Analysis Pipeline
      const analysis = await step.run('analysis-pipeline', async () => {
        if (await stopIfCancelled(supabase, jobId, projectId)) throw new Error('Job cancelled');
        await updateJobStatus(supabase as any, jobId, { stage: 'research' });
        await updateJobStep(supabase as any, jobId, 'research', { status: 'running' });
        await updateJobStatus(supabase as any, jobId, { stage: 'visual' });
        await updateJobStep(supabase as any, jobId, 'visual', { status: 'running' });
        await updateJobStatus(supabase as any, jobId, { stage: 'analyst' });
        await updateJobStep(supabase as any, jobId, 'analyst', { status: 'running' });

        const { runAnalysisPipeline } = await import('@/lib/ai/pipeline');
        const analysis = await runAnalysisPipeline({
          captureResult: {
            normalizedText: captureResult.normalized_text,
            screenshotUrl: captureResult.screenshot_path,
            metadata: { ...(captureResult.metadata as Record<string, unknown>), fidelity: captureResult.fidelity || null },
            title: captureResult.title,
          },
          goal: input.description || '',
          audience: input.targetCustomer || '',
        });

        return analysis;
      });

      await updateJobStep(supabase as any, jobId, 'research', { status: 'succeeded' });
      await updateJobStep(supabase as any, jobId, 'visual', { status: 'succeeded' });
      await updateJobStep(supabase as any, jobId, 'analyst', { status: 'succeeded' });

      // Store analysis
      const { data: analysisRecord, error: analysisError } = await supabase
        .from('analyses')
        .insert({
          project_id: input.projectId,
           capture_id: persistedCaptureId,
          source_url: captureResult.finalUrl,
          source_text: captureResult.normalizedText,
          screenshot_url: captureResult.screenshotPath,
          schema_version: 1,
           summary_claim: analysis.summary.text,
           summary_status: analysis.summary.status,
           core_problem_text: analysis.coreProblem.text,
           core_problem_status: analysis.coreProblem.status,
           business_model_text: analysis.businessModel.text,
           business_model_status: analysis.businessModel.status,
           ui_direction: analysis.visual?.layout || null,
        })
        .select()
        .single();

      requireData(analysisRecord, analysisError, 'Analysis was not persisted');
      const persistenceResults = await Promise.all([
        analysis.visual ? supabase.from('analysis_visual').insert({
          analysis_id: analysisRecord.id,
          layout: analysis.visual.layout,
          palette: JSON.stringify(analysis.visual.palette),
          hierarchy: analysis.visual.hierarchy,
          density: analysis.visual.density,
          useful_patterns: JSON.stringify(analysis.visual.usefulPatterns),
          issues: JSON.stringify(analysis.visual.issues),
        }) : Promise.resolve({ error: null }),
        supabase.from('analysis_target_users').insert(analysis.targetUsers.map((item: any, ord: number) => ({ analysis_id: analysisRecord.id, claim_text: item.text, claim_status: item.status, ord }))),
        supabase.from('analysis_key_features').insert(analysis.keyFeatures.map((item: any, ord: number) => ({ analysis_id: analysisRecord.id, claim_text: item.text, claim_status: item.status, ord }))),
        supabase.from('analysis_improvements').insert(analysis.improvements.map((item: any, ord: number) => ({ analysis_id: analysisRecord.id, title: item.title, rationale: item.rationale, priority: item.priority, ord }))),
        supabase.from('analysis_mvp_features').insert(analysis.mvpFeatures.map((item: any, ord: number) => ({ analysis_id: analysisRecord.id, title: item.title, user_value: item.userValue, priority: item.priority, ord }))),
        supabase.from('analysis_evidence').insert(analysis.evidence.map((item: any) => ({ analysis_id: analysisRecord.id, source_url: item.sourceUrl, excerpt: item.excerpt }))),
      ]);
      persistenceResults.forEach(({ error }: { error: Error | null }) => requireError(error));

      await updateJobStep(supabase as any, jobId, 'research', { status: 'succeeded' });
      await updateJobStep(supabase as any, jobId, 'visual', { status: 'succeeded' });
      await updateJobStep(supabase as any, jobId, 'analyst', { status: 'succeeded' });

      // Update project with analysis reference
      const { error: projectUpdateError } = await supabase
        .from('projects')
        .update({ current_analysis_id: analysisRecord.id, status: 'analyzed' })
        .eq('id', input.projectId);
      requireError(projectUpdateError);

      await updateJobStatus(supabase as any, jobId, {
        status: 'succeeded',
        stage: 'completed',
         result_id: analysisRecord.id,
        finished_at: new Date().toISOString(),
      });

      await inngest.send({
        name: 'jobs/build.requested',
        data: {
          projectId: input.projectId,
          analysisId: analysisRecord.id,
           jobId: (await claimJob(supabase, { projectId: input.projectId, kind: 'build', idempotencyKey: `build:${analysisRecord.id}`, ownerId: project.user_id, requestPayload: { projectId: input.projectId, analysisId: analysisRecord.id }, })).job.id,
           idempotencyKey: `build:${analysisRecord.id}`,
        },
      });

       return { jobId, analysisId: analysisRecord.id };
    } catch (error) {
      if (error instanceof Error && error.message === 'Job cancelled') {
        await updateJobStatus(supabase as any, jobId, { status: 'cancelled', stage: 'cancelled', finished_at: new Date().toISOString() });
        return { jobId, status: 'cancelled' };
      }
      await updateJobStatus(supabase as any, jobId, {
        status: isFinalAttempt(attempt, maxAttempts) ? 'failed' : 'running',
        error_code: isFinalAttempt(attempt, maxAttempts) ? 'ANALYSIS_FAILED' : 'RETRYING',
        error_message: getFailureMessage(error),
        finished_at: new Date().toISOString(),
      });
      throw error;
    }
  }
);

// BUILD JOB
export const buildJob = inngest.createFunction(
  { id: 'build-product', retries: 2, triggers: [{ event: 'jobs/build.requested' }] },
  async ({ event, step, attempt, maxAttempts }: any) => {
    const input = event.data;
    const supabase = await getJobSupabase();

    const projectOwner = await loadProject(supabase, input.projectId);
    const claimed = await claimJob(supabase, { projectId: input.projectId, kind: 'build', idempotencyKey: input.idempotencyKey, jobId: input.jobId, ownerId: projectOwner.user_id, requestPayload: input });
    const jobId = claimed.job.id;
    if (claimed.duplicate) return { jobId, status: 'duplicate' };

    try {
      if (await stopIfCancelled(supabase, jobId, input.projectId)) return { jobId, status: 'cancelled' };
      // Fetch analysis
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', input.analysisId)
        .eq('project_id', input.projectId)
        .single();

      requireData(analysis, analysisError, 'Analysis not found');

      const [targetUsersResult, keyFeaturesResult, improvementsResult, mvpFeaturesResult, evidenceResult, visualResult] = await Promise.all([
        supabase.from('analysis_target_users').select('*').eq('analysis_id', input.analysisId).order('ord'),
        supabase.from('analysis_key_features').select('*').eq('analysis_id', input.analysisId).order('ord'),
        supabase.from('analysis_improvements').select('*').eq('analysis_id', input.analysisId).order('ord'),
        supabase.from('analysis_mvp_features').select('*').eq('analysis_id', input.analysisId).order('ord'),
        supabase.from('analysis_evidence').select('*').eq('analysis_id', input.analysisId),
        supabase.from('analysis_visual').select('*').eq('analysis_id', input.analysisId).maybeSingle(),
      ]);
      [targetUsersResult, keyFeaturesResult, improvementsResult, mvpFeaturesResult, evidenceResult, visualResult].forEach(({ error }: { error: Error | null }) => requireError(error));
      const { data: targetUsers } = targetUsersResult;
      const { data: keyFeatures } = keyFeaturesResult;
      const { data: improvements } = improvementsResult;
      const { data: mvpFeatures } = mvpFeaturesResult;
      const { data: evidence } = evidenceResult;
      const { data: visual } = visualResult;
      const { data: project, error: projectError } = await supabase.from('projects').select('description').eq('id', input.projectId).single();
      requireData(project, projectError, 'Project not found');

      // Run build pipeline
      const spec = await step.run('build-pipeline', async () => {
        const { runBuildPipeline } = await import('@/lib/ai/pipeline');
        const spec = await runBuildPipeline({
          analysis: {
            schemaVersion: 1,
            summary: { text: analysis.summary_claim, status: analysis.summary_status, evidenceIds: [] },
            targetUsers: (targetUsers || []).map((item: any) => ({ text: item.claim_text, status: item.claim_status, evidenceIds: [] })),
            coreProblem: { text: analysis.core_problem_text, status: analysis.core_problem_status, evidenceIds: [] },
            keyFeatures: (keyFeatures || []).map((item: any) => ({ text: item.claim_text, status: item.claim_status, evidenceIds: [] })),
            businessModel: { text: analysis.business_model_text, status: analysis.business_model_status, evidenceIds: [] },
            improvements: (improvements || []).map((item: any) => ({ id: item.id, title: item.title, rationale: item.rationale, priority: item.priority })),
            mvpFeatures: (mvpFeatures || []).map((item: any) => ({ id: item.id, title: item.title, userValue: item.user_value, priority: item.priority })),
            evidence: (evidence || []).map((item: any) => ({ id: item.id, sourceUrl: item.source_url, excerpt: item.excerpt })),
             visual: visual ? {
               layout: visual.layout,
               palette: JSON.parse(visual.palette),
               hierarchy: visual.hierarchy,
               density: visual.density,
               usefulPatterns: JSON.parse(visual.useful_patterns),
               issues: JSON.parse(visual.issues),
             } : null,
            limitations: [],
          },
          goal: project?.description || '',
        });
        return spec;
      });

      // Store product spec
      const { data: specRecord, error: specError } = await supabase
        .from('product_specs')
        .insert({
          analysis_id: input.analysisId,
           name: spec.name,
           description: spec.description,
           audience: spec.audience,
           positioning: spec.positioning,
          ui_direction: 'Editorial style',
        })
        .select()
        .single();

      const persistedSpec = requireData(specRecord, specError, 'Product spec was not persisted');

      // Database IDs are UUIDs; keep the AI-facing IDs in the JSON spec and use
      // generated UUIDs for relational rows and foreign-key references.
      const { error: featuresError } = await supabase.from('product_spec_features').insert(spec.features.map((feature: any, ord: number) => ({
        id: crypto.randomUUID(),
        product_spec_id: persistedSpec.id,
        title: feature.title,
        description: feature.description,
        priority: feature.priority,
        ord,
      })));
      requireError(featuresError);

      // Store theme
      const { error: themeError } = await supabase.from('product_spec_themes').insert({
        product_spec_id: persistedSpec.id,
        preset: 'editorial-light',
        accent: 'lime',
        density: 'comfortable',
        radius: 'sharp',
      });
      requireError(themeError);

      // Store pages and sections
      const pageRecords = new Map<string, string>();
      for (const [ord, page] of spec.pages.entries()) {
        const pageId = crypto.randomUUID();
        const { data: pageRecord, error: pageError } = await supabase
          .from('product_spec_pages')
          .insert({ id: pageId, product_spec_id: persistedSpec.id, slug: page.slug, title: page.title, kind: page.kind, ord })
          .select('id')
          .single();
        const persistedPage = requireData(pageRecord, pageError, `Product page ${page.id} could not be created`);
        pageRecords.set(page.id, persistedPage.id);
      }

      const defaultPageId = pageRecords.get(spec.pages[0].id);
      const { error: navigationError } = await supabase.from('product_spec_navigation').insert(spec.navigation.map((item: any, ord: number) => ({
        id: crypto.randomUUID(),
        product_spec_id: persistedSpec.id,
        label: item.label,
        page_id: requireData(pageRecords.get(item.pageId) || defaultPageId, null, 'Navigation has no valid page target'),
        ord,
      })));
      if (navigationError) throw navigationError;

       const { data: latestVersion, error: latestVersionError } = await supabase.from('product_versions').select('version_number').eq('project_id', input.projectId).order('version_number', { ascending: false }).limit(1).maybeSingle();
       requireError(latestVersionError);
       const { data: version, error: versionError } = await supabase
        .from('product_versions')
        .insert({
          project_id: input.projectId,
           version_number: (latestVersion?.version_number || 0) + 1,
           spec,
          schema_version: 1,
          change_summary: ['Initial version'],
            created_by: projectOwner.user_id,
        })
         .select()
         .single();
       const persistedVersion = requireData(version, versionError, 'Product version was not persisted');

      // Update project
       const { error: projectUpdateError } = await supabase
        .from('projects')
         .update({ current_version_id: persistedVersion.id, status: 'built' })
         .eq('id', input.projectId);
       requireError(projectUpdateError);

      await updateJobStatus(supabase as any, jobId, {
        status: 'succeeded',
        stage: 'completed',
        finished_at: new Date().toISOString(),
      });

      return { jobId };
    } catch (error) {
      await updateJobStatus(supabase as any, jobId, {
        status: isFinalAttempt(attempt, maxAttempts) ? 'failed' : 'running',
        error_code: isFinalAttempt(attempt, maxAttempts) ? 'BUILD_FAILED' : 'RETRYING',
        error_message: getFailureMessage(error),
        finished_at: new Date().toISOString(),
      });
      throw error;
    }
  }
);

// EDIT JOB
export const editJob = inngest.createFunction(
  { id: 'edit-product', retries: 2, triggers: [{ event: 'jobs/edit.requested' }] },
  async ({ event, step, attempt, maxAttempts }: any) => {
    const input = event.data;
    const { messageId } = input;

    const supabase = await getJobSupabase();

    const { data: existingJob } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('idempotency_key', input.idempotencyKey)
      .single();

    if (existingJob && existingJob.status === 'running') {
      return { jobId: existingJob.id, status: 'duplicate' };
    }

    const projectOwner = await loadProject(supabase, input.projectId);
    const claimed = await claimJob(supabase, { projectId: input.projectId, kind: 'edit', idempotencyKey: input.idempotencyKey, jobId: input.jobId, ownerId: projectOwner.user_id, baseVersionId: input.baseVersionId, requestPayload: input });
    const jobId = claimed.job.id;
    if (claimed.duplicate) return { jobId, status: 'duplicate' };

    try {
      if (await stopIfCancelled(supabase, jobId, input.projectId)) return { jobId, status: 'cancelled' };
      // Fetch current spec
      const { data: version } = await supabase
        .from('product_versions')
        .select('spec')
        .eq('id', input.baseVersionId)
        .eq('project_id', input.projectId)
        .single();

      if (!version) throw new Error('Base version not found');

      // Run revision
      const result = await step.run('revision-pipeline', async () => {
        const { runEditPipeline } = await import('@/lib/ai/pipeline');
        const result = await runEditPipeline({
          currentSpec: version.spec || {},
          instruction: input.instruction,
        });
        return result;
      });
      if (JSON.stringify(result.updatedSpec) === JSON.stringify(version.spec)) {
        throw new Error('The requested edit did not change the product spec.');
      }

      const { data: latestVersion } = await supabase.from('product_versions').select('version_number').eq('project_id', input.projectId).order('version_number', { ascending: false }).limit(1).maybeSingle();
      const { data: newVersion } = await supabase
        .from('product_versions')
        .insert({
          project_id: input.projectId,
           version_number: (latestVersion?.version_number || 0) + 1,
          parent_version_id: input.baseVersionId,
          spec: result.updatedSpec || {},
          schema_version: 1,
          change_summary: result.changeSummary || [],
            created_by: projectOwner.user_id,
        })
        .select()
        .single();

      // Update project
      await supabase
        .from('projects')
        .update({ current_version_id: newVersion?.id })
        .eq('id', input.projectId);

      // Resolve the original pending user message instead of creating a duplicate.
      await supabase.from('messages').insert({
        project_id: input.projectId,
        role: 'assistant',
        content: 'Updated based on your instruction.',
        base_version_id: input.baseVersionId,
        result_version_id: newVersion?.id,
        job_id: jobId,
        status: 'completed',
      });

      if (messageId) {
         await supabase.from('messages').update({ result_version_id: newVersion?.id, job_id: jobId, status: 'completed' }).eq('id', messageId).eq('project_id', input.projectId);
      }

      await updateJobStatus(supabase as any, jobId, {
        status: 'succeeded',
        stage: 'completed',
        result_id: newVersion?.id,
        finished_at: new Date().toISOString(),
      });

      return { jobId, versionId: newVersion?.id, changeSummary: result.changeSummary || [] };
    } catch (error) {
      if (messageId) await supabase.from('messages').update({ job_id: jobId, status: 'failed' }).eq('id', messageId);
      await updateJobStatus(supabase as any, jobId, {
        status: isFinalAttempt(attempt, maxAttempts) ? 'failed' : 'running',
        error_code: isFinalAttempt(attempt, maxAttempts) ? 'EDIT_FAILED' : 'RETRYING',
        error_message: getFailureMessage(error),
        finished_at: new Date().toISOString(),
      });
      throw error;
    }
  }
);

// QA JOB
export const qaJob = inngest.createFunction(
  { id: 'qa-product', retries: 1, triggers: [{ event: 'jobs/qa.requested' }] },
  async ({ event, step, attempt, maxAttempts }: any) => {
    const input = event.data;
    const supabase = await getJobSupabase();
    const project = await loadProject(supabase, input.projectId);
    const claimed = await claimJob(supabase, { projectId: input.projectId, kind: 'qa', idempotencyKey: input.idempotencyKey, jobId: input.jobId, ownerId: project.user_id, requestPayload: input });
    const job = claimed.job;
    if (claimed.duplicate) return { jobId: job.id, status: 'duplicate' };
    try {
      if (await stopIfCancelled(supabase, job.id, input.projectId)) return { jobId: job.id, status: 'cancelled' };
      const { data: version } = await supabase.from('product_versions').select('spec').eq('id', input.versionId).eq('project_id', input.projectId).single();
      if (!version) throw new Error('Version not found');
      const parsed = ProductSpec.safeParse(version.spec);
      const validationIssues = parsed.success ? [] : parsed.error.issues.map((issue) => ({ check: 'schema', code: 'schema-invalid', severity: 'error' as const, message: `${issue.path.join('.') || 'spec'}: ${issue.message}`, suggestedFix: 'Regenerate this version.' }));
      const deterministic = parsed.success ? validateProductSpec(parsed.data) : { valid: false, issues: validationIssues, checkedSections: 0, checkedActions: 0 };
      const rendered = parsed.success && deterministic.valid ? await step.run('qa-rendered', () => runRenderedQA(parsed.data)) : { issues: [], viewports: [] };
      const aiReview = parsed.success ? await step.run('qa-agent', async () => {
        const { runQAAgent } = await import('@/lib/ai/pipeline');
        return runQAAgent(parsed.data, project?.description || '', deterministic, rendered);
      }) : { passed: false, issues: [] };
      const issues = [...deterministic.issues, ...rendered.issues, ...(aiReview.issues || [])];
      const checks = [
        { name: 'ProductSpec schema', passed: parsed.success },
        { name: 'Required pages and sections', passed: parsed.success && !deterministic.issues.some((issue) => issue.check === 'pages') },
        { name: 'Actions and references', passed: parsed.success && !deterministic.issues.some((issue) => issue.check === 'actions') },
        { name: 'Responsive-safe constraints', passed: parsed.success && !deterministic.issues.some((issue) => issue.check === 'responsive') },
        { name: 'Theme validity', passed: parsed.success && !deterministic.issues.some((issue) => issue.check === 'theme') },
        { name: 'Rendered desktop/tablet/mobile fixture', passed: parsed.success && rendered.issues.length === 0 && rendered.viewports.length > 0 },
        { name: 'AI product review', passed: aiReview.passed },
      ];
      const passed = checks.every((check) => check.passed);
      const { data: report, error: reportError } = await supabase.from('qa_reports').insert({ project_id: input.projectId, version_id: input.versionId, checks, ai_findings: issues, screenshot_paths: [], status: passed ? 'passed' : 'failed' }).select().single();
      if (reportError || !report) throw reportError || new Error('QA report could not be saved');
      await updateJobStatus(supabase as any, job.id, { status: 'succeeded', stage: 'completed', result_id: report?.id, finished_at: new Date().toISOString() });
      return { jobId: job.id, reportId: report?.id, passed };
    } catch (error) {
      await updateJobStatus(supabase as any, job.id, { status: isFinalAttempt(attempt, maxAttempts) ? 'failed' : 'running', error_code: isFinalAttempt(attempt, maxAttempts) ? 'QA_FAILED' : 'RETRYING', error_message: getFailureMessage(error), ...(isFinalAttempt(attempt, maxAttempts) ? { finished_at: new Date().toISOString() } : {}) });
      throw error;
    }
  }
);

// EXPORT JOB
export const exportJob = inngest.createFunction(
  { id: 'export-product', retries: 1, triggers: [{ event: 'jobs/export.requested' }] },
  async ({ event, step, attempt, maxAttempts }: any) => {
    const input = event.data;
    const supabase = await getJobSupabase();

    // Check for existing export
    const { data: existingExport } = await supabase
      .from('exports')
      .select('id, status, storage_path')
      .eq('project_id', input.projectId)
      .eq('version_id', input.versionId)
      .single();

    if (existingExport && existingExport.status === 'completed') {
      return { exportId: existingExport.id, status: 'existing' };
    }

    const projectOwner = await loadProject(supabase, input.projectId);
    const claimed = await claimJob(supabase, { projectId: input.projectId, kind: 'export', idempotencyKey: input.idempotencyKey, jobId: input.jobId, ownerId: projectOwner.user_id, requestPayload: input });
    const jobId = claimed.job.id;
    if (claimed.duplicate) return { jobId, status: 'duplicate' };

    try {
      if (await stopIfCancelled(supabase, jobId, input.projectId)) return { jobId, status: 'cancelled' };
      // Fetch version and spec
      const { data: version } = await supabase
        .from('product_versions')
        .select('spec, version_number')
        .eq('id', input.versionId)
        .eq('project_id', input.projectId)
        .single();

      if (!version) throw new Error('Version not found');

      // Generate ZIP
      const zipBuffer = await step.run('generate-zip', async () => {
        const { generateExportZip } = await import('@/lib/export/generator');
        const zipBuffer = await generateExportZip({
          spec: ProductSpec.parse(version.spec),
          versionId: input.versionId,
          projectName: 'form-export',
        });

        return zipBuffer;
      });

      // Upload to Supabase Storage
      const storagePath = await step.run('upload-zip', async () => {
        const fileName = `export-${Date.now()}.zip`;
        const storagePath = `exports/${input.projectId}/${fileName}`;
        const uploadBody = Buffer.isBuffer(zipBuffer)
          ? zipBuffer
          : Buffer.from((zipBuffer as { data?: number[] }).data || []);

        const { error } = await supabase.storage
          .from('exports')
          .upload(storagePath, uploadBody, {
            contentType: 'application/zip',
            upsert: true,
          });

        if (error) throw error;

        return storagePath;
      });

      // Create export record
      const { data: exportRecord } = await supabase
        .from('exports')
        .insert({
          project_id: input.projectId,
          version_id: input.versionId,
          storage_path: storagePath,
          checksum: '',
          status: 'completed',
        })
        .select()
        .single();

      await updateJobStatus(supabase as any, jobId, {
        status: 'succeeded',
        stage: 'completed',
        result_id: exportRecord.id,
        finished_at: new Date().toISOString(),
      });

      return { jobId, exportId: exportRecord.id, downloadUrl: storagePath };
    } catch (error) {
      await updateJobStatus(supabase as any, jobId, {
        status: isFinalAttempt(attempt, maxAttempts) ? 'failed' : 'running',
        error_code: isFinalAttempt(attempt, maxAttempts) ? 'EXPORT_FAILED' : 'RETRYING',
        error_message: getFailureMessage(error),
        finished_at: new Date().toISOString(),
      });
      throw error;
    }
  }
);

// CANCEL JOB
export const cancelJob = inngest.createFunction(
  { id: 'cancel-job', triggers: [{ event: 'jobs/cancel.requested' }] },
  async ({ event }: any) => {
    const { jobId } = event.data;
    const supabase = await getJobSupabase();

    const { data: job, error } = await supabase.from('jobs').select('id, project_id').eq('id', jobId).single();
    const claimedJob = requireData(job, error, 'Job not found');
    await loadProject(supabase, claimedJob.project_id);
    const { error: updateError } = await supabase.from('jobs').update({ cancel_requested: true })
      .eq('id', jobId).eq('project_id', claimedJob.project_id).in('status', ['queued', 'running']);
    requireError(updateError);

return { cancelled: true };
  }
);
