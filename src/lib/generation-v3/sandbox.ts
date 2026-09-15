import { Sandbox } from 'e2b';
import type { CodeArtifact } from './contracts';
import { MAX_ARTIFACT_FILES, MAX_ARTIFACT_SOURCE_BYTES } from './artifact';
import { validateArtifactPaths } from './contracts';

const SANDBOX_ROOT = '/app';
const BUILD_TIMEOUT_MS = 5 * 60_000;
export const PREVIEW_TTL_MS = 30 * 60_000;

export interface ArtifactSandbox {
  sandboxId: string;
  previewUrl: string;
  trafficAccessToken: string;
  kill(): Promise<void>;
}

export function isBuildOutputFailure(output: string): boolean {
  return output.includes('error TS') || /(?:^|\n)(?:error|failed)\b/i.test(output);
}

export function assertSandboxConfigured(): void {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) throw new Error('E2B_API_KEY is required for V3 artifact execution');
  const template = process.env.E2B_TEMPLATE;
  if (!template) throw new Error('E2B_TEMPLATE is required for V3 artifact execution');
}

function requireSandboxConfig(): { apiKey: string; template: string } {
  assertSandboxConfigured();
  const apiKey = process.env.E2B_API_KEY as string;
  const template = process.env.E2B_TEMPLATE as string;
  return { apiKey, template };
}

function assertArtifactForExecution(artifact: CodeArtifact): void {
  if (artifact.files.length > MAX_ARTIFACT_FILES) throw new Error('Artifact exceeds file limit');
  const invalidPaths = validateArtifactPaths(artifact.files.map((file) => file.path));
  if (invalidPaths.length > 0) throw new Error(`Unsafe artifact paths: ${invalidPaths.join(', ')}`);
  const bytes = artifact.files.reduce((total, file) => total + Buffer.byteLength(file.content, 'utf8'), 0);
  if (bytes > MAX_ARTIFACT_SOURCE_BYTES) throw new Error('Artifact exceeds source size limit');
  if (artifact.files.some((file) => file.path === 'package.json' || file.path === 'package-lock.json')) {
    throw new Error('Generated artifacts cannot replace the trusted package manifests');
  }
}

export async function executeArtifact(artifact: CodeArtifact): Promise<ArtifactSandbox> {
  const { apiKey, template } = requireSandboxConfig();
  assertArtifactForExecution(artifact);
  const sandbox = await Sandbox.create(template, { apiKey, timeoutMs: PREVIEW_TTL_MS, network: { allowPublicTraffic: false } });

  try {
    await sandbox.files.write([...artifact.files.map((file) => ({
      path: `${SANDBOX_ROOT}/${file.path}`,
      data: file.content,
    })), {
      path: `${SANDBOX_ROOT}/.form-vite.config.ts`,
      data: "import { defineConfig } from 'vite';\nexport default defineConfig({ preview: { allowedHosts: ['.e2b.app'] } });\n",
    }]);
    const build = await sandbox.commands.run('({ npm ci && npm run build; } > /tmp/form-build.log 2>&1; code=$?; cat /tmp/form-build.log; exit 0)', {
      cwd: SANDBOX_ROOT,
      timeoutMs: BUILD_TIMEOUT_MS,
    });
    if (isBuildOutputFailure(build.stdout)) {
      throw new Error(`Artifact build failed:\n${build.stdout.slice(-8_000)}`);
    }

    await sandbox.commands.run('npm run preview -- --config /app/.form-vite.config.ts --host 0.0.0.0 --port 4173', {
      cwd: SANDBOX_ROOT,
      background: true,
      timeoutMs: 0,
    });
    const trafficAccessToken = sandbox.trafficAccessToken;
    if (!trafficAccessToken) throw new Error('E2B did not return a preview access token');
    const previewUrl = `https://${sandbox.getHost(4173)}`;
    let previewReady = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(previewUrl, { headers: { 'e2b-traffic-access-token': trafficAccessToken } }).catch(() => null);
      if (response?.ok) {
        previewReady = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    if (!previewReady) throw new Error('Artifact preview did not become available');
    return {
      sandboxId: sandbox.sandboxId,
      previewUrl,
      trafficAccessToken,
      kill: async () => { await sandbox.kill(); },
    };
  } catch (error) {
    await sandbox.kill().catch(() => undefined);
    throw error;
  }
}
