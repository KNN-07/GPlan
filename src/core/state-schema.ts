import { z } from 'zod';
import { exerciseById } from '../catalog';
import { equipment } from '../catalog/taxonomy';

const id = z.string().trim().min(1);
const name = z.string().trim().min(1);
const prescription = z.discriminatedUnion('kind', [
  z.strictObject({ kind:z.literal('reps'), min:z.number().int().positive(), max:z.number().int().positive() }).refine(value => value.min <= value.max),
  z.strictObject({ kind:z.literal('time'), seconds:z.number().int().positive() }),
]);
const item = z.strictObject({
  id, exerciseId:id, sets:z.number().int().positive(), prescription, restSeconds:z.number().int().nonnegative(),
}).refine(value => exerciseById.get(value.exerciseId)?.prescription === value.prescription.kind, { message:'Unknown exercise or incompatible prescription.' });
const day = z.strictObject({ id, name, items:z.array(item) });
const plan = z.strictObject({
  id, name, days:z.array(day), createdAt:z.iso.datetime({ offset:true }), updatedAt:z.iso.datetime({ offset:true }), source:z.enum(['manual','local','ai']),
});
const baseUrl = z.url().refine(value => {
  const url = new URL(value);
  return ['http:','https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
}, { message:'Use an HTTP(S) base URL without credentials, query parameters, or fragments.' });
const preferences = z.strictObject({
  config:z.discriminatedUnion('provider', [
    z.strictObject({ provider:z.literal('gemini') }),
    z.strictObject({ provider:z.literal('openai-compatible'), baseUrl }),
  ]), modelId:id,
});

/** Strict objects reject accidental API-key fields at every level, rather than silently retaining them. */
export const stateSchema = z.strictObject({
  schemaVersion:z.literal(1),
  gym:z.strictObject({ availableEquipment:z.array(z.enum(equipment)).refine(values => new Set(values).size === values.length) }),
  plans:z.array(plan), activePlanId:id.nullable(), aiPreferences:preferences.nullable(),
}).superRefine((state, context) => {
  if (state.activePlanId !== null && !state.plans.some(value => value.id === state.activePlanId)) {
    context.addIssue({ code:'custom', message:'Active plan does not exist.', path:['activePlanId'] });
  }
  const ids = state.plans.flatMap(value => [value.id, ...value.days.flatMap(value => [value.id, ...value.items.map(value => value.id)])]);
  if (new Set(ids).size !== ids.length) context.addIssue({ code:'custom', message:'Plan, day and item IDs must be unique.' });
});
