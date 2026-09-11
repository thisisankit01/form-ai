/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { AIVisionUnavailableError } from './vision-unavailable';

// Provider configuration from environment
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://api.deepseek.com/v1';
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';
const AI_MAX_OUTPUT_TOKENS = parseInt(process.env.APP_AI_MAX_OUTPUT_TOKENS || '8000', 10);

if (!AI_API_KEY) {
  throw new Error('AI_API_KEY environment variable is required');
}

const provider = createOpenAICompatible({
  name: 'deepseek',
  baseURL: AI_BASE_URL,
  apiKey: AI_API_KEY,
});

const textModel = provider(AI_MODEL);

async function generateGeminiJson(system: string, user: string, temperature: number, maxTokens: number): Promise<string> {
  const apiKey = process.env.AI_VISION_API_KEY;
  const model = process.env.AI_VISION_MODEL;
  if (!apiKey || !model) throw new Error('Gemini fallback is not configured');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: user }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Gemini fallback failed with HTTP ${response.status}`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
}

async function generateJson(system: string, user: string, temperature: number, maxTokens: number, model: any) {
  try {
    return await generateText({ model, system, prompt: user, temperature });
  } catch (error: any) {
    if (error?.statusCode !== 402 && error?.status !== 402) throw error;
    return { text: await generateGeminiJson(system, user, temperature, maxTokens), usage: undefined };
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
  }
): Promise<{ data: T; usage?: { promptTokens: number; completionTokens: number } }> {
  const { system, user, temperature = 0.1, maxTokens = AI_MAX_OUTPUT_TOKENS, modelOverride } = options;
  const model = modelOverride ? provider(modelOverride) : textModel;

  const schemaDescription = schemaToDescription(schema);

  const fullSystem = `${system}

Return ONLY valid JSON matching this schema:
${schemaDescription}

No markdown fences. No commentary.`;

  // First attempt
  let result = await generateJson(fullSystem, user, temperature, maxTokens, model);

  let parsed = parseAndValidate(result.text, schema);
  if (parsed.success) {
    return {
      data: parsed.data,
      usage: result.usage ? { promptTokens: result.usage.inputTokens || 0, completionTokens: result.usage.outputTokens || 0 } : undefined,
    };
  }

  // Bounded repair: one retry with validation errors
  const repairPrompt = `${fullSystem}

The previous response failed validation:
${parsed.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')}

Original response:
${result.text}

Return corrected JSON only.`;

  result = await generateJson(repairPrompt, user, temperature, maxTokens, model);

  parsed = parseAndValidate(result.text, schema);
  if (!parsed.success) {
    throw new Error(`Validation failed after repair: ${parsed.errors.map(e => e.message).join(', ')}`);
  }

  return {
    data: parsed.data,
    usage: result.usage ? { promptTokens: result.usage.inputTokens || 0, completionTokens: result.usage.outputTokens || 0 } : undefined,
  };
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
  const { AI_VISION_BASE_URL, AI_VISION_API_KEY, AI_VISION_MODEL } = process.env;

  if (!AI_VISION_BASE_URL || !AI_VISION_API_KEY || !AI_VISION_MODEL) {
    throw new AIVisionUnavailableError();
  }

  const { system, user, imageUrl, temperature = 0.1 } = options;
  const schemaDescription = schemaToDescription(schema);

  const fullSystem = `${system}

Return ONLY valid JSON matching this schema:
${schemaDescription}

No markdown fences. No commentary.`;

  const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  if (!imageResponse.ok) throw new Error(`Vision image fetch failed with HTTP ${imageResponse.status}`);
  const imageData = Buffer.from(await imageResponse.arrayBuffer()).toString('base64');
  const mimeType = imageResponse.headers.get('content-type')?.split(';')[0] || 'image/png';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(AI_VISION_MODEL)}:generateContent?key=${encodeURIComponent(AI_VISION_API_KEY)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: fullSystem }] },
      contents: [{ parts: [{ text: user }, { inlineData: { mimeType, data: imageData } }] }],
      generationConfig: { temperature, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Vision API failed with HTTP ${response.status}`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  const parsed = parseAndValidate(text, schema);
  if (!parsed.success) {
    throw new Error(`Vision validation failed: ${parsed.errors.map(e => e.message).join(', ')}`);
  }

  return {
    data: parsed.data,
  };
}

function parseAndValidate<T>(text: string, schema: z.ZodSchema<T>): { success: true; data: T } | { success: false; errors: z.ZodIssue[] } {
  try {
    // Extract JSON from response (handles potential code fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;
    const parsed = JSON.parse(jsonText);
    const result = schema.safeParse(parsed);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, errors: result.error.issues };
  } catch {
    return { success: false, errors: [{ code: 'custom', message: 'Invalid JSON response', path: [] }] };
  }
}

function schemaToDescription(schema: z.ZodSchema): string {
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

export { AIVisionUnavailableError };
export function isVisionUnavailable(error: unknown): error is AIVisionUnavailableError {
  return error instanceof AIVisionUnavailableError;
}
