import type { Equipment, Muscle } from '../contracts';

export const muscles = ['chest','back','shoulders','quads','hamstrings','glutes','adductors','biceps','triceps','calves','core'] as const satisfies readonly Muscle[];
export const equipment = ['dumbbells','barbell','bench','rack','cable','smith-machine','leg-press','leg-extension','leg-curl','chest-press','shoulder-press','lat-pulldown','seated-row','pec-deck','assisted-pullup','calf-machine','hip-abductor','hip-adductor','pullup-bar','dip-bars','bands','kettlebell','stability-ball','ab-wheel'] as const satisfies readonly Equipment[];
