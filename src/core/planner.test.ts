import { describe, expect, it } from 'vitest';
import type { AiPlanDraft, CreationContext, PlanRequest, WorkoutPlan } from '../contracts';
import { exerciseById } from '../catalog';
import { isAvailable } from './catalog';
import { createLocalPlan, materializeAiPlan, replaceExercise } from './planner';
import { defaultState } from './storage';

const now = '2026-09-12T12:00:00.000Z';
function context(): CreationContext { let id = 0; return { now, newId:() => `id-${++id}` }; }
const request: PlanRequest = { name:'Training', daysPerWeek:3, exercisesPerDay:5, focus:[], experience:'beginner', gym:defaultState.gym };
const plan: WorkoutPlan = { id:'p', name:'Manual', source:'manual', createdAt:now, updatedAt:now, days:[{ id:'d', name:'Day', items:[{ id:'i', exerciseId:'push-up', sets:4, prescription:{ kind:'reps', min:5, max:7 }, restSeconds:120 }] }] };

describe('local generation', () => {
  it('creates repeatable complete plans with injected identity and time', () => {
    // Given / When
    const first = createLocalPlan(request, context());
    const second = createLocalPlan(request, context());
    // Then
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(first.error.message);
    expect(first.value).toMatchObject({ name:request.name, source:'local', createdAt:now, updatedAt:now });
    expect(first.value.days).toHaveLength(3);
    const ids = [first.value.id, ...first.value.days.flatMap(d => [d.id, ...d.items.map(i => i.id)])];
    expect(new Set(ids).size).toBe(ids.length);
    for (const day of first.value.days) {
      expect(day.items).toHaveLength(5);
      expect(new Set(day.items.map(i => i.exerciseId)).size).toBe(5);
      for (const item of day.items) {
        const exercise = exerciseById.get(item.exerciseId);
        if (!exercise) throw new Error('Unknown generated exercise');
        expect(exercise.difficulty).toBe('beginner');
        expect(isAvailable(exercise, request.gym)).toBe(true);
        expect(item).toMatchObject({ sets:3, restSeconds:90, prescription:exercise.prescription === 'time' ? { kind:'time', seconds:30 } : { kind:'reps', min:8, max:12 } });
      }
    }
  });
  it('uses only bodyweight primary focus exercises when restricted', () => {
    // Given / When
    const result = createLocalPlan({ ...request, focus:['core'], gym:{ availableEquipment:[] }, exercisesPerDay:3 }, context());
    // Then
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.days.flatMap(d => d.items).every(i => exerciseById.get(i.exerciseId)?.primary.includes('core'))).toBe(true);
  });
  it('returns an explicit insufficient-options error rather than duplicate filler', () => {
    // Given / When
    const result = createLocalPlan({ ...request, focus:['biceps'], gym:{ availableEquipment:[] } }, context());
    // Then
    expect(result).toMatchObject({ ok:false, error:{ code:'insufficient-options' } });
  });
  it('covers all primary groups across an unrestricted three-day week', () => {
    // Given / When
    const result = createLocalPlan({ ...request, exercisesPerDay:6 }, context());
    // Then
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    const covered = new Set(result.value.days.flatMap(day => day.items.flatMap(item => exerciseById.get(item.exerciseId)?.primary ?? [])));
    expect(covered.size).toBe(11);
  });
  it.each([0, -1, 1.5, NaN, 8])('rejects invalid day counts %s at the user boundary', daysPerWeek => {
    // Given / When / Then
    expect(createLocalPlan({ ...request, daysPerWeek }, context())).toMatchObject({ ok:false, error:{ code:'invalid-request' } });
  });
});

describe('plan operations', () => {
  it('materializes AI drafts with fresh identity and no input aliasing', () => {
    // Given
    const draft: AiPlanDraft = { name:'AI', days:[{ name:'A', items:[{ exerciseId:'plank', sets:2, prescription:{ kind:'time', seconds:45 }, restSeconds:60 }] }] };
    // When
    const result = materializeAiPlan(draft, context());
    // Then
    expect(result).toMatchObject({ name:'AI', source:'ai', createdAt:now, updatedAt:now });
    expect(result.days[0]?.items[0]).toMatchObject(draft.days[0]?.items[0] ?? {});
    expect(result.days[0]?.items[0]?.prescription).not.toBe(draft.days[0]?.items[0]?.prescription);
    expect(new Set([result.id, result.days[0]?.id, result.days[0]?.items[0]?.id]).size).toBe(3);
  });
  it('retains item identity, sets, rest and same-kind prescription when replacing', () => {
    // Given
    const before = structuredClone(plan);
    // When
    const result = replaceExercise(plan, 'd', 'i', 'dumbbell-floor-press', '2026-09-13T12:00:00.000Z');
    // Then
    expect(plan).toEqual(before);
    expect(result).not.toBe(plan);
    expect(result.days[0]?.items[0]).toEqual({ ...plan.days[0]?.items[0], exerciseId:'dumbbell-floor-press' });
    expect(result.updatedAt).toBe('2026-09-13T12:00:00.000Z');
  });
  it('resets only the prescription when replacing reps with time', () => {
    // Given / When
    const result = replaceExercise(plan, 'd', 'i', 'plank', now);
    // Then
    expect(result.days[0]?.items[0]).toEqual({ id:'i', exerciseId:'plank', sets:4, prescription:{ kind:'time', seconds:30 }, restSeconds:120 });
  });
  it('leaves the plan unchanged for an unknown replacement or target', () => {
    // Given / When / Then
    expect(replaceExercise(plan, 'd', 'i', 'missing', now)).toBe(plan);
    expect(replaceExercise(plan, 'missing', 'i', 'plank', now)).toBe(plan);
  });
  it('resets timed prescriptions back to default reps without changing other fields', () => {
    // Given
    const timed: WorkoutPlan = { ...plan, days:[{ id:'d', name:'Day', items:[{ id:'i', exerciseId:'plank', sets:5, restSeconds:75, prescription:{ kind:'time', seconds:55 } }] }] };
    // When
    const result = replaceExercise(timed, 'd', 'i', 'crunch', now);
    // Then
    expect(result.days[0]?.items[0]).toEqual({ id:'i', exerciseId:'crunch', sets:5, restSeconds:75, prescription:{ kind:'reps', min:8, max:12 } });
  });
});
