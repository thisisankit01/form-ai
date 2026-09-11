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

export async function runResearchAgent(sourceText: string, metadata: Record<string, unknown>): Promise<SourceFacts> {
  const result = await generateValidated(SourceFacts, {
    system: RESEARCH_AGENT_SYSTEM,
    user: RESEARCH_AGENT_USER(sourceText, metadata),
    temperature: 0.1,
  });
  return result.data;
}

export async function runVisualAgent(screenshotUrl: string | null, goal: string, audience: string): Promise<VisualFindings> {
  if (!screenshotUrl) return null;
  try {
    const result = await analyzeImage(VisualSchema, {
      system: VISUAL_AGENT_SYSTEM,
      user: VISUAL_AGENT_USER(goal, audience),
      imageUrl: screenshotUrl,
      temperature: 0.1,
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
  });
  return result.data;
}

export async function runProductAgent(analysis: Analysis, goal: string): Promise<ProductBrief> {
  const result = await generateValidated(ProductBrief, {
    system: PRODUCT_AGENT_SYSTEM,
    user: PRODUCT_AGENT_USER(analysis, goal),
    temperature: 0.3,
  });
  return { ...result.data, visualDirection: analysis.visual };
}

export async function runUIAgent(brief: ProductBrief): Promise<ProductSpec> {
  try {
    const result = await generateValidated(ProductSpec, {
      system: UI_AGENT_SYSTEM,
      user: UI_AGENT_USER(brief),
      temperature: 0.2,
    });
    return result.data;
  } catch {
    const features = [...brief.features];
    while (features.length < 4) {
      const index = features.length + 1;
      features.push({ id: `feature-${index}`, title: `Core capability ${index}`, description: 'A focused workflow that helps the target customer make progress.', priority: 'should' });
    }
    return ProductSpec.parse({
      schemaVersion: 1,
      name: brief.name,
      description: brief.description,
      audience: brief.audience,
      positioning: brief.positioning,
      features,
      theme: { preset: 'editorial-light', accent: 'lime', density: 'comfortable', radius: 'soft' },
      navigation: [{ id: 'home', label: 'Overview', pageId: 'home' }],
      pages: [{
        id: 'home', slug: '/', title: brief.name, kind: 'landing', sections: [
          { type: 'hero', id: 'hero', eyebrow: 'Built for modern teams', headline: brief.name, body: brief.description, primaryAction: { kind: 'demo-dialog', label: 'Get started', dialogTitle: 'Get started', dialogBody: 'Tell us what you want to build.' }, composition: 'split' },
          { type: 'feature-list', id: 'features', heading: 'Everything you need to move faster', items: features.slice(0, 4).map((feature) => ({ id: feature.id, title: feature.title, body: feature.description })) },
        ],
      }],
      uiDirection: 'Clean, editorial interface with clear hierarchy and generous spacing.',
    });
  }
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

export interface BuildPipelineInput { analysis: Analysis; goal: string; }
export interface EditPipelineInput { currentSpec: ProductSpec; instruction: string; }

export async function runAnalysisPipeline(input: AnalysisPipelineInput): Promise<Analysis> {
  const facts = await runResearchAgent(input.captureResult.normalizedText, input.captureResult.metadata);
  const visual = await runVisualAgent(input.captureResult.screenshotUrl, input.goal, input.audience);
  const analysis = await runProductAnalyst(facts, visual, input.goal, input.audience);
  return analysis;
}

export async function runBuildPipeline(input: { analysis: Analysis; goal: string }): Promise<ProductSpec> {
  const brief = await runProductAgent(input.analysis, input.goal);
  const spec = await runUIAgent(brief);
  return spec;
}

export async function runEditPipeline(input: { currentSpec: ProductSpec; instruction: string }): Promise<EditResult> {
  const result = await runRevisionAgent(input.currentSpec, input.instruction);
  return result;
}

export type { SourceFacts, VisualFindings, Analysis, ProductBrief, ProductSpec, EditResult as RevisionResult, QAResult } from '@/lib/product/schema';
