import { expect, test, type APIRequestContext } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const sourceUrl = process.env.E2E_SOURCE_URL || 'https://linear.app';

test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run the real authenticated flow');

async function waitForJob(request: APIRequestContext, jobId: string) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const response = await request.get(`/api/jobs/${jobId}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const job = body.data;
    if (['succeeded', 'failed', 'cancelled'].includes(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Job ${jobId} did not finish within six minutes`);
}

async function waitForProjectJob(request: APIRequestContext, projectId: string, kind: string, after: string) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const response = await request.get(`/api/projects/${projectId}`);
    expect(response.ok()).toBeTruthy();
    const jobs = (await response.json()).data.recentJobs as { id: string; kind: string; created_at?: string }[];
    const job = jobs.find((candidate) => candidate.kind === kind && (!candidate.created_at || candidate.created_at >= after));
    if (job) return waitForJob(request, job.id);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Project ${projectId} did not enqueue a ${kind} job within six minutes`);
}

test('authenticated product generation completes capture through export', async ({ page, request }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/app/);

  const projectResponse = await request.post('/api/projects', {
    data: {
      name: `E2E ${Date.now()}`,
      url: sourceUrl,
      description: 'A real end-to-end product generation verification project for the FORM workflow.',
      targetCustomer: 'Independent consultants and small delivery teams',
    },
  });
  expect(projectResponse.status()).toBe(201);
  const project = (await projectResponse.json()).data;

  const analysisResponse = await request.post(`/api/projects/${project.id}/analyze`, {
    data: { idempotencyKey: crypto.randomUUID() },
  });
  expect(analysisResponse.status()).toBe(202);
  const analysisJob = await waitForJob(request, (await analysisResponse.json()).data.jobId);
  expect(analysisJob.status, analysisJob.error_message).toBe('succeeded');
  expect(analysisJob.result_id).toBeTruthy();

  const buildJob = await waitForProjectJob(request, project.id, 'build', analysisJob.finished_at || new Date().toISOString());
  expect(buildJob.status, buildJob.error_message).toBe('succeeded');
  expect(buildJob.result_id).toBeTruthy();

  const versionResponse = await request.get(`/api/projects/${project.id}/versions/${buildJob.result_id}`);
  expect(versionResponse.ok()).toBeTruthy();
  const version = (await versionResponse.json()).data;
  expect(version.engine).toBe('code-artifact-v3');
  expect(version.artifact_manifest).toBeTruthy();

  const preview = await request.get(`/api/projects/${project.id}/versions/${buildJob.result_id}/preview/`);
  expect(preview.ok()).toBeTruthy();
  expect(await preview.text()).toContain('id="root"');

  const qaResponse = await request.post(`/api/projects/${project.id}/qa`, { data: { versionId: buildJob.result_id } });
  expect(qaResponse.status()).toBe(202);
  const qaJob = await waitForJob(request, (await qaResponse.json()).data.jobId);
  expect(qaJob.status, qaJob.error_message).toBe('succeeded');

  const exportResponse = await request.post(`/api/projects/${project.id}/export`, { data: { versionId: buildJob.result_id } });
  expect(exportResponse.status()).toBe(202);
  const exportJob = await waitForJob(request, (await exportResponse.json()).data.jobId);
  expect(exportJob.status, exportJob.error_message).toBe('succeeded');
});
