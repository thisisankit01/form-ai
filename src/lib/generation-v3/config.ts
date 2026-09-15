export type GenerationEngine = 'legacy-spec' | 'code-artifact-v3';

export function getGenerationEngine(env: Record<string, string | undefined> = process.env): GenerationEngine {
  return env.APP_GENERATION_ENGINE === 'v3' ? 'code-artifact-v3' : 'legacy-spec';
}

export function isV3Enabled(env: Record<string, string | undefined> = process.env): boolean {
  return getGenerationEngine(env) === 'code-artifact-v3';
}
