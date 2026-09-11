import { describe, expect, it } from 'vitest';
import { publicUrlSchema } from './url';

describe('public URL validation', () => {
  it('normalizes a hostname without a scheme', () => {
    expect(publicUrlSchema.parse('example.com')).toBe('https://example.com/');
  });

  it('rejects private address literals before any fetch', () => {
    expect(() => publicUrlSchema.parse('http://127.0.0.1')).toThrow();
  });

  it('rejects credential-bearing URLs', () => {
    expect(() => publicUrlSchema.parse('https://user:pass@example.com')).toThrow();
  });
});
