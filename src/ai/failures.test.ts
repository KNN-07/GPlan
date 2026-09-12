// @vitest-environment node
import { once } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AiError, discoverModels, generatePlan } from './index';
import { catalog, request, startFixture } from './fixture';

let fixture: Awaited<ReturnType<typeof startFixture>>;
beforeEach(async () => { fixture = await startFixture(); });
afterEach(async () => { vi.unstubAllGlobals(); await fixture.close(); });
function options() { return { config: { provider: 'openai-compatible', baseUrl: fixture.baseUrl } as const, apiKey: 'secret-key' }; }

it.each([[401, 'authentication'], [403, 'authentication'], [429, 'rate-limit'], [500, 'provider']])('maps HTTP %s to %s without exposing provider content', async (status, code) => {
  // Given
  fixture.respond = () => ({ status: Number(status), body: { error: { message: 'secret-key echoed in provider error' } } });
  // When
  const result = discoverModels(options());
  // Then
  await expect(result).rejects.toBeInstanceOf(AiError);
  await expect(result).rejects.toMatchObject({ code, status });
  await expect(result).rejects.not.toHaveProperty('message', expect.stringContaining('secret-key'));
});

it.each([{ raw: '{' }, { body: {} }, { body: { data: [{ id: '' }] } }, { body: { data: 'bad' } }])('rejects malformed discovery responses', async (reply) => {
  // Given
  fixture.respond = () => reply;
  // When / Then
  await expect(discoverModels(options())).rejects.toMatchObject({ code: 'invalid-response' });
});

it.each([{ choices: [] }, { choices: [{ message: { content: null } }] }, { choices: [{ message: { content: ' ' } }] }])('rejects malformed generation envelopes', async (body) => {
  // Given
  fixture.respond = () => ({ body });
  // When / Then
  await expect(generatePlan({ ...options(), modelId: 'manual', request, catalog })).rejects.toMatchObject({ code: 'invalid-response' });
});

it.each(['http://example.com/api/v1', 'https://user:secret@example.com/v1', 'ftp://localhost/v1', 'not-a-url', 'https://example.com/v1?key=secret', 'https://example.com/v1#token', 'http://localhost.evil.test/v1'])('rejects unsafe base URL %s before network access', async (baseUrl) => {
  // Given
  const fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  // When / Then
  await expect(discoverModels({ ...options(), config: { provider: 'openai-compatible', baseUrl } })).rejects.toMatchObject({ code: 'provider' });
  expect(fetchSpy).not.toHaveBeenCalled();
});

it('maps a disconnected HTTP fixture to a network error', async () => {
  // Given
  fixture.respond = () => ({ disconnect: true });
  // When / Then
  await expect(discoverModels(options())).rejects.toMatchObject({ code: 'network' });
});

it('maps browser CORS failure to a sanitized network error', async () => {
  // Given: browsers expose blocked CORS as a rejected fetch, not an HTTP response.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch secret-key')));
  // When / Then
  await expect(discoverModels(options())).rejects.toMatchObject({ code: 'network', message: expect.not.stringContaining('secret-key') });
});

it.each(['discovery', 'generation'])('aborts in-flight %s on the exact request event', async (operation) => {
  // Given
  fixture.respond = () => ({ hold: true });
  const controller = new AbortController();
  const received = once(fixture.server, 'request', { signal: AbortSignal.timeout(2000) });
  // When
  const result = operation === 'discovery'
    ? discoverModels({ ...options(), signal: controller.signal })
    : generatePlan({ ...options(), modelId: 'manual', request, catalog, signal: controller.signal });
  const rejected = expect(result).rejects.toMatchObject({ code: 'aborted' });
  // Then: observe both promises immediately, including the RED path.
  await Promise.all([received.then(() => controller.abort('private reason secret-key')), rejected]);
});

it('rejects a pre-aborted signal before sending a request', async () => {
  // Given
  const controller = new AbortController();
  controller.abort();
  // When / Then
  await expect(discoverModels({ ...options(), signal: controller.signal })).rejects.toMatchObject({ code: 'aborted' });
  expect(fixture.requests).toHaveLength(0);
});
