import type { Browser } from 'playwright';
import type { ProductSpec } from '@/lib/product/schema';
import { buildProductSpecFixtureHtml } from './fixture';
import type { ArtifactRenderedQAInput, QAFinding, RenderedQAReport } from './types';

const VIEWPORTS = [1440, 768, 390];

function renderFinding(code: string, message: string, severity: QAFinding['severity'] = 'error'): QAFinding {
  return { check: 'rendered', code, severity, message, suggestedFix: 'Fix the generated layout or regenerate this version.' };
}

export async function runRenderedQA(input: ArtifactRenderedQAInput | ProductSpec): Promise<RenderedQAReport> {
  const issues: QAFinding[] = [];
  let browser: Browser | null = null;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
  } catch (error: unknown) {
    issues.push(renderFinding('browser-unavailable', `Rendered QA could not start Chromium: ${error instanceof Error ? error.message : 'unknown error'}`));
  }
  if (!browser) return { issues, viewports: [], checkedRoutes: [] };

  try {
    const page = await browser.newPage({ extraHTTPHeaders: 'previewToken' in input ? { 'e2b-traffic-access-token': input.previewToken } : {} });
    if (!('previewUrl' in input)) {
      await page.setContent(buildProductSpecFixtureHtml(input), { waitUntil: 'domcontentloaded' });
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
        if (result.sections !== input.pages.reduce((count, page) => count + page.sections.length, 0)) issues.push(renderFinding('section-count-mismatch', `Rendered section count does not match the ProductSpec at ${width}px.`));
        if (result.actions !== countActions(input)) issues.push(renderFinding('action-count-mismatch', `Rendered action count does not match the ProductSpec at ${width}px.`));
        if (result.invisibleSections > 0) issues.push(renderFinding('invisible-section', `Rendered sections are not visible at ${width}px.`));
      }
      return { issues, viewports: VIEWPORTS };
    }
    const checkedRoutes: string[] = [];
    for (const route of input.routes) {
      let target: string;
      try {
        target = new URL(route.path, input.previewUrl).toString();
      } catch {
        issues.push(renderFinding('preview-unavailable', `Artifact preview URL is invalid for ${route.path}.`));
        continue;
      }
      let response;
      try {
        response = await page.goto(target, { waitUntil: 'domcontentloaded' });
      } catch (error: unknown) {
        issues.push(renderFinding('preview-unavailable', `Artifact preview could not be loaded for ${route.path}: ${error instanceof Error ? error.message : 'unknown error'}`));
        continue;
      }
      checkedRoutes.push(route.path);
      if (!response || !response.ok()) {
        issues.push(renderFinding('preview-http-error', `Artifact preview returned ${response?.status() || 'no'} response for ${route.path}.`));
        continue;
      }
      for (const width of VIEWPORTS) {
        await page.setViewportSize({ width, height: 900 });
        const result = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          empty: !document.body || document.body.innerText.trim().length === 0,
        }));
        if (result.overflow) issues.push(renderFinding('horizontal-overflow', `Artifact preview overflows horizontally at ${width}px on ${route.path}.`));
        if (result.empty) issues.push(renderFinding('empty-preview', `Artifact preview is empty at ${width}px on ${route.path}.`));
      }
    }
    return { issues, viewports: VIEWPORTS, checkedRoutes };
  } finally {
    await browser.close();
  }
}

function countActions(spec: ProductSpec): number {
  return spec.pages.flatMap((page) => page.sections).reduce((count, section) => count + (section.type === 'hero' ? 1 + (section.secondaryAction ? 1 : 0) : section.type === 'cta' ? 1 : section.type === 'pricing' ? section.plans.length : 0), 0);
}
