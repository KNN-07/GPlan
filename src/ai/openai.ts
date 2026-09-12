import { z } from 'zod';
import type { ModelOption } from '../contracts';
import { AiError } from './error';
import { parseResponse, requestJson, type Credentials } from './transport';

const modelsSchema = z.object({ data: z.array(z.object({ id: z.string().trim().min(1) })) });
const completionSchema = z.object({ choices: z.array(z.object({
  message: z.object({ content: z.string().trim().min(1) }),
  finish_reason: z.string().nullish(),
})).min(1) });

export function openAiRoot(baseUrl: string): URL {
  let url: URL;
  try { url = new URL(baseUrl); }
  catch (error) {
    if (error instanceof TypeError) throw new AiError('provider', 'Enter a valid provider base URL.');
    throw error;
  }
  const local = url.hostname === 'localhost' || url.hostname === '[::1]' || /^127\.\d+\.\d+\.\d+$/.test(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password || url.search || url.hash) {
    throw new AiError('provider', 'Use HTTPS (or localhost HTTP), without URL credentials, query parameters, or fragments.');
  }
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
  return url;
}

function headers(apiKey: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

export async function discoverOpenAi(root: URL, options: Credentials): Promise<readonly ModelOption[]> {
  const result = parseResponse(modelsSchema, await requestJson(new URL('models', root), {
    method: 'GET', headers: headers(options.apiKey), signal: options.signal,
  }));
  return [...new Set(result.data.map((model) => model.id))].map((id) => ({ id, label: id }));
}

export async function generateOpenAi(root: URL, options: Credentials & {
  readonly modelId: string; readonly instruction: string; readonly payload: string;
}): Promise<string> {
  const result = parseResponse(completionSchema, await requestJson(new URL('chat/completions', root), {
    method: 'POST', headers: { ...headers(options.apiKey), 'Content-Type': 'application/json' }, signal: options.signal,
    body: JSON.stringify({ model: options.modelId, messages: [
      { role: 'system', content: options.instruction }, { role: 'user', content: options.payload },
    ] }),
  }));
  const choice = result.choices[0];
  if (!choice || (choice.finish_reason != null && choice.finish_reason !== 'stop')) {
    throw new AiError('invalid-response', 'The provider did not complete the plan.');
  }
  return choice.message.content;
}
