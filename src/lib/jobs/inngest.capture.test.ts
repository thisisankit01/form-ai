import { describe, expect, it } from 'vitest';
import { createBuildSourceContext } from './inngest';

describe('build source mapping', () => {
  it('preserves fidelity metadata, source images, section order, and screenshot context', () => {
    const fidelity = {
      dom: '<html><body><section id="intro"></section></body></html>',
      assets: { images: ['https://example.com/hero.webp'], stylesheets: [], scripts: [], fonts: [], resources: [], other: [] },
      sectionOrder: [{ index: 0, id: 'intro', label: null, heading: 'Intro' }],
      screenshot: { fullPage: true, width: 1440, height: 2400 },
      fonts: [{ family: 'Inter', status: 'loaded', weight: '400', style: 'normal', stretch: '100%' }],
    };

    const context = createBuildSourceContext({
      requested_url: 'https://example.com',
      final_url: 'https://example.com/home',
      screenshot_path: 'captures/project/capture.png',
      normalized_text: 'Source content',
      metadata: { fidelity },
    }, 'https://signed.example.com/capture.png');

    expect(context.sourceEvidenceAvailable).toBe(true);
    expect(context.sourceUrl).toBe('https://example.com/home');
    expect(context.screenshotUrl).toBe('https://signed.example.com/capture.png');
    expect(context.screenshotPath).toBe('captures/project/capture.png');
    expect(context.sourceImageUrls).toEqual(['https://example.com/hero.webp']);
    expect(context.sectionOrder).toEqual(fidelity.sectionOrder);
    expect(context.fidelityMetadata).toEqual(fidelity);
    expect(context.screenshotContext).toEqual(fidelity.screenshot);
  });

  it('does not invent source evidence for an empty capture', () => {
    const context = createBuildSourceContext({ metadata: {} });

    expect(context.sourceEvidenceAvailable).toBe(false);
    expect(context.sourceImageUrls).toEqual([]);
    expect(context.sectionOrder).toEqual([]);
    expect(context.screenshotUrl).toBeNull();
  });
});
