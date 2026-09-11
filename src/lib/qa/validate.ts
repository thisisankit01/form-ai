import type { ProductSpec, Section } from '@/lib/product/schema';
import type { DeterministicQAReport, QAFinding } from './types';

type ActionCandidate = {
  kind: 'navigate' | 'scroll' | 'demo-dialog';
  label: string;
  pageId?: string;
  sectionId?: string;
  dialogTitle?: string;
  dialogBody?: string;
};

const THEME_RULES = {
  'editorial-light': { accent: 'lime', density: 'comfortable', radius: 'sharp' },
  'precision-dark': { accent: 'cobalt', density: 'compact', radius: 'sharp' },
  'warm-service': { accent: 'terracotta', density: 'comfortable', radius: 'soft' },
} as const;

function finding(
  check: QAFinding['check'],
  code: string,
  message: string,
  location: Pick<QAFinding, 'pageId' | 'sectionId'> = {},
  suggestedFix = 'Regenerate this version.'
): QAFinding {
  return { check, code, severity: 'error', message, suggestedFix, ...location };
}

function actionCount(section: Section): number {
  if (section.type === 'hero') return section.secondaryAction ? 2 : 1;
  if (section.type === 'cta') return 1;
  if (section.type === 'pricing') return section.plans.length;
  return 0;
}

function actionsFor(section: Section): ActionCandidate[] {
  if (section.type === 'hero') return [section.primaryAction, ...(section.secondaryAction ? [section.secondaryAction] : [])];
  if (section.type === 'cta') return [section.action];
  if (section.type === 'pricing') return section.plans.map((plan) => plan.action);
  return [];
}

function sectionText(section: Section): string[] {
  switch (section.type) {
    case 'hero': return [section.eyebrow, section.headline, section.body, ...actionsFor(section).map((action) => action.label)];
    case 'feature-list': return [section.heading, ...section.items.flatMap((item) => [item.title, item.body])];
    case 'steps': return [section.heading, ...section.items.flatMap((item) => [item.title, item.body])];
    case 'pricing': return [section.heading, ...section.plans.flatMap((plan) => [plan.name, plan.priceLabel, plan.description, ...plan.features, plan.action.label])];
    case 'faq': return [section.heading, ...section.items.flatMap((item) => [item.question, item.answer])];
    case 'cta': return [section.heading, section.body, section.action.label];
    case 'metric-row': return section.metrics.flatMap((metric) => [metric.label, metric.value, metric.delta || '']);
    case 'data-table': return [section.heading, ...section.columns.flatMap((column) => [column.key, column.label]), ...section.rows.flatMap((row) => Object.values(row))];
    case 'activity-list': return [section.heading, ...section.items.flatMap((item) => [item.title, item.detail, item.timeLabel])];
    case 'rich-text': return [section.heading, ...section.paragraphs];
  }
}

export function validateProductSpec(spec: ProductSpec): DeterministicQAReport {
  const issues: QAFinding[] = [];
  const pages = new Map(spec.pages.map((page) => [page.id, page]));
  const sectionIds = new Set<string>();
  let checkedActions = 0;

  const landingPages = spec.pages.filter((page) => page.kind === 'landing');
  if (landingPages.length !== 1) {
    issues.push(finding('pages', 'required-home', 'ProductSpec must contain exactly one landing page.'));
  }

  for (const page of spec.pages) {
    const types = new Set(page.sections.map((section) => section.type));
    if (page.kind === 'landing' && !types.has('hero')) {
      issues.push(finding('pages', 'landing-hero', 'Landing page must include a hero section.', { pageId: page.id }));
    }
    if (page.kind === 'dashboard') {
      for (const required of ['metric-row', 'data-table', 'activity-list'] as const) {
        if (!types.has(required)) issues.push(finding('pages', `dashboard-${required}`, `Dashboard page is missing required ${required} section.`, { pageId: page.id }));
      }
    }
    if (page.kind === 'pricing' && !types.has('pricing')) {
      issues.push(finding('pages', 'pricing-section', 'Pricing page must include a pricing section.', { pageId: page.id }));
    }
    if (page.kind === 'about' && !types.has('rich-text')) {
      issues.push(finding('pages', 'about-content', 'About page must include a rich-text section.', { pageId: page.id }));
    }

    for (const section of page.sections) {
      if (sectionIds.has(section.id)) issues.push(finding('pages', 'duplicate-section-id', `Section id "${section.id}" is not unique.`, { pageId: page.id, sectionId: section.id }));
      sectionIds.add(section.id);
      checkedActions += actionCount(section);
      for (const action of actionsFor(section)) {
        if (!action.label.trim()) issues.push(finding('actions', 'empty-action-label', 'Action labels must not be empty.', { pageId: page.id, sectionId: section.id }));
        if (action.kind === 'navigate' && (!action.pageId || !pages.has(action.pageId))) {
          issues.push(finding('actions', 'invalid-page-target', 'Navigate actions must target an existing page.', { pageId: page.id, sectionId: section.id }));
        }
        if (action.kind === 'scroll' && (!action.sectionId || !sectionIds.has(action.sectionId) && !page.sections.some((candidate) => candidate.id === action.sectionId))) {
          issues.push(finding('actions', 'invalid-section-target', 'Scroll actions must target a section on the same page.', { pageId: page.id, sectionId: section.id }));
        }
        if (action.kind === 'demo-dialog' && (!action.dialogTitle?.trim() || !action.dialogBody?.trim())) {
          issues.push(finding('actions', 'incomplete-dialog', 'Demo-dialog actions require a title and body.', { pageId: page.id, sectionId: section.id }));
        }
      }

      for (const text of sectionText(section)) {
        const longestToken = text.split(/\s+/).reduce((longest, token) => Math.max(longest, token.length), 0);
        if (longestToken > 48) issues.push(finding('responsive', 'unbreakable-text', 'Text contains an unbreakable token longer than 48 characters and may overflow on mobile.', { pageId: page.id, sectionId: section.id }, 'Add spaces or shorten the content.'));
      }
    }
  }

  const themeRule = THEME_RULES[spec.theme.preset];
  if (themeRule.accent !== spec.theme.accent || themeRule.density !== spec.theme.density || themeRule.radius !== spec.theme.radius) {
    issues.push(finding('theme', 'invalid-theme-combination', `Theme ${spec.theme.preset} must use accent ${themeRule.accent}, density ${themeRule.density}, and radius ${themeRule.radius}.`, {}, 'Use one of the approved complete theme presets.'));
  }

  for (const navigationItem of spec.navigation) {
    if (!navigationItem.label.trim()) issues.push(finding('actions', 'empty-navigation-label', 'Navigation labels must not be empty.'));
    if (!pages.has(navigationItem.pageId)) issues.push(finding('actions', 'invalid-navigation-target', 'Navigation must target an existing page.'));
  }

  return {
    valid: issues.length === 0,
    issues,
    checkedSections: sectionIds.size,
    checkedActions,
  };
}

export { THEME_RULES };
