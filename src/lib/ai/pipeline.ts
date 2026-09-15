import { generateValidated, analyzeImage, isVisionUnavailable } from './provider';
import { 
  RESEARCH_AGENT_SYSTEM, RESEARCH_AGENT_USER, 
  VISUAL_AGENT_SYSTEM, VISUAL_AGENT_USER, 
  PRODUCT_ANALYST_SYSTEM, PRODUCT_ANALYST_USER, 
  PRODUCT_AGENT_SYSTEM, PRODUCT_AGENT_USER, 
  UI_AGENT_SYSTEM, UI_AGENT_USER, 
  REVISION_AGENT_SYSTEM, REVISION_AGENT_USER, 
  QA_AGENT_SYSTEM, QA_AGENT_USER 
} from './prompts';

import {
  SourceFacts, 
  VisualSchema,
  VisualFindings,
  Analysis, 
  ProductBrief, 
  ProductSpec, 
  EditResult, 
  QAResult,
  QAResultSchema
} from '@/lib/product/schema';
import type { BuildSourceContext } from './contracts';

const ResearchSourceFacts = SourceFacts.extend({
  targetUsers: SourceFacts.shape.targetUsers.max(2),
  keyFeatures: SourceFacts.shape.keyFeatures.max(4),
  evidence: SourceFacts.shape.evidence.max(3),
  limitations: SourceFacts.shape.limitations.max(2),
});

export async function runResearchAgent(sourceText: string, metadata: Record<string, unknown>): Promise<SourceFacts> {
  const result = await generateValidated(ResearchSourceFacts, {
    system: RESEARCH_AGENT_SYSTEM,
    user: RESEARCH_AGENT_USER(sourceText, metadata),
    temperature: 0.1,
    maxTokens: 900,
  });
  return result.data;
}

export async function runVisualAgent(screenshotUrl: string | null, goal: string, audience: string, metadata: Record<string, unknown> = {}): Promise<VisualFindings> {
  if (!screenshotUrl) return null;
  try {
    const result = await analyzeImage(VisualSchema, {
      system: VISUAL_AGENT_SYSTEM,
      user: VISUAL_AGENT_USER(goal, audience, metadata),
      imageUrl: screenshotUrl,
      temperature: 0.1,
      maxTokens: 1800,
    });
    return result.data;
  } catch (error: unknown) {
    if (isVisionUnavailable(error)) return null;
    throw error;
  }
}

export async function runProductAnalyst(facts: SourceFacts, visual: VisualFindings, goal: string, audience: string): Promise<Analysis> {
  const result = await generateValidated(Analysis, {
    system: PRODUCT_ANALYST_SYSTEM,
    user: PRODUCT_ANALYST_USER(facts, visual, goal, audience),
    temperature: 0.2,
    maxTokens: 3000,
  });
  return result.data;
}

export async function runProductAgent(analysis: Analysis, goal: string, sourceContext: BuildSourceContext): Promise<ProductBrief> {
  const promptSourceContext = {
    sourceUrl: sourceContext.sourceUrl,
    sourceImageUrls: sourceContext.sourceImageUrls,
    sectionOrder: sourceContext.sectionOrder,
    screenshotContext: sourceContext.screenshotContext,
    sourceEvidenceAvailable: sourceContext.sourceEvidenceAvailable,
  };
  const result = await generateValidated(ProductBrief, {
    system: PRODUCT_AGENT_SYSTEM,
    user: PRODUCT_AGENT_USER(analysis, goal, promptSourceContext),
    temperature: 0.3,
    maxTokens: 2500,
  });
  return { ...result.data, visualDirection: analysis.visual };
}

export async function runUIAgent(brief: ProductBrief): Promise<ProductSpec> {
  const result = await generateValidated(ProductSpec, {
    system: UI_AGENT_SYSTEM,
    user: UI_AGENT_USER(brief),
    temperature: 0.2,
    maxTokens: 3500,
    includeSchemaDescription: false,
  });
  const spec = result.data;
  const sourceMedia = brief.visualDirection?.mediaReferences?.[0];
  if (!sourceMedia) return spec;

  return {
    ...spec,
    pages: spec.pages.map((page) => ({
      ...page,
      sections: page.sections.map((section) => (
        section.type === 'hero' && !section.media
          ? { ...section, media: sourceMedia }
          : section
      )),
    })),
  };
}

export async function runRevisionAgent(currentSpec: ProductSpec, instruction: string): Promise<EditResult> {
  try {
    const result = await generateValidated(EditResult, {
      system: REVISION_AGENT_SYSTEM,
      user: REVISION_AGENT_USER(currentSpec, instruction),
      temperature: 0.2,
    });
    return result.data;
  } catch (error) {
    throw new Error(`Revision unavailable: ${error instanceof Error ? error.message : 'AI provider error'}`);
  }
}

export async function runQAAgent(spec: ProductSpec, goal: string, validationReport: unknown, screenshots: unknown): Promise<QAResult> {
  const result = await generateValidated(QAResultSchema, {
    system: QA_AGENT_SYSTEM,
    user: QA_AGENT_USER(spec, goal, validationReport, screenshots),
    temperature: 0.1,
  });
  return result.data;
}

export interface AnalysisPipelineInput {
  captureResult: { normalizedText: string; screenshotUrl: string | null; metadata: Record<string, unknown>; title: string | null };
  goal: string;
  audience: string;
}

export interface BuildPipelineInput { analysis: Analysis; goal: string; sourceContext: BuildSourceContext; }
export interface EditPipelineInput { currentSpec: ProductSpec; instruction: string; }

export function compactCaptureMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const fidelity = metadata.fidelity && typeof metadata.fidelity === 'object'
    ? metadata.fidelity as Record<string, unknown>
    : {};
  const assets = fidelity.assets && typeof fidelity.assets === 'object'
    ? fidelity.assets as Record<string, unknown>
    : {};
  return {
    sourceURL: typeof metadata.sourceURL === 'string' ? metadata.sourceURL : null,
    title: typeof metadata.title === 'string' ? metadata.title.slice(0, 240) : null,
    fidelity: {
      viewport: fidelity.viewport,
      documentHeight: fidelity.documentHeight,
      assets: {
        images: Array.isArray(assets.images) ? assets.images.filter((item): item is string => typeof item === 'string').slice(0, 40) : [],
        stylesheets: Array.isArray(assets.stylesheets) ? assets.stylesheets.filter((item): item is string => typeof item === 'string').slice(0, 20) : [],
        fonts: Array.isArray(assets.fonts) ? assets.fonts.filter((item): item is string => typeof item === 'string').slice(0, 20) : [],
      },
      fonts: Array.isArray(fidelity.fonts) ? fidelity.fonts.slice(0, 20) : [],
      sectionOrder: Array.isArray(fidelity.sectionOrder) ? fidelity.sectionOrder.slice(0, 80) : [],
      screenshot: fidelity.screenshot,
    },
  };
}

export function compactResearchSource(source: string): string {
  const seen = new Set<string>();
  const lines = source.split('\n').flatMap((line) => {
    const value = line.trim().replace(/\s+/g, ' ');
    if (!value || value.length < 20 || /^!\[/.test(value) || /^https?:\/\//.test(value) || /\]\(https?:\/\//.test(value)) return [];
    if (/^(activity|skills|reviews|properties|reply|worked for|cycle|labels)$/i.test(value)
      || /(?:\b\w+-\d{3,}\b|\b\d+\s*(?:min|hour)s? ago\b|\bjust now\b)/i.test(value)
      || /(?:created the issue|pushed and opened|draft pr|typeerror:|in progress\d*|todo\d*|anyone else|has anyone|@linear|\b\d{1,2}:\d{2}\s*(?:am|pm)\b)/i.test(value)) return [];
    const key = value.toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    return [value];
  });
  return lines.join('\n').slice(0, 3_500);
}

function compactResearchMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const fidelity = metadata.fidelity && typeof metadata.fidelity === 'object' ? metadata.fidelity as Record<string, unknown> : {};
  return {
    sourceURL: typeof metadata.sourceURL === 'string' ? metadata.sourceURL : null,
    title: typeof metadata.title === 'string' ? metadata.title : null,
    sectionOrder: Array.isArray(fidelity.sectionOrder) ? fidelity.sectionOrder.slice(0, 12) : [],
  };
}

function fallbackResearchFacts(sourceText: string, metadata: Record<string, unknown>): SourceFacts {
  const sourceUrl = typeof metadata.sourceURL === 'string' ? metadata.sourceURL : '';
  const excerpt = sourceText.replace(/\s+/g, ' ').trim().slice(0, 500) || 'No readable source content was captured.';
  const title = typeof metadata.title === 'string' ? metadata.title : 'Captured website';
  const headings = sourceText.match(/^#{1,3}\s+(.+)$/gm)?.map((heading) => heading.replace(/^#+\s+/, '').trim()).filter(Boolean).slice(0, 4) || [];
  const evidence = [{ id: 'fallback-1', sourceUrl, excerpt }];
  const claim = (text: string, status: 'observed' | 'inferred' | 'unknown' = 'inferred') => ({ text, status, evidenceIds: ['fallback-1'] });
  return {
    summary: claim(`${title} is represented by the captured website content.`, 'observed'),
    targetUsers: [claim('Teams and users interested in the captured product.', 'unknown')],
    coreProblem: claim('The source does not provide enough reliable detail to identify the core problem.', 'unknown'),
    keyFeatures: (headings.length ? headings : ['Primary product workflow']).map((heading) => claim(heading, 'observed')).slice(0, 4),
    businessModel: claim('Business model was not reliably identified from the capture.', 'unknown'),
    evidence,
    limitations: ['Research output required a bounded fallback because the provider returned incomplete JSON.'],
  };
}

export async function runAnalysisPipeline(input: AnalysisPipelineInput & { onStage?: (stage: 'research' | 'visual' | 'analyst', status: 'running' | 'succeeded') => Promise<void> }): Promise<Analysis> {
  const metadata = compactCaptureMetadata(input.captureResult.metadata);
  await input.onStage?.('research', 'running');
  const facts = await runResearchAgent(compactResearchSource(input.captureResult.normalizedText), compactResearchMetadata(metadata)).catch((error: unknown) => {
    if (!(error instanceof Error) || !error.message.includes('Structured generation')) throw error;
    return fallbackResearchFacts(input.captureResult.normalizedText, metadata);
  });
  await input.onStage?.('research', 'succeeded');
  await input.onStage?.('visual', 'running');
  const visual = await runVisualAgent(input.captureResult.screenshotUrl, input.goal, input.audience, metadata);
  await input.onStage?.('visual', 'succeeded');
  await input.onStage?.('analyst', 'running');
  const analysis = await runProductAnalyst(facts, visual, input.goal, input.audience);
  await input.onStage?.('analyst', 'succeeded');
  return analysis;
}

export async function runBuildPipeline(input: BuildPipelineInput): Promise<ProductSpec> {
  const brief = await runProductAgent(input.analysis, input.goal, input.sourceContext);
  const spec = await runUIAgent(brief);
  return spec;
}

export async function runEditPipeline(input: { currentSpec: ProductSpec; instruction: string }): Promise<EditResult> {
  const result = await runRevisionAgent(input.currentSpec, input.instruction);
  return result;
}

export type { SourceFacts, VisualFindings, Analysis, ProductBrief, ProductSpec, EditResult as RevisionResult, QAResult } from '@/lib/product/schema';
