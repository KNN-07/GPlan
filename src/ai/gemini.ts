import { z } from 'zod';
import type { ModelOption } from '../contracts';
import { AiError } from './error';
import { parseResponse, requestJson, type Credentials } from './transport';

const root = 'https://generativelanguage.googleapis.com/v1beta/';
const modelsSchema = z.object({
  models: z.array(z.object({
    name: z.string().regex(/^models\/[A-Za-z0-9][A-Za-z0-9._-]*$/),
    displayName: z.string().trim().min(1).optional(),
    supportedGenerationMethods: z.array(z.string()).optional(),
  })),
  nextPageToken: z.string().optional(),
});
const completionSchema = z.object({ candidates: z.array(z.object({
  content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })).min(1) }),
  finishReason: z.string().optional(),
})).min(1) });

function headers(apiKey: string): Record<string, string> {
  if (!apiKey.trim()) throw new AiError('authentication', 'Enter a Gemini API key.');
  return { 'x-goog-api-key': apiKey };
}

export async function discoverGemini(options: Credentials): Promise<readonly ModelOption[]> {
  const models = new Map<string, ModelOption>();
  const seenTokens = new Set<string>();
  let pageToken = '';
  do {
    const url = new URL('models', root);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const result = parseResponse(modelsSchema, await requestJson(url, {
      method: 'GET', headers: headers(options.apiKey), signal: options.signal,
    }));
    for (const model of result.models) {
      if (model.supportedGenerationMethods?.includes('generateContent')) {
        models.set(model.name, { id: model.name, label: model.displayName ?? model.name.slice('models/'.length) });
      }
    }
    pageToken = result.nextPageToken ?? '';
    if (pageToken && seenTokens.has(pageToken)) throw new AiError('invalid-response', 'The provider repeated a model page.');
    seenTokens.add(pageToken);
  } while (pageToken);
  return [...models.values()];
}

export async function generateGemini(options: Credentials & {
  readonly modelId: string; readonly instruction: string; readonly payload: string;
}): Promise<string> {
  const match = /^(?:models\/)?([A-Za-z0-9][A-Za-z0-9._-]*)$/.exec(options.modelId);
  if (!match) throw new AiError('provider', 'Enter a valid Gemini model ID.');
  const result = parseResponse(completionSchema, await requestJson(new URL(`models/${match[1]}:generateContent`, root), {
    method: 'POST', headers: { ...headers(options.apiKey), 'Content-Type': 'application/json' }, signal: options.signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.instruction }] },
      contents: [{ role: 'user', parts: [{ text: options.payload }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  }));
  const candidate = result.candidates[0];
  if (!candidate || (candidate.finishReason !== undefined && candidate.finishReason !== 'STOP')) {
    throw new AiError('invalid-response', 'The provider did not complete the plan.');
  }
  const text = candidate.content.parts.filter((part) => !part.thought).map((part) => part.text ?? '').join('');
  if (!text.trim()) throw new AiError('invalid-response', 'The provider did not return a plan.');
  return text;
}
