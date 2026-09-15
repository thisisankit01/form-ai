import { describe, expect, it, vi } from 'vitest';
import { assertSandboxConfigured, isBuildOutputFailure } from './sandbox';

describe('V3 sandbox configuration', () => {
  it('fails honestly when E2B configuration is absent', () => {
    vi.stubEnv('E2B_API_KEY', '');
    vi.stubEnv('E2B_TEMPLATE', '');
    expect(() => assertSandboxConfigured()).toThrow('E2B_API_KEY');
    vi.stubEnv('E2B_API_KEY', 'configured');
    expect(() => assertSandboxConfigured()).toThrow('E2B_TEMPLATE');
    vi.unstubAllEnvs();
  });

  it('preserves TypeScript compiler output as a build failure', () => {
    expect(isBuildOutputFailure('src/App.tsx(18,9): error TS1005: expected ";"')).toBe(true);
    expect(isBuildOutputFailure('vite v6.0.0 building for production...\n✓ built in 100ms')).toBe(false);
  });
});
