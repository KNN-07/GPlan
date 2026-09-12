// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generatePlan } from './index';
import { catalog, completion, draft, request, startFixture } from './fixture';

let fixture: Awaited<ReturnType<typeof startFixture>>;
beforeEach(async () => { fixture = await startFixture(); });
afterEach(async () => { await fixture.close(); });
function generate() {
  return generatePlan({ config: { provider: 'openai-compatible', baseUrl: fixture.baseUrl }, apiKey: 'key', modelId: 'manual', request, catalog });
}
const item = draft.days[0]?.items[0];
function withItem(changes: Record<string, unknown>) {
  return { ...draft, days: [{ name: 'Day One', items: [{ ...item, ...changes }, draft.days[0]?.items[1]] }] };
}

describe('strict plan parsing', () => {
  it.each([
    JSON.stringify(draft),
    `  \n\`\`\`json\n${JSON.stringify(draft)}\n\`\`\`  `,
    `\`\`\`\n${JSON.stringify(draft)}\n\`\`\``,
  ])('accepts a complete JSON document or enclosing fence', async (content) => {
    // Given
    fixture.respond = () => ({ body: completion(content) });
    // When / Then
    expect(await generate()).toEqual(draft);
  });

  it.each([
    ['unknown exercise', withItem({ exerciseId: 'hallucination' })],
    ['unavailable exercise', withItem({ exerciseId: 'bench-press' })],
    ['missing ID', withItem({ exerciseId: undefined })],
    ['empty ID', withItem({ exerciseId: '' })],
    ['wrong kind', withItem({ prescription: { kind: 'time', seconds: 30 } })],
    ['zero sets', withItem({ sets: 0 })],
    ['fractional sets', withItem({ sets: 2.5 })],
    ['excessive sets', withItem({ sets: 21 })],
    ['string sets', withItem({ sets: '3' })],
    ['negative rest', withItem({ restSeconds: -1 })],
    ['excessive rest', withItem({ restSeconds: 1801 })],
    ['fractional rest', withItem({ restSeconds: 0.5 })],
    ['reversed reps', withItem({ prescription: { kind: 'reps', min: 12, max: 8 } })],
    ['zero reps', withItem({ prescription: { kind: 'reps', min: 0, max: 8 } })],
    ['excessive reps', withItem({ prescription: { kind: 'reps', min: 1, max: 101 } })],
    ['fractional reps', withItem({ prescription: { kind: 'reps', min: 1.5, max: 8 } })],
    ['zero duration', withItem({ exerciseId: 'plank', prescription: { kind: 'time', seconds: 0 } })],
    ['excessive duration', withItem({ exerciseId: 'plank', prescription: { kind: 'time', seconds: 3601 } })],
    ['extra prescription fields', withItem({ prescription: { kind: 'reps', min: 8, max: 12, seconds: 30 } })],
    ['extra item fields', withItem({ id: 'provider-assigned-id' })],
    ['extra plan fields', { ...draft, source: 'ai' }],
    ['blank plan name', { ...draft, name: '   ' }],
    ['blank day name', { ...draft, days: [{ ...draft.days[0], name: '  ' }] }],
    ['wrong day count', { ...draft, days: [] }],
    ['too many days', { ...draft, days: [...draft.days, ...draft.days] }],
    ['wrong item count', { ...draft, days: [{ name: 'Day', items: [item] }] }],
    ['duplicate daily exercises', { ...draft, days: [{ name: 'Day', items: [item, item] }] }],
  ])('rejects %s from the provider', async (_label, response) => {
    // Given
    fixture.respond = () => ({ body: completion(JSON.stringify(response)) });
    // When / Then
    await expect(generate()).rejects.toMatchObject({ name: 'AiError', code: 'invalid-response' });
  });

  it.each([
    'not JSON', `Here is your plan: ${JSON.stringify(draft)}`,
    `${JSON.stringify(draft)} trailing prose`,
    `\`\`\`json\n${JSON.stringify(draft)}\n\`\`\` and explanation`,
    JSON.stringify(draft).replace('"sets":3', '"sets":1e999'),
    JSON.stringify(draft).replace('"sets":3', '"sets":NaN'),
  ])('does not repair malformed or nonfinite JSON', async (content) => {
    // Given
    fixture.respond = () => ({ body: completion(content) });
    // When / Then
    await expect(generate()).rejects.toMatchObject({ code: 'invalid-response' });
  });
});


it('accepts exact multi-day counts and the finite upper bounds', async () => {
  // Given
  const day = { name: 'Day', items: [
    { exerciseId: 'db-press', sets: 20, prescription: { kind: 'reps', min: 1, max: 100 }, restSeconds: 1800 },
    { exerciseId: 'plank', sets: 1, prescription: { kind: 'time', seconds: 3600 }, restSeconds: 0 },
  ] };
  const expected = { name: 'Strength', days: [day, { ...day, name: 'Day Two' }] };
  fixture.respond = () => ({ body: completion(JSON.stringify(expected)) });
  // When / Then
  expect(await generatePlan({ config: { provider: 'openai-compatible', baseUrl: fixture.baseUrl }, apiKey: '', modelId: 'manual',
    request: { ...request, daysPerWeek: 2 }, catalog })).toEqual(expected);
});

it('rejects reps for a time-prescribed catalog exercise', async () => {
  // Given
  fixture.respond = () => ({ body: completion(JSON.stringify(withItem({ exerciseId: 'plank' }))) });
  // When / Then
  await expect(generate()).rejects.toMatchObject({ code: 'invalid-response' });
});
