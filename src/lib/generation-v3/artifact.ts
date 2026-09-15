import { createHash, randomUUID } from 'node:crypto';
import { CodeArtifact, validateArtifactPaths, type CodeArtifact as CodeArtifactValue } from './contracts';

export const MAX_ARTIFACT_FILES = 30;
export const MAX_ARTIFACT_SOURCE_BYTES = 300_000;
export const TRUSTED_STARTER_FILES = new Set([
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'src/main.tsx',
]);

const GENERATED_PATH = /^(?:src|public)\/(?:[^/]+\/)*[^/]+\.(?:css|html|js|jsx|json|ts|tsx)$/;

export function isAllowedArtifactPath(path: string): boolean {
  return TRUSTED_STARTER_FILES.has(path) || GENERATED_PATH.test(path);
}

export type ArtifactFileOperation =
  | { kind: 'add' | 'update'; path: string; content: string; expectedSha256?: string }
  | { kind: 'delete'; path: string; expectedSha256: string };

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function applyArtifactOperations(
  files: Array<{ path: string; content: string }>,
  operations: ArtifactFileOperation[],
): Array<{ path: string; content: string }> {
  const next = new Map(files.map((file) => [file.path, file.content]));
  for (const operation of operations) {
    const pathErrors = validateArtifactPaths([operation.path]);
    if (pathErrors.length > 0) throw new Error(`Unsafe artifact path: ${operation.path}`);
    if (!isAllowedArtifactPath(operation.path)) throw new Error(`Disallowed artifact path: ${operation.path}`);
    const current = next.get(operation.path);
    if (TRUSTED_STARTER_FILES.has(operation.path)) {
      throw new Error(`Trusted starter file cannot be modified: ${operation.path}`);
    }
    if (operation.kind === 'delete') {
      if (current === undefined || sha256(current) !== operation.expectedSha256) {
        throw new Error(`Stale artifact file: ${operation.path}`);
      }
      next.delete(operation.path);
      continue;
    }
    if (operation.kind === 'add' && current !== undefined) {
      throw new Error(`Artifact file already exists: ${operation.path}`);
    }
    if (operation.kind === 'update' && current === undefined) {
      throw new Error(`Artifact file does not exist: ${operation.path}`);
    }
    if (operation.expectedSha256 !== undefined && (current === undefined || sha256(current) !== operation.expectedSha256)) {
      throw new Error(`Stale artifact file: ${operation.path}`);
    }
    next.set(operation.path, operation.content);
  }
  return [...next.entries()].map(([path, content]) => ({ path, content }));
}

export function createCodeArtifact(input: {
  projectId: string;
  parentArtifactId?: string | null;
  designPlanId: string;
  assetManifestId: string;
  templateVersion: string;
  dependencyLockHash: string;
  sourceHash: string;
  routes: Array<{ path: string; title: string }>;
  capabilities: Array<{ id: string; mode: 'local' | 'connected' | 'unavailable' }>;
  files: Array<{ path: string; content: string }>;
}): CodeArtifactValue {
  if (input.files.length > MAX_ARTIFACT_FILES) throw new Error('Artifact exceeds file limit');
  const invalidPaths = input.files.filter((file) => validateArtifactPaths([file.path]).length > 0 || !isAllowedArtifactPath(file.path)).map((file) => file.path);
  if (invalidPaths.length > 0) throw new Error(`Unsafe artifact paths: ${invalidPaths.join(', ')}`);
  const totalBytes = input.files.reduce((sum, file) => sum + Buffer.byteLength(file.content, 'utf8'), 0);
  if (totalBytes > MAX_ARTIFACT_SOURCE_BYTES) throw new Error('Artifact exceeds source size limit');

  return CodeArtifact.parse({
    schemaVersion: 3,
    id: randomUUID(),
    projectId: input.projectId,
    parentArtifactId: input.parentArtifactId || null,
    designPlanId: input.designPlanId,
    templateVersion: input.templateVersion,
    dependencyLockHash: input.dependencyLockHash,
    files: input.files.map((file) => ({ ...file, sha256: sha256(file.content) })),
    assetManifestId: input.assetManifestId,
    routes: input.routes,
    capabilities: input.capabilities,
    sourceHash: input.sourceHash,
  });
}
