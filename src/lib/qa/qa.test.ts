import { describe, expect, it } from 'vitest';
import type { ProductSpec } from '@/lib/product/schema';
import { buildProductSpecFixtureHtml } from './fixture';
import { validateProductSpec } from './validate';

function makeSpec(overrides: Partial<ProductSpec> = {}): ProductSpec {
  return {
    schemaVersion: 1,
    name: 'Test product',
    description: 'A sufficiently descriptive product for deterministic QA tests.',
    audience: 'Independent product teams',
    positioning: 'A focused product prototype.',
    features: [],
    theme: { preset: 'editorial-light', accent: 'lime', density: 'comfortable', radius: 'sharp' },
    navigation: [{ id: 'nav-home', label: 'Home', pageId: 'home' }],
    pages: [{
      id: 'home', slug: '/', title: 'Home', kind: 'landing', sections: [{
        type: 'hero', id: 'hero', eyebrow: 'Test', headline: 'A clear headline', body: 'A short product explanation.',
        primaryAction: { kind: 'demo-dialog', label: 'Try demo', dialogTitle: 'Demo', dialogBody: 'Nothing was sent.' }, composition: 'centered',
      }],
    }],
    uiDirection: 'Clear and focused.',
    ...overrides,
  };
}

describe('ProductSpec deterministic QA', () => {
  it('passes a valid home page and counts rendered contract elements', () => {
    const report = validateProductSpec(makeSpec());
    expect(report.valid).toBe(true);
    expect(report.checkedSections).toBe(1);
    expect(report.checkedActions).toBe(1);
  });

  it('requires dashboard sections and rejects invalid theme combinations', () => {
    const spec = makeSpec({
      theme: { preset: 'precision-dark', accent: 'lime', density: 'comfortable', radius: 'soft' },
      pages: [{ id: 'dashboard', slug: '/dashboard', title: 'Dashboard', kind: 'dashboard', sections: [{
        type: 'rich-text', id: 'intro', heading: 'Dashboard', paragraphs: ['Overview'],
      }] }],
    });
    const report = validateProductSpec(spec);
    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['required-home', 'dashboard-metric-row', 'dashboard-data-table', 'dashboard-activity-list', 'invalid-theme-combination']));
  });

  it('rejects dangling actions and unbreakable responsive content', () => {
    const spec = makeSpec({
      pages: [{ id: 'home', slug: '/', title: 'Home', kind: 'landing', sections: [{
        type: 'hero', id: 'hero', eyebrow: '', headline: 'A clear headline', body: 'A short product explanation.',
        primaryAction: { kind: 'navigate', label: 'Continue', pageId: 'missing' },
        secondaryAction: { kind: 'scroll', label: 'Jump', sectionId: 'missing-section' }, composition: 'centered',
      }, {
        type: 'rich-text', id: 'copy', heading: 'Copy', paragraphs: ['x'.repeat(49)],
      }] }],
    });
    const report = validateProductSpec(spec);
    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['invalid-page-target', 'invalid-section-target', 'unbreakable-text']));
  });

  it('builds a self-contained fixture without external asset or network references', () => {
    const html = buildProductSpecFixtureHtml(makeSpec());
    expect(html).toContain('data-qa-section="hero"');
    expect(html).toContain('data-qa-action="demo-dialog"');
    expect(html).not.toMatch(/https?:\/\//);
  });
});
