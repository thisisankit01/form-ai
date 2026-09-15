import { describe, expect, it } from 'vitest';
import { DesignPlan, EvidenceBundle, validateArtifactPaths } from './contracts';

describe('generation v3 contracts', () => {
  it('requires bounded, typed evidence', () => {
    const result = EvidenceBundle.safeParse({
      schemaVersion: 1,
      sourceUrl: 'https://example.com',
      finalUrl: 'https://example.com/',
      capturedAt: '2026-09-11T00:00:00.000Z',
      normalizedText: 'Observed source copy',
      claims: [],
      desktopScreenshots: [],
      mobileScreenshots: [],
      assetCandidates: [],
      sectionRoles: [],
      limitations: [],
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid palette and unsafe generated paths', () => {
    expect(DesignPlan.shape.palette.safeParse({
      canvas: 'not-a-color', surface: '#ffffff', text: '#111111', secondary: '#555555',
      primary: '#000000', onPrimary: '#ffffff', border: '#dddddd',
    }).success).toBe(false);
    expect(validateArtifactPaths(['src/App.tsx', '../escape.ts', '/absolute.ts', 'src\\link.ts'])).toEqual([
      '../escape.ts', '/absolute.ts', 'src\\link.ts',
    ]);
  });
});
