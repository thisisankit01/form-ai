import { randomUUID } from 'node:crypto';
import { generateDesignPlan, generateCodeOperations, generateProductIntent } from './pipeline';
import { applyArtifactOperations, createCodeArtifact, sha256 } from './artifact';
import { AssetManifest, EvidenceBundle, type CodeArtifact, type EvidenceBundle as EvidenceBundleValue, type AssetManifest as AssetManifestValue } from './contracts';

export interface V3BuildInput {
  projectId: string;
  goal: string;
  audience: string;
  evidence: EvidenceBundleValue;
  baseFiles: Array<{ path: string; content: string }>;
  dependencyLockHash: string;
  sourceHash: string;
}

export interface V3BuildResult {
  artifact: CodeArtifact;
  intent: Awaited<ReturnType<typeof generateProductIntent>>;
  designPlan: Awaited<ReturnType<typeof generateDesignPlan>>;
  assetManifest: AssetManifestValue;
  designPlanId: string;
  assetManifestId: string;
}

export function assetSourceForPermission(permission: EvidenceBundleValue['assetCandidates'][number]['permission']): 'user-upload' | 'bundled' | 'approved-provider' | 'code-native' {
  if (permission === 'user-provided') return 'user-upload';
  if (permission === 'bundled') return 'bundled';
  if (permission === 'approved-provider') return 'approved-provider';
  return 'code-native';
}

export async function buildV3Artifact(input: V3BuildInput): Promise<V3BuildResult> {
  const evidence = EvidenceBundle.parse(input.evidence);
  const aiEvidence: EvidenceBundleValue = {
    ...evidence,
    normalizedText: evidence.normalizedText.slice(0, 6_000),
    claims: evidence.claims.slice(0, 12),
    desktopScreenshots: evidence.desktopScreenshots.slice(0, 2),
    mobileScreenshots: evidence.mobileScreenshots.slice(0, 2),
    assetCandidates: evidence.assetCandidates.slice(0, 12),
    sectionRoles: evidence.sectionRoles.slice(0, 20),
    limitations: evidence.limitations.slice(0, 8),
  };
  const intent = await generateProductIntent({ evidence: aiEvidence, goal: input.goal, audience: input.audience });
  const designPlan = await generateDesignPlan({ evidence: aiEvidence, intent });
  const operations = await generateCodeOperations({
    plan: designPlan,
    intent,
    baseFileIndex: input.baseFiles.map((file) => ({ path: file.path, sha256: sha256(file.content) })),
  });
  const files = applyArtifactOperations(input.baseFiles, operations.operations);
  const assetManifest = AssetManifest.parse({
    schemaVersion: 3,
    assets: evidence.assetCandidates.map((asset) => ({
      id: asset.id,
      slotId: asset.id,
      source: assetSourceForPermission(asset.permission),
      url: asset.permission === 'unknown' ? null : asset.url,
      path: null,
      width: asset.width,
      height: asset.height,
      alt: asset.alt,
      focalPoint: null,
      provenance: asset.sourceUrl,
      fallback: 'Use a code-native visual and preserve the slot dimensions.',
    })),
  });
  const designPlanId = randomUUID();
  const assetManifestId = randomUUID();
  const artifact = createCodeArtifact({
    projectId: input.projectId,
    parentArtifactId: null,
    designPlanId,
    assetManifestId,
    templateVersion: process.env.E2B_TEMPLATE || 'trusted-vite-starter-required',
    dependencyLockHash: input.dependencyLockHash,
    sourceHash: input.sourceHash,
    routes: designPlan.pages.map((page) => ({ path: page.path, title: page.title })),
    capabilities: intent.capabilities.map(({ id, mode }) => ({ id, mode })),
    files,
  });
  return { artifact, intent, designPlan, assetManifest, designPlanId, assetManifestId };
}
