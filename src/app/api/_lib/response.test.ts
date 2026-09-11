import { describe, expect, it } from 'vitest';
import { apiError, validationError } from './response';

describe('API error contract', () => {
  it('returns a stable machine-readable error envelope', async () => {
    const response = apiError('NOT_FOUND', 'Resource not found.', 404);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'NOT_FOUND', message: 'Resource not found.' },
    });
  });

  it('keeps validation details under the error object', async () => {
    const response = validationError({ fieldErrors: { url: ['Invalid URL'] } });
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: { fieldErrors: { url: ['Invalid URL'] } },
      },
    });
  });
});
