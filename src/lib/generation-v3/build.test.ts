import { describe, expect, it, vi } from 'vitest';
import { assetSourceForPermission, buildV3Artifact } from './build';

vi.mock('./pipeline', () => ({
  generateProductIntent: vi.fn().mockRejectedValue(new Error('provider unavailable')),
  generateDesignPlan: vi.fn(),
  generateCodeOperations: vi.fn(),
}));

describe('generation v3 build boundary', () => {
  it('never treats unknown asset permission as approved-provider', () => {
    expect(assetSourceForPermission('unknown')).toBe('code-native');
  });

  it('does not silently create an artifact when the model provider is unavailable', async () => {
    await expect(buildV3Artifact({
      projectId: '00000000-0000-4000-8000-000000000001',
      goal: 'Build a consultancy enquiry frontend',
      audience: 'Homeowners planning a renovation',
      evidence: {
        schemaVersion: 1,
        sourceUrl: 'https://example.com',
        finalUrl: 'https://example.com',
        capturedAt: '2026-09-11T00:00:00.000Z',
        normalizedText: 'A distinctive lower-page service detail.',
        claims: [],
        desktopScreenshots: [],
        mobileScreenshots: [],
        assetCandidates: [],
        sectionRoles: [],
        limitations: [],
      },
      baseFiles: [{ path: 'src/App.tsx', content: 'export default function App() { return null; }' }],
      dependencyLockHash: 'a'.repeat(64),
      sourceHash: 'b'.repeat(64),
    })).rejects.toThrow();
  });
});
