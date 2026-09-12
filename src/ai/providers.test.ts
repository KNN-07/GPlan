// @vitest-environment node
import { once } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { discoverModels, generatePlan } from './index';
import { catalog, completion, draft, geminiCompletion, request, startFixture } from './fixture';

let fixture: Awaited<ReturnType<typeof startFixture>>;
beforeEach(async () => { fixture = await startFixture(); });
afterEach(async () => { vi.unstubAllGlobals(); await fixture.close(); });
const apiKey = 'transient-test-secret';
function config() { return { provider: 'openai-compatible', baseUrl: fixture.baseUrl } as const; }
function redirectGemini() {
  const nativeFetch = globalThis.fetch;
  const originalUrls: string[] = [];
  vi.stubGlobal('fetch', (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input);
    originalUrls.push(url.href);
    if (url.origin !== 'https://generativelanguage.googleapis.com') throw new Error('Wrong Gemini origin');
    const local = new URL(fixture.baseUrl);
    return nativeFetch(`${local.origin}${url.pathname}${url.search}`, init);
  });
  return originalUrls;
}

describe('OpenAI-compatible wire interface', () => {
  it.each(['', '/', '///'])('preserves API root with trailing slash %s when discovering models', async (slash) => {
    // Given
    fixture.respond = () => ({ body: { data: [{ id: 'local/model' }, { id: 'other' }, { id: 'other' }] } });
    // When
    const models = await discoverModels({ config: { ...config(), baseUrl: fixture.baseUrl + slash }, apiKey });
    // Then
    expect(models).toEqual([{ id: 'local/model', label: 'local/model' }, { id: 'other', label: 'other' }]);
    expect(fixture.requests).toMatchObject([{ method: 'GET', url: '/api/v1/models', headers: { authorization: `Bearer ${apiKey}` } }]);
    expect(fixture.requests[0]?.url).not.toContain(apiKey);
  });

  it('generates with an undiscovered manual model when provided directly', async () => {
    // Given
    fixture.respond = () => ({ body: completion(JSON.stringify(draft)) });
    // When
    const result = await generatePlan({ config: config(), apiKey, modelId: 'owner/manual-model', request, catalog });
    // Then
    expect(result).toEqual(draft);
    expect(fixture.requests).toHaveLength(1);
    expect(fixture.requests[0]).toMatchObject({ method: 'POST', url: '/api/v1/chat/completions', headers: {
      authorization: `Bearer ${apiKey}`, 'content-type': 'application/json',
    }, body: { model: 'owner/manual-model' } });
    const body = z.object({ messages: z.array(z.object({ role: z.string(), content: z.string() })) }).parse(fixture.requests[0]?.body);
    const user = body.messages.find((message) => message.role === 'user');
    const payload = z.object({ request: z.unknown(), catalog: z.array(z.object({ id: z.string() }).passthrough()) }).parse(JSON.parse(user?.content ?? 'null'));
    expect(payload.request).toEqual(request);
    expect(payload.catalog.map((item) => item.id)).toEqual(['pushup', 'plank', 'db-press']);
    expect(payload.catalog[0]).toMatchObject({ name: 'Push-up', primary: ['chest'], prescription: 'reps' });
    expect(payload.catalog[0]).not.toHaveProperty('animation');
    expect(payload.catalog[0]).not.toHaveProperty('instructions');
    expect(JSON.stringify(fixture.requests[0]?.body)).not.toContain(apiKey);
  });

  it('omits authentication when a local server uses no API key', async () => {
    // Given
    fixture.respond = () => ({ body: { data: [] } });
    // When
    expect(await discoverModels({ config: config(), apiKey: '' })).toEqual([]);
    // Then
    expect(fixture.requests[0]?.headers).not.toHaveProperty('authorization');
  });
});

describe('Gemini wire interface', () => {
  it('paginates and filters generateContent models when discovering', async () => {
    // Given
    const urls = redirectGemini();
    fixture.respond = (received) => ({ body: received.url.includes('pageToken=') ? {
      models: [{ name: 'models/gemini-second', supportedGenerationMethods: ['generateContent'] }],
    } : {
      models: [
        { name: 'models/gemini-first', displayName: 'First', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/embed', supportedGenerationMethods: ['embedContent'] },
      ], nextPageToken: 'next +/?',
    } });
    // When
    const models = await discoverModels({ config: { provider: 'gemini' }, apiKey });
    // Then
    expect(models).toEqual([{ id: 'models/gemini-first', label: 'First' }, { id: 'models/gemini-second', label: 'gemini-second' }]);
    expect(urls[0]).toBe('https://generativelanguage.googleapis.com/v1beta/models');
    expect(new URL(urls[1] ?? '').searchParams.get('pageToken')).toBe('next +/?');
    expect(fixture.requests).toHaveLength(2);
    for (const received of fixture.requests) {
      expect(received.headers['x-goog-api-key']).toBe(apiKey);
      expect(received.url).not.toContain(apiKey);
      expect(received.headers).not.toHaveProperty('authorization');
    }
  });

  it.each(['gemini-manual', 'models/gemini-manual'])('generates with manual model %s without discovery', async (modelId) => {
    // Given
    redirectGemini();
    fixture.respond = () => ({ body: geminiCompletion(JSON.stringify(draft)) });
    // When
    expect(await generatePlan({ config: { provider: 'gemini' }, apiKey, modelId, request, catalog })).toEqual(draft);
    // Then
    expect(fixture.requests).toHaveLength(1);
    expect(fixture.requests[0]).toMatchObject({ method: 'POST', url: '/v1beta/models/gemini-manual:generateContent',
      headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
      body: { generationConfig: { responseMimeType: 'application/json' }, contents: [{ role: 'user' }] },
    });
  });

  it('rejects repeated pagination tokens rather than looping', async () => {
    // Given
    redirectGemini();
    fixture.respond = () => ({ body: { models: [], nextPageToken: 'loop' } });
    // When / Then
    await expect(discoverModels({ config: { provider: 'gemini' }, apiKey })).rejects.toMatchObject({ code: 'invalid-response' });
    expect(fixture.requests).toHaveLength(2);
  });
});


describe('Gemini response failures and cancellation', () => {
  it.each([{}, { models: [{ name: 'invalid-model-resource' }] }, { models: [], nextPageToken: 123 }])('rejects malformed model pages', async (body) => {
    // Given
    redirectGemini();
    fixture.respond = () => ({ body });
    // When / Then
    await expect(discoverModels({ config: { provider: 'gemini' }, apiKey })).rejects.toMatchObject({ code: 'invalid-response' });
  });

  it.each([
    {}, { candidates: [] }, { candidates: [{ content: { parts: [] } }] },
    { candidates: [{ content: { parts: [{ text: ' ' }] } }] },
    { candidates: [{ content: { parts: [{ text: JSON.stringify(draft) }] }, finishReason: 'MAX_TOKENS' }] },
    geminiCompletion(JSON.stringify({ ...draft, days: [] })),
  ])('rejects malformed, incomplete, or request-mismatching generated plans', async (body) => {
    // Given
    redirectGemini();
    fixture.respond = () => ({ body });
    // When / Then
    await expect(generatePlan({ config: { provider: 'gemini' }, apiKey, modelId: 'gemini-manual', request, catalog })).rejects.toMatchObject({ code: 'invalid-response' });
  });

  it('joins response text parts while excluding Gemini thought parts', async () => {
    // Given
    redirectGemini();
    const json = JSON.stringify(draft);
    fixture.respond = () => ({ body: { candidates: [{ content: { parts: [
      { thought: true, text: 'private reasoning' }, { text: json.slice(0, 40) }, { text: json.slice(40) },
    ] }, finishReason: 'STOP' }] } });
    // When / Then
    expect(await generatePlan({ config: { provider: 'gemini' }, apiKey, modelId: 'gemini-manual', request, catalog })).toEqual(draft);
  });

  it.each([[401, 'authentication'], [429, 'rate-limit'], [500, 'provider']])('maps Gemini HTTP %s to %s', async (status, code) => {
    // Given
    redirectGemini();
    fixture.respond = () => ({ status: Number(status), body: { error: { message: apiKey } } });
    // When / Then
    await expect(generatePlan({ config: { provider: 'gemini' }, apiKey, modelId: 'gemini-manual', request, catalog })).rejects.toMatchObject({ code, status, message: expect.not.stringContaining(apiKey) });
  });

  it.each(['../other', 'models/a?key=secret', ''])('rejects unsafe or empty Gemini model ID %s', async (modelId) => {
    // Given
    const urls = redirectGemini();
    // When / Then
    await expect(generatePlan({ config: { provider: 'gemini' }, apiKey, modelId, request, catalog })).rejects.toMatchObject({ code: 'provider' });
    expect(urls).toEqual([]);
  });

  it('requires a Gemini key without sending unauthenticated requests', async () => {
    // Given
    const urls = redirectGemini();
    // When / Then
    await expect(discoverModels({ config: { provider: 'gemini' }, apiKey: '' })).rejects.toMatchObject({ code: 'authentication' });
    expect(urls).toEqual([]);
  });

  it.each(['discovery', 'generation'])('aborts Gemini %s on the exact request event', async (operation) => {
    // Given
    redirectGemini();
    fixture.respond = () => ({ hold: true });
    const controller = new AbortController();
    const received = once(fixture.server, 'request', { signal: AbortSignal.timeout(2000) });
    const options = { config: { provider: 'gemini' } as const, apiKey, signal: controller.signal };
    // When
    const result = operation === 'discovery' ? discoverModels(options)
      : generatePlan({ ...options, modelId: 'gemini-manual', request, catalog });
    // Then
    await Promise.all([received.then(() => controller.abort()), expect(result).rejects.toMatchObject({ code: 'aborted' })]);
  });
});
