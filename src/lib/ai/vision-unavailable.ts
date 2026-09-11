export const AI_VISION_UNAVAILABLE_ERROR = 'VISION_UNAVAILABLE';

export class AIVisionUnavailableError extends Error {
  constructor() {
    super('Vision model not configured');
    this.name = 'AIVisionUnavailableError';
  }
}

export function isVisionUnavailable(error: unknown): error is AIVisionUnavailableError {
  return error instanceof AIVisionUnavailableError;
}