import { createServer, type IncomingHttpHeaders } from 'node:http';
import { once } from 'node:events';
import type { AiPlanDraft, Exercise, PlanRequest } from '../contracts';

export type RecordedRequest = {
  method: string | undefined; url: string; headers: IncomingHttpHeaders; body: unknown;
};
type Reply = { status?: number; body?: unknown; raw?: string; hold?: boolean; disconnect?: boolean };

export async function startFixture() {
  const requests: RecordedRequest[] = [];
  const fixture = {
    requests,
    respond: (_request: RecordedRequest): Reply => ({ body: completion(JSON.stringify(draft)) }),
  };
  const server = createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => { body += chunk; });
    request.on('end', () => {
      const recorded = {
        method: request.method, url: request.url ?? '/', headers: request.headers,
        body: body ? JSON.parse(body) : undefined,
      };
      requests.push(recorded);
      const reply = fixture.respond(recorded);
      if (reply.disconnect) { request.socket.destroy(); return; }
      if (reply.hold) return;
      response.writeHead(reply.status ?? 200, { 'Content-Type': 'application/json' });
      response.end(reply.raw ?? JSON.stringify(reply.body));
    });
  });
  const listening = once(server, 'listening', { signal: AbortSignal.timeout(2000) });
  server.listen(0, '127.0.0.1');
  await listening;
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP fixture');
  return Object.assign(fixture, {
    server,
    baseUrl: `http://127.0.0.1:${address.port}/api/v1`,
    async close() {
      const closed = once(server, 'close', { signal: AbortSignal.timeout(2000) });
      server.closeAllConnections();
      server.close();
      await closed;
    },
  });
}

export const exercise: Exercise = {
  id: 'pushup', name: 'Push-up', aliases: ['Press-up'], primary: ['chest'], secondary: ['triceps'],
  movement: 'horizontal-push', equipmentOptions: [[]], difficulty: 'beginner',
  instructions: ['Lower and press.'], prescription: 'reps',
  animation: { family: 'horizontal-press', posture: 'prone', prop: 'none', unilateral: false },
};
export const catalog: readonly Exercise[] = [
  exercise,
  { ...exercise, id: 'plank', name: 'Plank', primary: ['core'], prescription: 'time' },
  { ...exercise, id: 'bench-press', equipmentOptions: [['barbell', 'bench']] },
  { ...exercise, id: 'db-press', equipmentOptions: [['barbell', 'bench'], ['dumbbells']] },
];
export const request: PlanRequest = {
  name: 'Strength', daysPerWeek: 1, exercisesPerDay: 2, focus: ['chest'], experience: 'beginner',
  gym: { availableEquipment: ['dumbbells'] },
};
export const draft: AiPlanDraft = {
  name: 'Strength', days: [{ name: 'Day One', items: [
    { exerciseId: 'pushup', sets: 3, prescription: { kind: 'reps', min: 8, max: 12 }, restSeconds: 60 },
    { exerciseId: 'plank', sets: 2, prescription: { kind: 'time', seconds: 30 }, restSeconds: 0 },
  ] }],
};
export function completion(content: string) {
  return { choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }] };
}
export function geminiCompletion(text: string) {
  return { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] };
}
