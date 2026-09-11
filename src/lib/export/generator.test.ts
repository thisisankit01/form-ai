import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { generateExportZip, InvalidExportZipError, validateExportZip } from './generator';

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
});
