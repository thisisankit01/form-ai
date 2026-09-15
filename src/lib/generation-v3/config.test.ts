import { describe, expect, it } from 'vitest';
import { getGenerationEngine, isV3Enabled } from './config';

describe('generation engine flag', () => {
  it('defaults to the legacy engine', () => {
    expect(getGenerationEngine({})).toBe('legacy-spec');
    expect(isV3Enabled({})).toBe(false);
  });

  it('only enables V3 for the explicit v3 value', () => {
    expect(getGenerationEngine({ APP_GENERATION_ENGINE: 'v3' })).toBe('code-artifact-v3');
    expect(isV3Enabled({ APP_GENERATION_ENGINE: 'V3' })).toBe(false);
  });
});
