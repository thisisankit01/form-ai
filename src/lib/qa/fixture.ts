import type { ProductSpec, Section } from '@/lib/product/schema';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}

function sectionLabel(section: Section): string {
  if (section.type === 'hero') return section.headline;
  if ('heading' in section) return section.heading;
  if (section.type === 'metric-row') return section.metrics.map((metric) => `${metric.label}: ${metric.value}`).join(' · ');
  return 'section';
}

function actionButtons(section: Section): string {
  const actions = section.type === 'hero'
    ? [section.primaryAction, ...(section.secondaryAction ? [section.secondaryAction] : [])]
    : section.type === 'cta'
      ? [section.action]
      : section.type === 'pricing'
        ? section.plans.map((plan) => plan.action)
        : [];
  return actions.map((action) => `<button type="button" data-qa-action="${escapeHtml(action.kind)}">${escapeHtml(action.label)}</button>`).join('');
}

export function buildProductSpecFixtureHtml(spec: ProductSpec): string {
  const pages = spec.pages.map((page) => `
    <article data-qa-page="${escapeHtml(page.id)}">
      <h1>${escapeHtml(page.title)}</h1>
      ${page.sections.map((section) => `<section data-qa-section="${escapeHtml(section.id)}"><h2>${escapeHtml(sectionLabel(section))}</h2>${actionButtons(section)}</section>`).join('')}
    </article>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    * { box-sizing: border-box; } html, body { margin: 0; min-width: 0; } body { font: 16px/1.5 system-ui, sans-serif; background: #f5f4f0; color: #111; } main { width: 100%; max-width: 1100px; margin: 0 auto; padding: 24px; } article { margin-bottom: 32px; } section { min-width: 0; margin: 16px 0; padding: 20px; border: 1px solid #d9d8d1; overflow-wrap: anywhere; } button { max-width: 100%; margin: 8px 8px 0 0; padding: 10px 16px; overflow-wrap: anywhere; }
  </style></head><body><main>${pages}</main></body></html>`;
}
