/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { AIVisionUnavailableError } from './vision-unavailable';
import { reserveAIRequest } from './request-governor';

// Provider configuration from environment
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const AI_MAX_OUTPUT_TOKENS = parseInt(process.env.APP_AI_MAX_OUTPUT_TOKENS || '8000', 10);
const AI_MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || '3', 10);
const AI_RETRY_BASE_DELAY_MS = parseInt(process.env.AI_RETRY_BASE_DELAY_MS || '1000', 10);
const AI_REQUEST_TIMEOUT_MS = parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '90000', 10);

function isTransientAIError(error: unknown): boolean {
  const value = error as { statusCode?: number; status?: number; cause?: { statusCode?: number; status?: number } };
  const status = value?.statusCode || value?.status || value?.cause?.statusCode || value?.cause?.status;
  return status === 408 || status === 429 || (typeof status === 'number' && status >= 500)
    || error instanceof TypeError
    || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name));
}

type CloudflareContent = { role: 'system' | 'user'; parts: Array<Record<string, unknown>> };

async function runCloudflareAI(
  model: string,
  contents: CloudflareContent[],
  options: { temperature: number; maxTokens: number; signal: AbortSignal },
): Promise<string> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error('Cloudflare AI is not configured');
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(CLOUDFLARE_ACCOUNT_ID)}/ai/run/${model.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: contents.map((message) => {
          const text = message.parts.find((part) => typeof part.text === 'string')?.text;
          const image = message.parts.find((part) => part.inline_data && typeof part.inline_data === 'object')?.inline_data as { mime_type?: string; data?: string } | undefined;
          if (!image) return { role: message.role, content: text || '' };
          return {
            role: message.role,
            content: [
              ...(text ? [{ type: 'text', text }] : []),
              { type: 'image_url', image_url: { url: `data:${image.mime_type || 'image/png'};base64,${image.data || ''}` } },
            ],
          };
        }),
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        reasoning_effort: 'low',
        chat_template_kwargs: { enable_thinking: false },
        response_format: { type: 'json_object' },
      }),
      signal: options.signal,
    },
  );

  const payload = await response.json().catch(() => null) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?: unknown;
  } | null;
  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.errors?.[0]?.message || `Cloudflare AI request failed with HTTP ${response.status}`) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  const text = extractCloudflareResponse(payload?.result);
  if (text) return text;
  throw new Error('Cloudflare AI returned an empty response');
}

async function runOpenAICompatibleAI(
  provider: 'openrouter' | 'groq',
  model: string,
  contents: CloudflareContent[],
  options: { temperature: number; maxTokens: number; signal: AbortSignal },
): Promise<string> {
  const apiKey = provider === 'openrouter' ? OPENROUTER_API_KEY : GROQ_API_KEY;
  if (!apiKey) throw new Error(`${provider} is not configured`);
  const baseUrl = provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions';
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(provider === 'openrouter' ? { 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', 'X-Title': 'FORM' } : {}),
    },
    body: JSON.stringify({
      model,
      messages: contents.map((message) => ({
        role: message.role,
        content: message.parts.map((part) => typeof part.text === 'string' ? part.text : '').filter(Boolean).join('\n'),
      })),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    }),
    signal: options.signal,
  });
  const payload = await response.json().catch(() => null) as { error?: { message?: string }; choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown; reasoning?: unknown } }> } | null;
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `${provider} request failed with HTTP ${response.status}`) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  const message = payload?.choices?.[0]?.message;
  const text = typeof message?.content === 'string' && message.content.trim()
    ? message.content
    : typeof message?.reasoning_content === 'string' && message.reasoning_content.trim()
      ? message.reasoning_content
      : message?.reasoning;
  if (typeof text !== 'string' || !text.trim()) throw new Error(`${provider} returned an empty response`);
  return text;
}

type ProviderCall = (contents: CloudflareContent[], options: { temperature: number; maxTokens: number; signal: AbortSignal }) => Promise<string>;
type StructuredProvider = { name: string; call: ProviderCall };

function createProvider(name: string, call: ProviderCall): StructuredProvider {
  return { name, call };
}

function getStructuredProviders(modelOverride?: string): StructuredProvider[] {
  const cloudflareModel = modelOverride || process.env.AI_MODEL || 'google/gemini-3.7-flash';
  const openRouterModel = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
  const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
  return [
    ...(CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN ? [createProvider('cloudflare', (contents, options) => runCloudflareAI(cloudflareModel, contents, options))] : []),
    ...(OPENROUTER_API_KEY ? [createProvider('openrouter', (contents, options) => runOpenAICompatibleAI('openrouter', openRouterModel, contents, options))] : []),
    ...(GROQ_API_KEY ? [createProvider('groq', (contents, options) => runOpenAICompatibleAI('groq', groqModel, contents, options))] : []),
  ];
}

export function extractCloudflareResponse(result: unknown): string | null {
  if (typeof result === 'string') return result;
  if (!result || typeof result !== 'object') return null;
  const value = result as { response?: unknown; text?: unknown; content?: unknown; choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown; reasoning?: unknown } }> };
  if (typeof value.response === 'string' && value.response.trim()) return value.response;
  if (typeof value.text === 'string' && value.text.trim()) return value.text;
  if (typeof value.content === 'string' && value.content.trim()) return value.content;
  const message = value.choices?.[0]?.message;
  if (typeof message?.content === 'string' && message.content.trim()) return message.content;
  if (typeof message?.reasoning_content === 'string' && message.reasoning_content.trim()) return message.reasoning_content;
  if (typeof message?.reasoning === 'string' && message.reasoning.trim()) return message.reasoning;
  return null;
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name);
}

function formatAIError(error: unknown): Error {
  if (isTimeoutError(error)) {
    return new Error(`AI provider request timed out after ${AI_REQUEST_TIMEOUT_MS}ms`);
  }
  return error instanceof Error ? error : new Error('AI provider request failed');
}

function providerRetryDelay(error: unknown): number {
  const message = error instanceof Error ? error.message : '';
  const match = message.match(/try again in\s+([\d.]+)s/i);
  return match ? Math.min(60_000, Math.ceil(Number(match[1]) * 1_000)) : 0;
}

async function callAI<T>(call: (signal: AbortSignal) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await reserveAIRequest();
      return await call(AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS));
    } catch (error) {
      // A model timeout is not made healthier by immediately repeating the
      // same long generation. Let the job-level retry policy decide whether
      // another attempt is appropriate.
       if (!isTransientAIError(error) || isTimeoutError(error) || attempt >= AI_MAX_RETRIES) {
         throw formatAIError(error);
       }
       if ((error as { status?: number }).status === 429) {
         const retryDelay = providerRetryDelay(error);
         if (retryDelay > 0 && attempt < 1) {
           await new Promise((resolve) => setTimeout(resolve, retryDelay));
           continue;
         }
         throw formatAIError(error);
       }
      const delay = AI_RETRY_BASE_DELAY_MS * (2 ** attempt) + Math.floor(Math.random() * AI_RETRY_BASE_DELAY_MS);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Generate validated structured output from the LLM.
 * Uses bounded repair: one retry with validation errors on parse/schema failure.
 */
export async function generateValidated<T>(
  schema: z.ZodSchema<T>,
  options: {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
    modelOverride?: string;
    includeSchemaDescription?: boolean;
  }
): Promise<{ data: T; usage?: { promptTokens: number; completionTokens: number } }> {
  const { system, user, temperature = 0.1, maxTokens = AI_MAX_OUTPUT_TOKENS, modelOverride, includeSchemaDescription = true } = options;
  const schemaDescription = schemaToDescription(schema);

  const fullSystem = `${system}${includeSchemaDescription ? `

Return ONLY valid JSON matching this schema:
${schemaDescription}

No markdown fences. No commentary.` : '\nReturn ONLY valid JSON. No markdown fences. No commentary.'}`;

  const providers = getStructuredProviders(modelOverride);
  if (!providers.length) throw new Error('No AI provider is configured');
  let lastError: unknown;
  for (const provider of providers) {
    try {
      const messages = [{ role: 'system' as const, parts: [{ text: fullSystem }] }, { role: 'user' as const, parts: [{ text: user }] }];
      let text = await callAI((signal) => provider.call(messages, { temperature, maxTokens, signal }));
      let parsed = parseAndValidate(text, schema);
      if (!parsed.success) {
        const repairMessages = [{ role: 'system' as const, parts: [{ text: `${fullSystem}\nThe previous structured generation failed. Return a short complete object now. Do not repeat array items.` }] }, { role: 'user' as const, parts: [{ text: `${user}\nVALIDATION_ERROR: ${parsed.errors.map((item) => item.message).join(', ')}` }] }];
        text = await callAI((signal) => provider.call(repairMessages, { temperature, maxTokens, signal }));
        parsed = parseAndValidate(text, schema);
      }
      if (parsed.success) return { data: parsed.data };
      lastError = new Error(`${provider.name} returned invalid structured output: ${parsed.errors.map((item) => item.message).join(', ')}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw formatAIError(lastError || new Error('All AI providers failed'));
}

/**
 * Analyze an image with the vision model.
 * Throws AIVisionUnavailableError if vision is not configured.
 */
export async function analyzeImage<T>(
  schema: z.ZodSchema<T>,
  options: {
    system: string;
    user: string;
    imageUrl: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{ data: T; usage?: { promptTokens: number; completionTokens: number } }> {
  const visionModel = process.env.AI_VISION_MODEL;

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !visionModel) {
    throw new AIVisionUnavailableError();
  }

  const { system, user, imageUrl, temperature = 0.1, maxTokens = AI_MAX_OUTPUT_TOKENS } = options;
  const schemaDescription = schemaToDescription(schema);

  const fullSystem = `${system}

Return ONLY valid JSON matching this schema:
${schemaDescription}

No markdown fences. No commentary.`;

  const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  if (!imageResponse.ok) throw new Error(`Vision image fetch failed with HTTP ${imageResponse.status}`);
  const imageData = Buffer.from(await imageResponse.arrayBuffer()).toString('base64');
  const mimeType = imageResponse.headers.get('content-type')?.split(';')[0] || 'image/png';
  let response: string;
  try {
    response = await callAI(async (signal) => runCloudflareAI(visionModel, [{
      role: 'system',
      parts: [{ text: fullSystem }],
    }, {
      role: 'user',
      parts: [{ text: user }, { inline_data: { mime_type: mimeType, data: imageData } }],
    }], { temperature, maxTokens, signal }));
  } catch (error) {
    if (error instanceof Error && /No route for that URI|does not support image|unsupported.*vision/i.test(error.message)) {
      throw new AIVisionUnavailableError();
    }
    throw error;
  }
  const parsed = parseAndValidate(response, schema);
  if (!parsed.success) {
    throw new Error(`Vision validation failed: ${parsed.errors.map(e => e.message).join(', ')}`);
  }

  return {
    data: parsed.data,
  };
}

function parseAndValidate<T>(text: string, schema: z.ZodSchema<T>): { success: true; data: T } | { success: false; errors: z.ZodIssue[] } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  const candidates = fenced ? [fenced] : extractJsonObjects(text);
  let errors: z.ZodIssue[] = [{ code: 'custom', message: 'Invalid JSON response', path: [] }];
  for (const candidate of candidates) {
    try {
      const result = schema.safeParse(JSON.parse(candidate));
      if (result.success) return { success: true, data: result.data };
      errors = result.error.issues;
    } catch {
      // Continue past explanatory braces or partial JSON in model output.
    }
  }
  return { success: false, errors };
}

function extractJsonObjects(text: string): string[] {
  const objects: string[] = [];
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === '{') depth += 1;
    else if (character === '}' && --depth === 0) {
      objects.push(text.slice(start, index + 1));
      break;
    }
  }
  }
  return objects.length > 0 ? objects : [text];
}

function schemaToDescription(schema: z.ZodSchema): string {
  try {
    return JSON.stringify(compactJsonSchema(z.toJSONSchema(schema)));
  } catch {
    // Fall back to the compact legacy walker for schemas unsupported by Zod's
    // JSON Schema conversion.
  }
  // Simple schema description for prompt injection
  // Use any to avoid Zod v4 type issues
  const s: any = schema;
  
  if (s._def?.typeName === 'ZodObject') {
    const shape = s.shape;
    const props = Object.entries(shape).map(([key, value]: [string, any]) => {
      const desc = schemaToDescription(value);
      return `  "${key}": ${desc}`;
    }).join(',\n');
    return `{\n${props}\n}`;
  }
  if (s._def?.typeName === 'ZodArray') {
    return `[${schemaToDescription(s.element)}]`;
  }
  if (s._def?.typeName === 'ZodString') {
    return 'string';
  }
  if (s._def?.typeName === 'ZodNumber') {
    return 'number';
  }
  if (s._def?.typeName === 'ZodBoolean') {
    return 'boolean';
  }
  if (s._def?.typeName === 'ZodEnum') {
    return `enum[${s.options.join(', ')}]`;
  }
  if (s._def?.typeName === 'ZodLiteral') {
    return `"${s.value}"`;
  }
  if (s._def?.typeName === 'ZodUnion') {
    return `union[${s.options.map(schemaToDescription).join(', ')}]`;
  }
  if (s._def?.typeName === 'ZodOptional') {
    return `${schemaToDescription(s.unwrap())}?`;
  }
  if (s._def?.typeName === 'ZodNullable') {
    return `${schemaToDescription(s.unwrap())} | null`;
  }
  return 'any';
}

function compactJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compactJsonSchema);
  if (!value || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of ['$ref', 'type', 'enum', 'const', 'required', 'properties', 'items', 'anyOf', 'oneOf', 'minItems', 'maxItems', 'minLength', 'maxLength']) {
    if (key in source) result[key] = key === 'properties'
      ? Object.fromEntries(Object.entries(source.properties as Record<string, unknown>).map(([name, child]) => [name, compactJsonSchema(child)]))
      : compactJsonSchema(source[key]);
  }
  return result;
}

export { AIVisionUnavailableError };
export function isVisionUnavailable(error: unknown): error is AIVisionUnavailableError {
  return error instanceof AIVisionUnavailableError;
}
