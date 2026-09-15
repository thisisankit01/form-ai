export interface BuildSourceContext {
  sourceUrl: string | null;
  screenshotUrl: string | null;
  screenshotPath: string | null;
  sourceImageUrls: string[];
  sectionOrder: unknown[];
  fidelityMetadata: Record<string, unknown> | null;
  screenshotContext: Record<string, unknown> | null;
  sourceEvidenceAvailable: boolean;
}
