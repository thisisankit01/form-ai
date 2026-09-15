import { createHash } from 'node:crypto';
import { EvidenceBundle, type EvidenceBundle as EvidenceBundleValue } from './contracts';

function urlOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function isoTimestamp(value: unknown): string {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

export function createEvidenceBundle(input: {
  capture: Record<string, unknown>;
  goal: string;
  audience: string;
}): EvidenceBundleValue {
  const sourceUrl = urlOrNull(input.capture.final_url) || urlOrNull(input.capture.requested_url);
  if (!sourceUrl) throw new Error('V3 requires a valid captured source URL');
  const metadata = input.capture.metadata && typeof input.capture.metadata === 'object'
    ? input.capture.metadata as Record<string, unknown>
    : {};
  const fidelity = metadata.fidelity && typeof metadata.fidelity === 'object'
    ? metadata.fidelity as Record<string, unknown>
    : {};
  const screenshotUrl = urlOrNull(input.capture.screenshot_path);
  const sectionOrder = Array.isArray(fidelity.sectionOrder) ? fidelity.sectionOrder : [];
  const images = fidelity.assets && typeof fidelity.assets === 'object' && Array.isArray((fidelity.assets as Record<string, unknown>).images)
    ? (fidelity.assets as Record<string, unknown>).images as unknown[]
    : [];
  const assetCandidates = images
    .map((url, index) => ({ url: urlOrNull(url), index }))
    .filter((item): item is { url: string; index: number } => Boolean(item.url))
    .slice(0, 40)
    .map((item) => ({
      id: `captured-image-${item.index}`,
      url: item.url,
      alt: '',
      width: null,
      height: null,
      sourceUrl,
      permission: 'unknown' as const,
    }));
  const normalizedText = typeof input.capture.normalized_text === 'string' ? input.capture.normalized_text.slice(0, 24_000) : '';
  const bundle = {
    schemaVersion: 1 as const,
    sourceUrl,
    finalUrl: urlOrNull(input.capture.final_url),
    capturedAt: isoTimestamp(input.capture.captured_at),
    normalizedText,
    claims: [],
    desktopScreenshots: screenshotUrl ? [{ id: 'source-desktop', url: screenshotUrl, width: 1440, height: 2400, kind: 'full-page' as const, coveredRegion: 'captured source page' }] : [],
    mobileScreenshots: [],
    assetCandidates,
    sectionRoles: sectionOrder.slice(0, 80).map((section, index) => {
      const value = section && typeof section === 'object' ? section as Record<string, unknown> : {};
      return { id: typeof value.id === 'string' ? value.id : `section-${index}`, role: typeof value.label === 'string' ? value.label : 'source section', heading: typeof value.heading === 'string' ? value.heading : null, order: index };
    }),
    limitations: [
      'Generated capabilities are local unless a connected integration is explicitly configured.',
      `Requested goal: ${input.goal.slice(0, 240)}`,
      `Target audience: ${input.audience.slice(0, 240)}`,
    ],
  };
  return EvidenceBundle.parse(bundle);
}

export function hashEvidence(evidence: EvidenceBundleValue): string {
  return createHash('sha256').update(JSON.stringify(evidence), 'utf8').digest('hex');
}
