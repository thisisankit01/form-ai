import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { calculateZipChecksum, generateArtifactExportZip, generateExportZip, InvalidExportZipError, validateExportZip } from './generator';
import { createCodeArtifact } from '../generation-v3/artifact';

const spec = {
  schemaVersion: 1 as const,
  name: 'Test Product',
  description: 'A sufficiently long product description for the generated test fixture.',
  audience: 'Developers',
  positioning: 'A focused product prototype.',
  features: [],
  theme: { preset: 'editorial-light' as const, accent: 'lime' as const, density: 'comfortable' as const, radius: 'soft' as const },
  navigation: [],
  pages: [{
    id: 'home', slug: '/', title: 'Home', kind: 'landing' as const,
    sections: [{
      type: 'hero' as const, id: 'hero', eyebrow: 'Test', headline: 'Hello', body: 'A test body.',
      primaryAction: { kind: 'demo-dialog' as const, label: 'Open', dialogTitle: 'Demo', dialogBody: 'Demo body' },
      composition: 'centered' as const,
    }],
  }],
  uiDirection: 'Clear and focused.',
};

describe('export archive', () => {
  it('emits a ZIP with the required build contract', async () => {
    const buffer = await generateExportZip({ spec, versionId: '00000000-0000-4000-8000-000000000000', projectName: 'Test Product' });
    await expect(validateExportZip(buffer)).resolves.toBeUndefined();
  });

  it('rejects archives with traversal paths', async () => {
    const zip = new JSZip();
    zip.file('../outside.txt', 'unsafe');
    await expect(validateExportZip(await zip.generateAsync({ type: 'nodebuffer' })))
      .rejects.toBeInstanceOf(InvalidExportZipError);
  });

  it('exports V3 artifact files without routing them through ProductSpec', async () => {
    const artifact = createCodeArtifact({
      projectId: '00000000-0000-4000-8000-000000000001',
      designPlanId: '00000000-0000-4000-8000-000000000002',
      assetManifestId: '00000000-0000-4000-8000-000000000003',
      templateVersion: 'form-v3-vite-starter-1',
      dependencyLockHash: 'a'.repeat(64),
      sourceHash: 'b'.repeat(64),
      routes: [{ path: '/', title: 'Home' }],
      capabilities: [],
      files: [{ path: 'src/App.tsx', content: 'export default function App() { return null; }' }],
    });
    const zip = await JSZip.loadAsync(await generateArtifactExportZip(artifact));
    await expect(zip.file('src/App.tsx')?.async('string')).resolves.toContain('return null');
    const metadata = JSON.parse(await zip.file('FORM_ARTIFACT_METADATA.json')!.async('string')) as { dependencyLockHash: string; trustedConfig: string[]; lockfile: { sha256: string } };
    expect(metadata.dependencyLockHash).toBe('a'.repeat(64));
    expect(metadata.trustedConfig).toContain('vite.config.ts');
    expect(metadata.lockfile.sha256).toBe('a'.repeat(64));
  });

  it('rejects an artifact whose source hash metadata is stale', async () => {
    const artifact = createCodeArtifact({
      projectId: '00000000-0000-4000-8000-000000000001', designPlanId: '00000000-0000-4000-8000-000000000002', assetManifestId: '00000000-0000-4000-8000-000000000003', templateVersion: 'starter', dependencyLockHash: 'a'.repeat(64), sourceHash: 'b'.repeat(64), routes: [], capabilities: [], files: [{ path: 'src/App.tsx', content: 'ok' }],
    });
    artifact.files[0].sha256 = 'c'.repeat(64);
    await expect(generateArtifactExportZip(artifact)).rejects.toThrow('hash mismatch');
  });

  it('calculates a stable checksum for the generated archive', async () => {
    const buffer = await generateExportZip({ spec, versionId: '00000000-0000-4000-8000-000000000000', projectName: 'Test Product' });
    expect(calculateZipChecksum(buffer)).toMatch(/^[a-f0-9]{64}$/);
  });
});
