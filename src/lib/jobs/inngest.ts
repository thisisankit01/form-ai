/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from './client';
import { createAdminClient } from '@/lib/supabase/admin';
import { ProductSpec } from '@/lib/product/schema';
import { validateProductSpec } from '@/lib/qa/validate';
import type { BuildSourceContext } from '@/lib/ai/contracts';
import { getGenerationEngine } from '@/lib/generation-v3/config';
import { createEvidenceBundle, hashEvidence } from '@/lib/generation-v3/evidence';
import { buildV3Artifact } from '@/lib/generation-v3/build';
import { executeArtifact, assertSandboxConfigured } from '@/lib/generation-v3/sandbox';
import { sha256 } from '@/lib/generation-v3/artifact';
import { CodeArtifact } from '@/lib/generation-v3/contracts';
import { V3_STARTER_FILES, V3_STARTER_TEMPLATE_VERSION } from '@/lib/generation-v3/starter';

async function getJobSupabase() {
  return createAdminClient();
}

async function publishV3Version(supabase: any, input: {
  projectId: string;
  ownerId: string;
  spec: unknown;
  designPlan: unknown;
  assetManifest: unknown;
  artifact: any;
  designPlanId: string;
  assetManifestId: string;
  previewUrl: string;
  previewToken: string;
  sandboxId: string;
}) {
  const { data: latestVersion, error: latestError } = await supabase
    .from('product_versions')
    .select('version_number')
    .eq('project_id', input.projectId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  requireError(latestError);

  const { data: version, error: versionError } = await supabase
    .from('product_versions')
    .insert({
      project_id: input.projectId,
      version_number: (latestVersion?.version_number || 0) + 1,
      spec: input.spec,
      schema_version: 3,
      engine: 'code-artifact-v3',
      design_plan: input.designPlan,
      asset_manifest: input.assetManifest,
      artifact_manifest: input.artifact,
      design_plan_id: input.designPlanId,
      asset_manifest_id: input.assetManifestId,
      source_hash: input.artifact.sourceHash,
      build_hash: hashV3Build(input.artifact),
      dependency_lock_hash: input.artifact.dependencyLockHash,
      change_summary: ['Initial V3 code artifact'],
      created_by: input.ownerId,
    })
    .select('id')
    .single();
  const persistedVersion = requireData(version, versionError, 'V3 version could not be persisted');

  const { error: secretError } = await supabase.from('artifact_runtime_secrets').upsert({
    version_id: persistedVersion.id,
    preview_url: input.previewUrl,
    preview_token: input.previewToken,
    sandbox_id: input.sandboxId,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }, { onConflict: 'version_id' });
  requireError(secretError);

  const { error: projectError } = await supabase
    .from('projects')
    .update({ current_version_id: persistedVersion.id, status: 'built' })
    .eq('id', input.projectId)
    .eq('user_id', input.ownerId);
  requireError(projectError);
  return persistedVersion;
}

function getFailureMessage(error: unknown): string {
  const value = error as { name?: unknown; status?: unknown; statusCode?: unknown; message?: unknown; error?: unknown } | null;
  const raw = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : typeof value?.message === 'string'
        ? value.message
        : typeof value?.error === 'string'
          ? value.error
          : '';
  const status = value?.statusCode || value?.status;

  if (typeof raw === 'string' && /timeout|abort/i.test(raw)) return 'The AI provider took too long to respond. Please retry.';
  if (status === 429 || (typeof raw === 'string' && /rate limit|too many requests/i.test(raw))) {
    return 'The AI provider is temporarily rate-limited. Please retry shortly.';
  }
  if (value?.name === 'AI_APICallError' || /requestBodyValues|chat\/completions|apiKey|authorization/i.test(raw)) {
    return 'The AI provider could not complete this request. Please retry.';
  }
  if (raw.length > 240) return `${raw.slice(0, 237)}...`;
  return raw || 'The worker failed without a usable error message.';
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

function requireV3DependencyLockHash(): string {
  const value = process.env.V3_DEPENDENCY_LOCK_HASH;
  if (!value || !/^[a-f0-9]{64}$/.test(value)) throw new Error('V3_DEPENDENCY_LOCK_HASH must be a SHA-256 hash');
  return value;
}

export function hashV3Build(artifact: any): string {
  return sha256(JSON.stringify({
    files: artifact.files.map(({ path, content }: { path: string; content: string }) => ({ path, content })),
    routes: artifact.routes,
    capabilities: artifact.capabilities,
    sourceHash: artifact.sourceHash,
    dependencyLockHash: artifact.dependencyLockHash,
    templateVersion: artifact.templateVersion,
  }));
}

export function createBuildSourceContext(capture: any, screenshotUrl?: string | null): BuildSourceContext {
  const metadata = (capture?.metadata && typeof capture.metadata === 'object' ? capture.metadata : {}) as Record<string, unknown>;
  const fidelity = (metadata.fidelity && typeof metadata.fidelity === 'object' ? metadata.fidelity : null) as Record<string, unknown> | null;
  const assets = (fidelity?.assets && typeof fidelity.assets === 'object' ? fidelity.assets : {}) as { images?: unknown };
  const sourceImageUrls = Array.isArray(assets.images) ? assets.images.filter((url): url is string => typeof url === 'string') : [];
  const sectionOrder = Array.isArray(fidelity?.sectionOrder) ? fidelity.sectionOrder : [];
  const sourceEvidenceAvailable = Boolean(
    capture?.normalized_text || capture?.final_url || capture?.screenshot_path || fidelity?.dom || sourceImageUrls.length || sectionOrder.length,
  );

  return {
    sourceUrl: capture?.final_url || capture?.requested_url || null,
    screenshotUrl: screenshotUrl || (typeof capture?.screenshot_path === 'string' && /^https?:\/\//.test(capture.screenshot_path) ? capture.screenshot_path : null),
    screenshotPath: capture?.screenshot_path || null,
    sourceImageUrls,
    sectionOrder,
    fidelityMetadata: fidelity,
    screenshotContext: fidelity?.screenshot && typeof fidelity.screenshot === 'object' ? fidelity.screenshot as Record<string, unknown> : null,
    sourceEvidenceAvailable,
  };
}

function isGenericSourceFallback(spec: any): boolean {
  const sections = spec?.pages?.[0]?.sections;
  const legacyFallback = Array.isArray(sections)
    && sections.length === 2
    && sections[0]?.type === 'hero'
    && sections[1]?.type === 'feature-list'
    && sections[0]?.eyebrow === 'Built for modern teams'
    && sections[1]?.heading === 'Everything you need to move faster';
  const expandedFallback = spec?.uiDirection === 'Specific, source-informed interface with clear hierarchy, deliberate section rhythm, and human-facing labels.'
    && Array.isArray(sections)
    && sections.map((section: any) => section?.id).join(',') === 'hero,features,steps,about,faq,cta';
  return legacyFallback || expandedFallback;
}

async function stopIfCancelled(supabase: any, jobId: string, projectId: string): Promise<boolean> {
  const { data: job, error } = await supabase.from('jobs').select('status, cancel_requested').eq('id', jobId).eq('project_id', projectId).single();
  requireData(job, error, 'Job not found');
  if (!job?.cancel_requested && job?.status !== 'cancelled') return false;
  await updateJobStatus(supabase, jobId, { status: 'cancelled', stage: 'cancelled', finished_at: new Date().toISOString() });
  return true;
}

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
  const { data, error } = await supabase.from('projects').select('id, user_id, description, target_customer').eq('id', projectId).single();
  return requireData(data, error, 'Project not found');
}

async function queueAutomaticBuild(supabase: any, input: { projectId: string; ownerId: string; analysisId: string }) {
  const idempotencyKey = `analysis:${input.analysisId}:build`;
  const { data: existing, error: existingError } = await supabase.from('jobs')
    .select('id').eq('project_id', input.projectId).eq('kind', 'build').eq('idempotency_key', idempotencyKey).maybeSingle();
  requireError(existingError);
  if (existing) return existing.id;
  const { data: job, error } = await supabase.from('jobs').insert({
    project_id: input.projectId, owner_id: input.ownerId, kind: 'build', status: 'queued', stage: 'build',
    idempotency_key: idempotencyKey, request_payload: { projectId: input.projectId, analysisId: input.analysisId, automatic: true },
  }).select('id').single();
  if (error?.code === '23505') {
    const { data: duplicate, error: duplicateError } = await supabase.from('jobs').select('id').eq('project_id', input.projectId).eq('kind', 'build').eq('idempotency_key', idempotencyKey).single();
    return requireData(duplicate, duplicateError, 'Automatic build could not be queued').id;
  }
  return requireData(job, error, 'Automatic build could not be queued').id;
}

async function persistCapturedWebsite(
  supabase: any,
  projectId: string,
  input: { url?: string; pastedContent?: string },
  captureId: string,
): Promise<{ id: string }> {
  const captureResult = input.pastedContent
    ? await (async () => {
        const { captureFromPastedContent } = await import('@/lib/capture/firecrawl');
        return captureFromPastedContent(input.pastedContent || '', input.url || '');
      })()
    : await (async () => {
        const { captureWebsite } = await import('@/lib/capture/firecrawl');
        return captureWebsite(input.url || '');
      })();

  const { data: persistedCapture, error: captureError } = await supabase.from('source_captures').insert({
    id: captureId,
    project_id: projectId,
    kind: captureResult.kind,
    requested_url: captureResult.requestedUrl,
    final_url: captureResult.finalUrl,
    title: captureResult.title,
    normalized_text: captureResult.normalizedText,
    screenshot_path: captureResult.screenshotPath,
    captured_at: captureResult.capturedAt,
    metadata: { ...(captureResult.metadata || {}), fidelity: captureResult.fidelity || null },
  }).select('id').single();
  if (captureError && captureError.code !== '23505') throw captureError;
  const persistedId = persistedCapture?.id || captureId;

  const screenshots = captureResult.screenshotDataByViewport
    || (captureResult.screenshotData ? [{ viewport: 'desktop' as const, data: captureResult.screenshotData, width: 1440, height: 900 }] : []);
  const screenshotPaths: Record<string, string> = {};
  for (const screenshot of screenshots) {
    const screenshotPath = `captures/${projectId}/${persistedId}-${screenshot.viewport}.png`;
    const upload = await supabase.storage.from('form-assets').upload(
      screenshotPath,
      Buffer.from(screenshot.data, 'base64'),
      { contentType: 'image/png', upsert: true },
    );
    if (upload.error) throw upload.error;
    screenshotPaths[screenshot.viewport] = screenshotPath;
  }

  if (Object.keys(screenshotPaths).length === 0) return { id: persistedId };

  const desktopPath = screenshotPaths.desktop || Object.values(screenshotPaths)[0];
  const signed = await supabase.storage.from('form-assets').createSignedUrl(desktopPath, 3600);
  if (signed.error) throw signed.error;
  const { error: updateError } = await supabase.from('source_captures').update({
    screenshot_path: desktopPath,
    metadata: { ...(captureResult.metadata || {}), fidelity: captureResult.fidelity || null, screenshots: screenshotPaths },
  }).eq('id', persistedId).eq('project_id', projectId);
  requireError(updateError);

  return { id: persistedId };
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
        const persisted = await step.run('capture-pasted', () => persistCapturedWebsite(supabase, projectId, input, captureId));
        persistedCaptureId = persisted.id;
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
          const persisted = await step.run('capture-website', () => persistCapturedWebsite(supabase, projectId, input, captureId));
          persistedCaptureId = persisted.id;
        }
      }

      const { data: persistedCapture, error: persistedCaptureError } = await supabase.from('source_captures')
        .select('*').eq('id', persistedCaptureId).eq('project_id', projectId).single();
      captureResult = requireData(persistedCapture, persistedCaptureError, 'Persisted capture could not be loaded');
      if (captureResult.screenshot_path && !/^https?:\/\//.test(captureResult.screenshot_path)) {
        const signed = await supabase.storage.from('form-assets').createSignedUrl(captureResult.screenshot_path, 3600);
        if (!signed.error) captureResult.screenshot_path = signed.data?.signedUrl || captureResult.screenshot_path;
      }
      captureResult = {
        ...captureResult,
        normalized_text: captureResult.normalized_text ?? captureResult.normalizedText,
        screenshot_path: captureResult.screenshot_path ?? captureResult.screenshotPath,
        final_url: captureResult.final_url ?? captureResult.finalUrl,
        fidelity: captureResult.fidelity ?? captureResult.metadata?.fidelity ?? null,
      };
      await updateJobStep(supabase as any, jobId, 'capture', { status: 'succeeded', output_ref: persistedCaptureId });

      // Stage 2: Analysis Pipeline
      const analysis = await step.run('analysis-pipeline', async () => {
        if (await stopIfCancelled(supabase, jobId, projectId)) throw new Error('Job cancelled');
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
           onStage: async (stage, status) => {
             await updateJobStatus(supabase as any, jobId, { stage });
             await updateJobStep(supabase as any, jobId, stage, { status });
           },
         });

        return analysis;
      });

      // Store analysis
      const { data: analysisRecord, error: analysisError } = await supabase
        .from('analyses')
        .insert({
          project_id: input.projectId,
           capture_id: persistedCaptureId,
           source_url: captureResult.final_url,
           source_text: captureResult.normalized_text,
           screenshot_url: captureResult.screenshot_path,
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

       const automaticBuildJobId = await queueAutomaticBuild(supabase, { projectId: input.projectId, ownerId: project.user_id, analysisId: analysisRecord.id });
       await inngest.send({
         name: 'jobs/build.requested',
         data: { projectId: input.projectId, analysisId: analysisRecord.id, jobId: automaticBuildJobId, idempotencyKey: `analysis:${analysisRecord.id}:build` },
       });

       await updateJobStatus(supabase as any, jobId, {
        status: 'succeeded',
        stage: 'completed',
         result_id: analysisRecord.id,
        finished_at: new Date().toISOString(),
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

      const { data: sourceCapture, error: sourceCaptureError } = await supabase
        .from('source_captures')
        .select('*')
        .eq('id', analysis.capture_id)
        .eq('project_id', input.projectId)
        .maybeSingle();
      requireError(sourceCaptureError);
      let sourceScreenshotUrl: string | null = null;
      if (sourceCapture?.screenshot_path) {
        if (/^https?:\/\//.test(sourceCapture.screenshot_path)) {
          sourceScreenshotUrl = sourceCapture.screenshot_path;
        } else {
          const signed = await supabase.storage.from('form-assets').createSignedUrl(sourceCapture.screenshot_path, 3600);
          if (signed.error) throw signed.error;
          sourceScreenshotUrl = signed.data?.signedUrl || null;
        }
      }
      const sourceContext = createBuildSourceContext(sourceCapture, sourceScreenshotUrl);

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

       if (getGenerationEngine() === 'code-artifact-v3') {
         await updateJobStatus(supabase as any, jobId, { stage: 'v3-artifact' });
         await updateJobStep(supabase as any, jobId, 'v3-artifact', { status: 'running' });
         assertSandboxConfigured();
         if (process.env.E2B_TEMPLATE !== V3_STARTER_TEMPLATE_VERSION) {
           throw new Error(`E2B_TEMPLATE must be qualified for ${V3_STARTER_TEMPLATE_VERSION}`);
         }
         const v3Result = await step.run('build-v3-artifact', async () => {
           const evidence = createEvidenceBundle({
             capture: sourceCapture || {},
             goal: project?.description || '',
             audience: projectOwner.target_customer || '',
           });
           const built = await buildV3Artifact({
             projectId: input.projectId,
             goal: project?.description || '',
             audience: projectOwner.target_customer || '',
             evidence,
             baseFiles: V3_STARTER_FILES,
             dependencyLockHash: requireV3DependencyLockHash(),
             sourceHash: hashEvidence(evidence),
           });
            return {
              artifact: built.artifact,
              designPlan: built.designPlan,
              assetManifest: built.assetManifest,
              designPlanId: built.designPlanId,
              assetManifestId: built.assetManifestId,
            };
          });
          let sandbox: Awaited<ReturnType<typeof executeArtifact>> | null = null;
          let published = false;
          try {
            // Keep the token in process memory only. The durable step result above is sanitized.
            sandbox = await executeArtifact(v3Result.artifact);
            const persistedVersion = await publishV3Version(supabase, {
              projectId: input.projectId,
              ownerId: projectOwner.user_id,
              spec: { schemaVersion: 3, engine: 'code-artifact-v3', artifactId: v3Result.artifact.id },
              designPlan: v3Result.designPlan,
              assetManifest: v3Result.assetManifest,
              artifact: v3Result.artifact,
              designPlanId: v3Result.designPlanId,
              assetManifestId: v3Result.assetManifestId,
              previewUrl: sandbox.previewUrl,
              previewToken: sandbox.trafficAccessToken,
              sandboxId: sandbox.sandboxId,
            });
            published = true;
            await updateJobStep(supabase as any, jobId, 'v3-artifact', { status: 'succeeded', output_ref: persistedVersion.id });
            await updateJobStatus(supabase as any, jobId, { status: 'succeeded', stage: 'completed', result_id: persistedVersion.id, finished_at: new Date().toISOString() });
            return { jobId, versionId: persistedVersion.id, engine: 'code-artifact-v3' };
          } finally {
            // A successful preview owns its sandbox until E2B's bounded TTL. Every other path cleans it up.
            if (sandbox && !published) await sandbox.kill().catch(() => undefined);
          }
       }

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
            sourceContext,
          });
         if (sourceContext.sourceEvidenceAvailable && isGenericSourceFallback(spec)) {
           throw new Error('Build returned a generic fallback despite available source evidence');
         }
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
        preset: spec.theme.preset,
        accent: spec.theme.accent,
        density: spec.theme.density,
        radius: spec.theme.radius,
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
       const { data: version } = await supabase.from('product_versions').select('spec, engine, artifact_manifest').eq('id', input.versionId).eq('project_id', input.projectId).single();
       if (!version) throw new Error('Version not found');
       if (version.engine === 'code-artifact-v3') {
         const artifact = CodeArtifact.safeParse(version.artifact_manifest);
         const artifactIssues = artifact.success
           ? artifact.data.files.filter((file) => sha256(file.content) !== file.sha256).map((file) => ({ check: 'schema' as const, code: 'artifact-file-hash', severity: 'error' as const, message: `Artifact file hash mismatch: ${file.path}`, suggestedFix: 'Regenerate this artifact.' }))
           : [{ check: 'schema' as const, code: 'artifact-invalid', severity: 'error' as const, message: 'V3 artifact metadata is invalid.', suggestedFix: 'Regenerate this artifact.' }];
         const deterministic = { valid: artifact.success && artifactIssues.length === 0, issues: artifactIssues, checkedSections: 0, checkedActions: 0 };
         const { data: runtimeSecret } = await supabase.from('artifact_runtime_secrets').select('preview_url, preview_token').eq('version_id', input.versionId).single();
         const rendered = await step.run('qa-artifact-rendered', async () => {
           const { runRenderedQA } = await import('@/lib/qa/render');
           if (!runtimeSecret?.preview_url || !runtimeSecret.preview_token || !artifact.success) {
             return { issues: [{ check: 'rendered' as const, code: 'preview-unavailable', severity: 'error' as const, message: 'V3 artifact preview is unavailable; E2B execution did not provide a preview URL and access token.', suggestedFix: 'Configure E2B and rebuild the artifact.' }], viewports: [], checkedRoutes: [] };
           }
           return runRenderedQA({ previewUrl: runtimeSecret.preview_url, previewToken: runtimeSecret.preview_token, routes: artifact.data.routes });
         });
         const checks = [
           { name: 'V3 artifact metadata and file hashes', passed: deterministic.valid },
           { name: 'Rendered desktop/tablet/mobile artifact preview', passed: rendered.issues.length === 0 && rendered.viewports.length > 0 && artifact.success && rendered.checkedRoutes?.length === artifact.data.routes.length },
         ];
         const issues = [...deterministic.issues, ...rendered.issues];
         const passed = checks.every((check) => check.passed);
         const { data: report, error: reportError } = await supabase.from('qa_reports').insert({ project_id: input.projectId, version_id: input.versionId, checks, ai_findings: issues, screenshot_paths: [], status: passed ? 'passed' : 'failed' }).select().single();
         if (reportError || !report) throw reportError || new Error('QA report could not be saved');
         await updateJobStatus(supabase as any, job.id, { status: 'succeeded', stage: 'completed', result_id: report.id, finished_at: new Date().toISOString() });
         return { jobId: job.id, reportId: report.id, passed };
       }
       const parsed = ProductSpec.safeParse(version.spec);
      const validationIssues = parsed.success ? [] : parsed.error.issues.map((issue) => ({ check: 'schema', code: 'schema-invalid', severity: 'error' as const, message: `${issue.path.join('.') || 'spec'}: ${issue.message}`, suggestedFix: 'Regenerate this version.' }));
      const deterministic = parsed.success ? validateProductSpec(parsed.data) : { valid: false, issues: validationIssues, checkedSections: 0, checkedActions: 0 };
      const rendered = parsed.success && deterministic.valid ? await step.run('qa-rendered', async () => {
        const { runRenderedQA } = await import('@/lib/qa/render');
        return runRenderedQA(parsed.data);
      }) : { issues: [], viewports: [] };
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
        .select('spec, version_number, engine, artifact_manifest')
        .eq('id', input.versionId)
        .eq('project_id', input.projectId)
        .single();

      if (!version) throw new Error('Version not found');

      // Generate ZIP
       const zipBuffer = await step.run('generate-zip', async () => {
          const { calculateZipChecksum, generateExportZip, generateArtifactExportZip } = await import('@/lib/export/generator');
         const zipBuffer = version.engine === 'code-artifact-v3'
           ? await generateArtifactExportZip(version.artifact_manifest)
           : await generateExportZip({
             spec: ProductSpec.parse(version.spec),
             versionId: input.versionId,
             projectName: 'form-export',
           });

         return { buffer: zipBuffer, checksum: calculateZipChecksum(zipBuffer) };
       });

      // Upload to Supabase Storage
      const storagePath = await step.run('upload-zip', async () => {
        const fileName = `export-${Date.now()}.zip`;
        const storagePath = `exports/${input.projectId}/${fileName}`;
         const uploadBody = Buffer.isBuffer(zipBuffer.buffer)
           ? zipBuffer.buffer
           : Buffer.from((zipBuffer.buffer as { data?: number[] }).data || []);

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
           checksum: zipBuffer.checksum,
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
