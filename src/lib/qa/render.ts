import { chromium } from '@playwright/test';
import type { ProductSpec } from '@/lib/product/schema';
import { buildProductSpecFixtureHtml } from './fixture';
import type { QAFinding, RenderedQAReport } from './types';

const VIEWPORTS = [1440, 768, 390];

function renderFinding(code: string, message: string, severity: QAFinding['severity'] = 'error'): QAFinding {
  return { check: 'rendered', code, severity, message, suggestedFix: 'Fix the generated layout or regenerate this version.' };
}

export async function runRenderedQA(spec: ProductSpec): Promise<RenderedQAReport> {
  const issues: QAFinding[] = [];
  const browser = await chromium.launch({ headless: true }).catch((error: unknown) => {
    issues.push(renderFinding('browser-unavailable', `Rendered QA could not start Chromium: ${error instanceof Error ? error.message : 'unknown error'}`));
    return null;
  });
  if (!browser) return { issues, viewports: [] };

  try {
    const page = await browser.newPage();
    await page.setContent(buildProductSpecFixtureHtml(spec), { waitUntil: 'domcontentloaded' });
    for (const width of VIEWPORTS) {
      await page.setViewportSize({ width, height: 900 });
      const result = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        sections: document.querySelectorAll('[data-qa-section]').length,
        actions: document.querySelectorAll('[data-qa-action]').length,
        invisibleSections: [...document.querySelectorAll('[data-qa-section]')].filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width === 0 || rect.height === 0;
        }).length,
      }));
      if (result.overflow) issues.push(renderFinding('horizontal-overflow', `Rendered fixture overflows horizontally at ${width}px.`));
      if (result.sections !== spec.pages.reduce((count, page) => count + page.sections.length, 0)) issues.push(renderFinding('section-count-mismatch', `Rendered section count does not match the ProductSpec at ${width}px.`));
      if (result.actions !== countActions(spec)) issues.push(renderFinding('action-count-mismatch', `Rendered action count does not match the ProductSpec at ${width}px.`));
      if (result.invisibleSections > 0) issues.push(renderFinding('invisible-section', `Rendered sections are not visible at ${width}px.`));
    }
  } finally {
    await browser.close();
  }
  return { issues, viewports: VIEWPORTS };
}

function countActions(spec: ProductSpec): number {
  return spec.pages.flatMap((page) => page.sections).reduce((count, section) => count + (section.type === 'hero' ? 1 + (section.secondaryAction ? 1 : 0) : section.type === 'cta' ? 1 : section.type === 'pricing' ? section.plans.length : 0), 0);
}
