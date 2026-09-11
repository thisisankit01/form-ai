import { NextResponse } from 'next/server';

export type ApiErrorDetails = Record<string, unknown>;

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: ApiErrorDetails,
) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

export function validationError(details?: ApiErrorDetails) {
  return apiError('VALIDATION_ERROR', 'Request validation failed.', 400, details);
}

export function internalError(message: string) {
  return apiError('INTERNAL_ERROR', message, 500);
}
