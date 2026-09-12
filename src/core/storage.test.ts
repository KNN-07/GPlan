// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlannerState } from '../contracts';
import { createLocalPlan } from './planner';
import { defaultState, exportState, importState, loadState, saveState } from './storage';

const key = 'gplan.state.v1';
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('persistence boundary', () => {
  it('loads isolated defaults including all 24 equipment options on first run', () => {
    // Given / When
    const result = loadState();
    // Then
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.gym.availableEquipment).toHaveLength(24);
    expect(result.value).toEqual(defaultState);
    expect(result.value).not.toBe(defaultState);
    expect(localStorage.getItem(key)).toBeNull();
  });
  it('round trips generated plans through save, reload, export and import', () => {
    // Given
    let id = 0;
    const generated = createLocalPlan({ name:'Saved', daysPerWeek:2, exercisesPerDay:3, focus:[], experience:'beginner', gym:defaultState.gym }, { now:'2026-09-12T12:00:00.000Z', newId:() => `saved-${++id}` });
    if (!generated.ok) throw new Error(generated.error.message);
    const state: PlannerState = { ...defaultState, plans:[generated.value], activePlanId:generated.value.id, aiPreferences:{ config:{ provider:'openai-compatible', baseUrl:'https://example.com/v1' }, modelId:'model' } };
    // When
    const saved = saveState(state);
    const loaded = loadState();
    const imported = importState(exportState(state));
    // Then
    expect(saved).toEqual({ ok:true, value:undefined });
    expect(loaded).toEqual({ ok:true, value:state });
    expect(imported).toEqual(loaded);
    expect(JSON.parse(localStorage.getItem(key) ?? 'null')).toEqual(state);
  });
  it.each([
    ['{broken','corrupt-json'],
    [JSON.stringify({ ...defaultState, schemaVersion:2 }),'unsupported-schema'],
    [JSON.stringify({ ...defaultState, activePlanId:'missing' }),'invalid-state'],
    [JSON.stringify({ ...defaultState, gym:{ availableEquipment:['imaginary'] } }),'invalid-state'],
    [JSON.stringify({ ...defaultState, apiKey:'secret' }),'invalid-state'],
    [JSON.stringify({ ...defaultState, aiPreferences:{ config:{ provider:'gemini', apiKey:'secret' }, modelId:'m' } }),'invalid-state'],
    [JSON.stringify({ ...defaultState, aiPreferences:{ config:{ provider:'openai-compatible', baseUrl:'https://user:secret@example.com/v1' }, modelId:'m' } }),'invalid-state'],
  ])('rejects %s without writing when importing', (serialized, code) => {
    // Given
    localStorage.setItem(key, 'sentinel');
    // When
    const result = importState(serialized);
    // Then
    expect(result).toMatchObject({ ok:false, error:{ code } });
    expect(localStorage.getItem(key)).toBe('sentinel');
  });
  it.each(['{broken', JSON.stringify({ ...defaultState, schemaVersion:99 })])('preserves corrupt or future data when loading or saving', serialized => {
    // Given
    localStorage.setItem(key, serialized);
    // When
    const loaded = loadState();
    const saved = saveState(defaultState);
    // Then
    expect(loaded.ok).toBe(false);
    expect(saved.ok).toBe(false);
    expect(localStorage.getItem(key)).toBe(serialized);
  });
  it('returns a quota error and preserves the previous state when storage is full', () => {
    // Given
    const previous = JSON.stringify(defaultState);
    localStorage.setItem(key, previous);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    // When
    const saved = saveState({ ...defaultState, gym:{ availableEquipment:[] } });
    // Then
    expect(saved).toMatchObject({ ok:false, error:{ code:'quota-exceeded' } });
    expect(localStorage.getItem(key)).toBe(previous);
  });
  it('rejects invalid caller data without replacing a valid saved state', () => {
    // Given
    const previous = JSON.stringify(defaultState);
    localStorage.setItem(key, previous);
    // When
    const result = saveState({ ...defaultState, activePlanId:'missing' });
    // Then
    expect(result).toMatchObject({ ok:false, error:{ code:'invalid-state' } });
    expect(localStorage.getItem(key)).toBe(previous);
  });
  it('reports blocked browser storage instead of silently returning defaults', () => {
    // Given
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    // When
    const result = loadState();
    // Then
    expect(result).toMatchObject({ ok:false, error:{ code:'storage-unavailable' } });
  });
  it('rejects invalid workout references, prescriptions, IDs and timestamps at import', () => {
    // Given
    const item = { id:'i', exerciseId:'push-up', sets:3, prescription:{ kind:'reps', min:8, max:12 }, restSeconds:90 };
    const plan = { id:'p', name:'P', source:'manual', createdAt:'2026-09-12T12:00:00.000Z', updatedAt:'2026-09-12T12:00:00.000Z', days:[{ id:'d', name:'D', items:[item] }] };
    const variants = [
      { ...plan, createdAt:'yesterday' },
      { ...plan, days:[{ id:'d', name:'D', items:[item,item] }] },
      ...[{ exerciseId:'missing' }, { sets:0 }, { restSeconds:-1 }, { prescription:{ kind:'reps', min:12, max:8 } }, { prescription:{ kind:'time', seconds:30 } }].map(change => ({ ...plan, days:[{ id:'d', name:'D', items:[{ ...item, ...change }] }] })),
    ];
    // When
    const results = variants.map(p => importState(JSON.stringify({ ...defaultState, plans:[p], activePlanId:'p' })));
    // Then
    expect(results.every(r => !r.ok && r.error.code === 'invalid-state')).toBe(true);
  });
});
