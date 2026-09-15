import { describe, expect, it } from 'vitest';
import { compactCaptureMetadata, compactResearchSource } from './pipeline';

describe('compactCaptureMetadata', () => {
  it('removes raw DOM and bounds captured metadata before prompting', () => {
    const metadata = compactCaptureMetadata({
      sourceURL: 'https://example.com',
      fidelity: {
        dom: '<html>'.repeat(100_000),
        assets: { images: Array.from({ length: 100 }, (_, index) => `https://example.com/${index}.png`) },
        sectionOrder: Array.from({ length: 100 }, (_, index) => ({ index })),
      },
    });

    expect(metadata).not.toHaveProperty('fidelity.dom');
    expect((metadata.fidelity as { assets: { images: string[] } }).assets.images).toHaveLength(40);
    expect((metadata.fidelity as { sectionOrder: unknown[] }).sectionOrder).toHaveLength(80);
    expect(JSON.stringify(metadata)).not.toContain('<html>');
  });
});

describe('compactResearchSource', () => {
  it('removes repeated and dynamic activity content before research prompting', () => {
    const source = 'Activity\nENG-2085\nKarri · 2min ago\nPurpose-built for teams.\nPurpose-built for teams.\nPowering the companies building the future.';
    const compact = compactResearchSource(source);
    expect(compact).toContain('Purpose-built for teams.');
    expect(compact).toContain('Powering the companies building the future.');
    expect(compact).not.toContain('ENG-2085');
    expect(compact).not.toContain('2min ago');
  });
});
