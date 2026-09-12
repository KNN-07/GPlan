import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { exercises, exerciseById } from '../../../src/catalog';
import { createLocalPlan, materializeAiPlan, replaceExercise } from '../../../src/core/planner';
import { findSwaps, isAvailable } from '../../../src/core/catalog';
import { defaultState, exportState, importState } from '../../../src/core/storage';
import { discoverModels, generatePlan } from '../../../src/ai';
import { sampleMotion } from '../../../src/graphics/motions';
import type { PlanRequest, PlannerState } from '../../../src/contracts';
const request: PlanRequest = { name: 'Integrated verification', daysPerWeek: 2, exercisesPerDay: 4, focus: [], experience: 'beginner', gym: { availableEquipment: ['dumbbells'] } };
let id = 0;
const context = { now: '2026-09-12T05:45:00.000Z', newId: () => `verification-${++id}` };
const local = createLocalPlan(request, context);
assert.ok(local.ok);
const draft = { name: local.value.name, days: local.value.days.map(day => ({ name: day.name, items: day.items.map(({ id: _id, ...item }) => item) })) };
const requests: Array<{url: string; authorization: string | undefined; body: any}> = [];
const server = createServer((incoming, response) => {
  let body = '';
  incoming.setEncoding('utf8');
  incoming.on('data', chunk => { body += chunk; });
  incoming.on('end', () => {
    requests.push({ url: incoming.url!, authorization: incoming.headers.authorization, body: body ? JSON.parse(body) : null });
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(incoming.url === '/v1/models' ? { data: [{ id: 'verification-model' }] } : { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(draft) } }] }));
  });
});
const listening = once(server, 'listening', { signal: AbortSignal.timeout(5000) });
server.listen(0, '127.0.0.1');
await listening;
try {
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const config = { provider: 'openai-compatible' as const, baseUrl: `http://127.0.0.1:${address.port}/v1` };
  const apiKey = 'integration-transient-sentinel';
  assert.deepEqual(await discoverModels({ config, apiKey }), [{ id: 'verification-model', label: 'verification-model' }]);
  const aiDraft = await generatePlan({ config, apiKey, modelId: 'verification-model', request, catalog: exercises });
  assert.deepEqual(aiDraft, draft);
  let plan = materializeAiPlan(aiDraft, context);
  assert.equal(plan.source, 'ai');
  const day = plan.days[0]!;
  const item = day.items[0]!;
  const replacement = findSwaps(item.exerciseId, request.gym)[0]!;
  assert.ok(replacement);
  assert.ok(isAvailable(replacement.exercise, request.gym));
  plan = replaceExercise(plan, day.id, item.id, replacement.exercise.id, context.now);
  const state: PlannerState = { ...defaultState, gym: request.gym, plans: [local.value, plan], activePlanId: plan.id, aiPreferences: { config, modelId: 'verification-model' } };
  const serialized = exportState(state);
  assert.ok(!serialized.includes(apiKey));
  assert.deepEqual(importState(serialized), { ok: true, value: state });
  let poses = 0;
  for (const workout of state.plans) for (const day of workout.days) for (const item of day.items) {
    const exercise = exerciseById.get(item.exerciseId)!;
    assert.ok(exercise);
    assert.ok(isAvailable(exercise, request.gym));
    assert.equal(exercise.prescription, item.prescription.kind);
    assert.doesNotThrow(() => sampleMotion(exercise.animation, .5, exercise.movement));
    poses++;
  }
  assert.deepEqual(requests.map(r => r.url), ['/v1/models', '/v1/chat/completions']);
  assert.ok(requests.every(r => r.authorization === `Bearer ${apiKey}`));
  const payload = JSON.parse(requests[1]!.body.messages.find((m: {role: string}) => m.role === 'user').content);
  assert.deepEqual(payload.catalog.map((e: {id: string}) => e.id), exercises.filter(e => isAvailable(e, request.gym)).map(e => e.id));
  assert.ok(!JSON.stringify(requests[1]!.body).includes(apiKey));
  console.log(JSON.stringify({ result: 'PASS', stages: ['local plan', 'real HTTP discovery', 'real HTTP generation against bundled catalog', 'AI draft materialization', 'ranked available swap', 'strict state export/import', 'graphics sampling of all resulting items'], requests: requests.map(r => r.url), eligibleCatalog: payload.catalog.length, savedPlans: state.plans.length, sampledItems: poses, persistedCredential: false }, null, 2));
} finally {
  const closed = once(server, 'close', { signal: AbortSignal.timeout(5000) });
  server.closeAllConnections(); server.close(); await closed;
}
