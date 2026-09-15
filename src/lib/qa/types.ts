import type { QAResult, ProductSpec } from '@/lib/product/schema';

export type QACheck = 'schema' | 'pages' | 'actions' | 'responsive' | 'theme' | 'rendered';

export type QAFinding = QAResult['issues'][number] & {
  check: QACheck;
  code: string;
};

export interface DeterministicQAReport {
  valid: boolean;
  issues: QAFinding[];
  checkedSections: number;
  checkedActions: number;
}

export interface RenderedQAReport {
  issues: QAFinding[];
  viewports: number[];
  checkedRoutes?: string[];
}

export interface ArtifactRenderedQAInput {
  previewUrl: string;
  previewToken: string;
  routes: Array<{ path: string; title?: string }>;
}

export type ValidProductSpec = ProductSpec;
