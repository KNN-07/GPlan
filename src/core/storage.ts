import type { PlannerState, Result } from '../contracts';
import { equipment } from '../catalog/taxonomy';
import { stateSchema } from './state-schema';

const storageKey = 'gplan.state.v1';
export const defaultState: PlannerState = { schemaVersion:1, gym:{ availableEquipment:[...equipment] }, plans:[], activePlanId:null, aiPreferences:null };

function storageError(error: Error | DOMException): Result<never> {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return { ok:false, error:{ code:'quota-exceeded', message:'Browser storage is full. Export a backup before freeing space.' } };
  }
  return { ok:false, error:{ code:'storage-unavailable', message:'Browser storage is unavailable. Your saved data was not changed.' } };
}

export function loadState(): Result<PlannerState> {
  try {
    const serialized = globalThis.localStorage.getItem(storageKey);
    return serialized === null ? { ok:true, value:structuredClone(defaultState) } : importState(serialized);
  } catch (error) {
    if (error instanceof DOMException || error instanceof Error) return storageError(error);
    throw error;
  }
}

export function saveState(state: PlannerState): Result<void> {
  const parsed = stateSchema.safeParse(state);
  if (!parsed.success) return { ok:false, error:{ code:'invalid-state', message:'The plan data is invalid and was not saved.' } };
  try {
    // Do not overwrite an unreadable or newer schema with defaults after a failed load.
    const current = globalThis.localStorage.getItem(storageKey);
    if (current !== null) {
      const previous = importState(current);
      if (!previous.ok) return previous;
    }
    globalThis.localStorage.setItem(storageKey, JSON.stringify(parsed.data));
    return { ok:true, value:undefined };
  } catch (error) {
    if (error instanceof DOMException || error instanceof Error) return storageError(error);
    throw error;
  }
}

/** Export has no Result in the frozen contract; invalid caller data raises ZodError. */
export function exportState(state: PlannerState): string {
  return JSON.stringify(stateSchema.parse(state), null, 2);
}

export function importState(serialized: string): Result<PlannerState> {
  let input: unknown;
  try { input = JSON.parse(serialized); }
  catch (error) {
    if (error instanceof SyntaxError) return { ok:false, error:{ code:'corrupt-json', message:'This backup is not valid JSON. Existing data was not changed.' } };
    throw error;
  }
  if (typeof input === 'object' && input !== null && 'schemaVersion' in input && input.schemaVersion !== 1) {
    return { ok:false, error:{ code:'unsupported-schema', message:'This backup uses an unsupported schema version. Existing data was not changed.' } };
  }
  const parsed = stateSchema.safeParse(input);
  return parsed.success ? { ok:true, value:parsed.data } : { ok:false, error:{ code:'invalid-state', message:'The backup contains invalid plan data. Existing data was not changed.' } };
}
