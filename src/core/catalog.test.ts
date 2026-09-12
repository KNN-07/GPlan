import { describe, expect, it } from 'vitest';
import type { Equipment, Exercise, GymProfile, Muscle } from '../contracts';
import { exercises, exerciseById } from '../catalog';
import { findSwaps, isAvailable, queryExercises } from './catalog';

const muscles: Muscle[] = ['chest','back','shoulders','quads','hamstrings','glutes','adductors','biceps','triceps','calves','core'];
const equipment: Equipment[] = ['dumbbells','barbell','bench','rack','cable','smith-machine','leg-press','leg-extension','leg-curl','chest-press','shoulder-press','lat-pulldown','seated-row','pec-deck','assisted-pullup','calf-machine','hip-abductor','hip-adductor','pullup-bar','dip-bars','bands','kettlebell','stability-ball','ab-wheel'];
const gym: GymProfile = { availableEquipment:equipment };
const specimen: Exercise = { id:'fixture', name:'Fixture', aliases:[], primary:['chest'], secondary:['triceps'], movement:'horizontal-push', equipmentOptions:[['barbell','bench','rack'],['chest-press']], difficulty:'beginner', instructions:[], animation:{ family:'horizontal-press', posture:'supine', prop:'barbell', unilateral:false }, prescription:'reps' };

describe('bundled catalog', () => {
  it('targets inner thighs rather than core for hip-adductor machines', () => {
    // Given / When
    const machine = queryExercises({ equipment:['hip-adductor'] }, gym);
    // Then
    expect(machine.length).toBeGreaterThan(0);
    expect(machine.every(exercise => exercise.primary.join(',') === 'adductors')).toBe(true);
    const original = machine[0];
    if (!original) throw new Error('Missing hip-adductor exercise');
    expect(findSwaps(original.id, { availableEquipment:['cable'] }).map(candidate => candidate.exercise.id))
      .toContain('cable-hip-adduction');
    expect(findSwaps(original.id, { availableEquipment:[] })).toEqual([]);
  });
  it('contains at least 120 distinct exercises when loaded', () => {
    // Given / When: the bundled data is loaded.
    const ids = new Set(exercises.map(e => e.id));
    // Then
    expect(ids.size).toBeGreaterThanOrEqual(120);
    expect(ids.size).toBe(exercises.length);
    expect(new Set(exercises.map(e => e.name)).size).toBe(exercises.length);
    expect(exerciseById.size).toBe(exercises.length);
  });
  it('covers every muscle, equipment and motion family when bundled', () => {
    // Given / When
    const primary = new Set(exercises.flatMap(e => e.primary));
    const props = new Set(exercises.flatMap(e => e.equipmentOptions.flat()));
    // Then
    expect([...primary].sort()).toEqual([...muscles].sort());
    expect([...props].sort()).toEqual([...equipment].sort());
    expect(new Set(exercises.map(e => e.animation.family)).size).toBe(14);
    for (const e of exercises) {
      expect(e.equipmentOptions.length).toBeGreaterThan(0);
      expect(e.primary.length).toBeGreaterThan(0);
      expect(e.primary.some(m => e.secondary.includes(m))).toBe(false);
      expect(exerciseById.get(e.id)).toBe(e);
    }
  });
  it('classifies vertical dip pushes and static squat holds by their actual movement', () => {
    // Given / When / Then
    expect(exerciseById.get('parallel-bar-dip')?.movement).toBe('vertical-push');
    expect(exerciseById.get('assisted-dip')?.movement).toBe('vertical-push');
    expect(exerciseById.get('wall-sit')?.movement).toBe('squat');
  });
});

describe('availability and querying', () => {
  it.each([
    [[], false], [['barbell','bench'], false], [['barbell','bench','rack'], true], [['chest-press'], true], [['bench'], false],
  ] satisfies [Equipment[], boolean][])('uses OR-of-AND requirements for %j', (availableEquipment, expected) => {
    // Given / When
    const available = isAvailable(specimen, { availableEquipment });
    // Then
    expect(available).toBe(expected);
  });
  it('makes bodyweight available without equipment', () => {
    // Given / When
    const available = isAvailable({ ...specimen, equipmentOptions:[[]] }, { availableEquipment:[] });
    // Then
    expect(available).toBe(true);
  });
  it('combines OR categories with AND and availability when querying', () => {
    // Given
    const query = { muscles:['chest','back'], equipment:['dumbbells','cable'], availableOnly:true } satisfies Parameters<typeof queryExercises>[0];
    const limited = { availableEquipment:['dumbbells'] } satisfies GymProfile;
    // When
    const result = queryExercises(query, limited);
    // Then
    expect(result.length).toBeGreaterThan(0);
    expect(result).toEqual(exercises.filter(e => [...e.primary, ...e.secondary].some(m => m === 'chest' || m === 'back') && e.equipmentOptions.flat().some(p => p === 'dumbbells' || p === 'cable') && e.equipmentOptions.some(o => o.every(p => p === 'dumbbells'))));
  });
  it('matches case-insensitive aliases and trims search when queried', () => {
    // Given / When
    const result = queryExercises({ text:'  RDL  ' }, gym);
    // Then
    expect(result.map(e => e.id)).toContain('barbell-romanian-deadlift');
  });
  it('returns the complete catalog for empty category filters', () => {
    // Given / When
    const result = queryExercises({ muscles:[], equipment:[] }, { availableEquipment:[] });
    // Then
    expect(result).toEqual(exercises);
  });
});

describe('swaps', () => {
  it('ranks shared primary matches with the exact weighted score and stable ties', () => {
    // Given
    const original = exerciseById.get('barbell-bench-press');
    expect(original).toBeDefined();
    if (!original) throw new Error('Missing catalog fixture');
    const jaccard = (a: Muscle[], b: Muscle[]) => {
      const union = new Set([...a, ...b]);
      return union.size ? a.filter(m => b.includes(m)).length / union.size : 0;
    };
    const expected = exercises.filter(e => e.id !== original.id && e.primary.some(m => original.primary.includes(m)) && isAvailable(e, gym)).map(exercise => ({ exercise, sharedPrimary:exercise.primary.filter(m => original.primary.includes(m)), sameMovement:exercise.movement === original.movement, score:100*jaccard(original.primary,exercise.primary) + 40*Number(exercise.movement === original.movement) + 10*jaccard(original.secondary,exercise.secondary) })).sort((a,b) => b.score-a.score || (a.exercise.id < b.exercise.id ? -1 : 1));
    // When
    const result = findSwaps(original.id, gym, 1000);
    // Then
    expect(result.length).toBeGreaterThan(0);
    expect(result).toEqual(expected);
    expect(findSwaps(original.id, gym, 2)).toEqual(expected.slice(0,2));
  });
  it('excludes unavailable exercises and the original when equipment is absent', () => {
    // Given / When
    const result = findSwaps('push-up', { availableEquipment:[] });
    // Then
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(c => c.exercise.id !== 'push-up' && c.exercise.primary.includes('chest') && c.exercise.equipmentOptions.some(o => o.length === 0))).toBe(true);
  });
  it('returns no swaps when the original ID is unknown', () => {
    // Given / When / Then
    expect(findSwaps('missing', gym)).toEqual([]);
  });
});
