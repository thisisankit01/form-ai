import { z } from 'zod';

const boundedUrl = z.string().url().max(2048);
const hash = z.string().regex(/^[a-f0-9]{64}$/);

export const EvidenceBundle = z.object({
  schemaVersion: z.literal(1),
  sourceUrl: boundedUrl,
  finalUrl: boundedUrl.nullable(),
  capturedAt: z.string().datetime(),
  normalizedText: z.string().max(24000),
  claims: z.array(z.object({
    id: z.string().min(1).max(80),
    text: z.string().min(1).max(800),
    status: z.enum(['observed', 'inferred', 'unknown']),
    sourceUrl: boundedUrl,
    excerpt: z.string().max(500),
  })).max(80),
  desktopScreenshots: z.array(z.object({
    id: z.string().min(1).max(80),
    url: boundedUrl,
    width: z.number().int().positive().max(2400),
    height: z.number().int().positive().max(10000),
    kind: z.enum(['viewport', 'full-page', 'crop']),
    coveredRegion: z.string().max(160),
  })).max(6),
  mobileScreenshots: z.array(z.object({
    id: z.string().min(1).max(80),
    url: boundedUrl,
    width: z.number().int().positive().max(1200),
    height: z.number().int().positive().max(10000),
    kind: z.enum(['viewport', 'full-page', 'crop']),
    coveredRegion: z.string().max(160),
  })).max(6),
  assetCandidates: z.array(z.object({
    id: z.string().min(1).max(80),
    url: boundedUrl,
    alt: z.string().max(160),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    sourceUrl: boundedUrl,
    permission: z.enum(['unknown', 'user-provided', 'bundled', 'approved-provider']),
  })).max(40),
  sectionRoles: z.array(z.object({
    id: z.string().min(1).max(80),
    role: z.string().min(1).max(100),
    heading: z.string().max(160).nullable(),
    order: z.number().int().nonnegative(),
  })).max(80),
  limitations: z.array(z.string().max(300)).max(30),
});
export type EvidenceBundle = z.infer<typeof EvidenceBundle>;

const journey = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  steps: z.array(z.string().min(1).max(240)).min(1).max(8),
  successCondition: z.string().min(1).max(300),
});

export const ProductIntent = z.object({
  schemaVersion: z.literal(3),
  audience: z.string().min(3).max(240),
  jobToBeDone: z.string().min(3).max(400),
  primaryAction: z.string().min(2).max(160),
  family: z.enum(['service', 'saas', 'commerce', 'editorial', 'operations']),
  keyJourneys: z.array(journey).min(1).max(3),
  capabilities: z.array(z.object({
    id: z.string().min(1).max(80),
    mode: z.enum(['local', 'connected', 'unavailable']),
    explanation: z.string().min(1).max(300),
  })).max(20),
  sourceFactsUsed: z.array(z.string().min(1).max(120)).max(30),
  intentionalDifferences: z.array(z.string().min(1).max(240)).max(20),
});
export type ProductIntent = z.infer<typeof ProductIntent>;

export const DesignPlan = z.object({
  schemaVersion: z.literal(3),
  conceptName: z.string().min(2).max(80),
  rationale: z.string().min(1).max(600),
  typography: z.object({ displayFamily: z.string().max(80), bodyFamily: z.string().max(80), scale: z.string().max(120) }),
  palette: z.object({
    canvas: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    surface: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    onPrimary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    border: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  composition: z.object({ navigation: z.string().max(160), hero: z.string().max(160), contentRhythm: z.string().max(160), imageTreatment: z.string().max(160), density: z.string().max(80) }),
  pages: z.array(z.object({
    id: z.string().min(1).max(80),
    path: z.string().startsWith('/').max(120),
    title: z.string().min(1).max(120),
    purpose: z.string().min(1).max(300),
    sections: z.array(z.object({
      id: z.string().min(1).max(80),
      purpose: z.string().min(1).max(240),
      composition: z.string().min(1).max(160),
      contentRequirements: z.array(z.string().max(200)).max(12),
      assetSlots: z.array(z.string().max(80)).max(8),
      interactionIds: z.array(z.string().max(80)).max(8),
    })).min(1).max(10),
    mobileBehavior: z.array(z.string().max(160)).max(12),
  })).min(1).max(5),
  journeys: z.array(z.object({ id: z.string().max(80), route: z.string().startsWith('/').max(120), steps: z.array(z.string().max(240)).min(1).max(8), expectedResult: z.string().max(300) })).max(3),
  assetSlots: z.array(z.object({ id: z.string().max(80), purpose: z.string().max(160), query: z.string().max(240), ratio: z.string().max(40), subjectPlacement: z.string().max(120), fallback: z.string().max(160) })).max(30),
  unsupportedPromises: z.array(z.string().max(240)).max(30),
});
export type DesignPlan = z.infer<typeof DesignPlan>;

export const AssetManifest = z.object({
  schemaVersion: z.literal(3),
  assets: z.array(z.object({
    id: z.string().max(80),
    slotId: z.string().max(80),
    source: z.enum(['user-upload', 'bundled', 'approved-provider', 'code-native']),
    url: boundedUrl.nullable(),
    path: z.string().max(300).nullable(),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    alt: z.string().max(160),
    focalPoint: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).nullable(),
    provenance: z.string().max(300),
    fallback: z.string().max(160),
  })).max(40),
});
export type AssetManifest = z.infer<typeof AssetManifest>;

export const CodeArtifact = z.object({
  schemaVersion: z.literal(3),
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  parentArtifactId: z.string().uuid().nullable(),
  designPlanId: z.string().uuid(),
  templateVersion: z.string().min(1).max(80),
  dependencyLockHash: hash,
  files: z.array(z.object({ path: z.string().min(1).max(240), content: z.string().max(300_000), sha256: hash })).max(300),
  assetManifestId: z.string().uuid(),
  routes: z.array(z.object({ path: z.string().startsWith('/').max(120), title: z.string().max(120) })).max(20),
  capabilities: z.array(z.object({ id: z.string().max(80), mode: z.enum(['local', 'connected', 'unavailable']) })).max(20),
  sourceHash: hash,
});
export type CodeArtifact = z.infer<typeof CodeArtifact>;

export const CodeFileOperations = z.object({
  schemaVersion: z.literal(3),
  operations: z.array(z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('add'), path: z.string().min(1).max(240), content: z.string().max(300_000), expectedSha256: z.undefined().optional() }),
    z.object({ kind: z.literal('update'), path: z.string().min(1).max(240), content: z.string().max(300_000), expectedSha256: hash }),
    z.object({ kind: z.literal('delete'), path: z.string().min(1).max(240), expectedSha256: hash }),
  ])).max(60),
  journeyMappings: z.array(z.object({ journeyId: z.string().max(80), routes: z.array(z.string().startsWith('/').max(120)).max(10), primaryActions: z.array(z.string().max(80)).max(10) })).max(3),
  summary: z.array(z.string().max(240)).max(12),
});
export type CodeFileOperations = z.infer<typeof CodeFileOperations>;

export const CapabilityRegistry = z.object({
  search: z.enum(['local', 'connected', 'unavailable']),
  cart: z.enum(['local', 'connected', 'unavailable']),
  enquiry: z.enum(['local', 'connected', 'unavailable']),
  booking: z.enum(['local', 'connected', 'unavailable']),
  dashboardEdits: z.enum(['local', 'connected', 'unavailable']),
  newsletter: z.enum(['local', 'connected', 'unavailable']),
  auth: z.enum(['local', 'connected', 'unavailable']),
});
export type CapabilityRegistry = z.infer<typeof CapabilityRegistry>;

export function validateArtifactPaths(paths: string[]): string[] {
  return paths.filter((path) => (
    !path || path.startsWith('/') || path.includes('..') || path.includes('\\') || path.includes('\0') || /[\x00-\x1f]/.test(path)
  ));
}
