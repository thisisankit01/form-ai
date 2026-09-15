import { describe, expect, it } from 'vitest';
import { createPreviewTarget, isPreviewAuthorized, normalizePreviewPath } from './preview';

describe('V3 preview path boundary', () => {
  it('rejects traversal and control characters', () => {
    expect(normalizePreviewPath(['..', 'secret'])).toBeNull();
    expect(normalizePreviewPath(['assets', '%2e%2e%2fsecret'])).toBeNull();
    expect(normalizePreviewPath(['assets', 'safe\0.js'])).toBeNull();
  });

  it('keeps valid preview paths on the E2B origin', () => {
    expect(normalizePreviewPath(['assets', 'app.js'])).toBe('assets/app.js');
    expect(createPreviewTarget('https://sandbox.example', 'assets/app.js').toString()).toBe('https://sandbox.example/assets/app.js');
    expect(() => createPreviewTarget('http://sandbox.example', 'index.html')).toThrow('HTTPS');
  });

  it('requires the authenticated user to own the project', () => {
    expect(isPreviewAuthorized('owner', 'owner')).toBe(true);
    expect(isPreviewAuthorized('attacker', 'owner')).toBe(false);
    expect(isPreviewAuthorized(null, 'owner')).toBe(false);
  });
});
