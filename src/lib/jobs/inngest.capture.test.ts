import { describe, expect, it } from 'vitest';
import { createBuildSourceContext, hashV3Build } from './inngest';
import { PRODUCT_AGENT_USER } from '@/lib/ai/prompts';

describe('build source mapping', () => {
  it('build hash is stable for the same generated content', () => {
    const base = {
      id: 'artifact-a',
      files: [{ path: 'src/App.tsx', content: 'export default function App() {}' }],
      routes: [{ path: '/', title: 'Home' }],
      capabilities: [],
      sourceHash: 'a'.repeat(64),
      dependencyLockHash: 'b'.repeat(64),
      templateVersion: 'v3',
    };

    expect(hashV3Build(base)).toBe(hashV3Build({ ...base, id: 'artifact-b' }));
  });

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

  it('delivers bounded source evidence to the Product Agent prompt', () => {
    const prompt = PRODUCT_AGENT_USER(
      { summary: 'analysis' },
      'Build an operations tool',
      {
        sourceUrl: 'https://example.com',
        sourceImageUrls: ['https://example.com/sentinel.webp'],
        sectionOrder: [{ heading: 'Lower-page pricing detail' }],
        screenshotContext: { fullPage: true, width: 1440, height: 2400 },
        sourceEvidenceAvailable: true,
      },
    );

    expect(prompt).toContain('Lower-page pricing detail');
    expect(prompt).toContain('https://example.com/sentinel.webp');
    expect(prompt).toContain('https://example.com');
  });
});
