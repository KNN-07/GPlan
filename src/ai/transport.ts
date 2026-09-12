import { z } from 'zod';
import { AiError } from './error';

export type Credentials = { readonly apiKey: string; readonly signal?: AbortSignal };

export function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AiError('invalid-response', 'The provider returned an invalid response.');
  return parsed.data;
}

export async function requestJson(url: URL, init: RequestInit): Promise<unknown> {
  const callerSignal = init.signal;
  if (callerSignal?.aborted) throw new AiError('aborted', 'The AI request was cancelled.');
  const deadline = AbortSignal.timeout(60_000);
  const signal = callerSignal ? AbortSignal.any([callerSignal, deadline]) : deadline;
  try {
    // Native browser fetch is required: the frozen dependency scope excludes HTTP libraries.
    // Explicit deadline, no retries (generation may be billed), no redirects or cookie credentials.
    const response = await fetch(url, { ...init, signal, redirect: 'error', credentials: 'omit', cache: 'no-store' });
    if (!response.ok) {
      const code = response.status === 401 || response.status === 403 ? 'authentication'
        : response.status === 429 ? 'rate-limit' : 'provider';
      throw new AiError(code, code === 'authentication' ? 'The provider rejected the API key.'
        : code === 'rate-limit' ? 'The provider rate limit was reached.'
        : 'The AI provider request failed.', response.status);
    }
    return await response.json();
  } catch (error) {
    if (callerSignal?.aborted) throw new AiError('aborted', 'The AI request was cancelled.');
    if (error instanceof AiError) throw error;
    if (error instanceof SyntaxError) throw new AiError('invalid-response', 'The provider did not return valid JSON.');
    // Fetch/body failures (including browser CORS and timeout) cross this external boundary.
    // Never attach upstream messages/causes: providers may echo credentials in them.
    throw new AiError('network', deadline.aborted ? 'The AI provider request timed out.'
      : 'Unable to reach the AI provider. Check the connection and server CORS settings.');
  }
}
