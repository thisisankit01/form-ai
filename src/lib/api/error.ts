export function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return sanitizeError(error, fallback);
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
    return sanitizeError((error as { message: string }).message, fallback);
  }
  return fallback;
}

export function getSafeDisplayError(message: string | null | undefined, fallback: string): string {
  return message ? sanitizeError(message, fallback) : fallback;
}

function sanitizeError(message: string, fallback: string): string {
  if (/requestBodyValues|chat\/completions|apiKey|authorization|AI_APICallError/i.test(message)) return fallback;
  return message.length > 240 ? `${message.slice(0, 237)}...` : message;
}
