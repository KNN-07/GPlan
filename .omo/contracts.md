# Shared contracts

`src/contracts.ts` exports these exact shared types: `Muscle`, `Equipment`, `Movement`, `MotionFamily`, `AnimationSpec`, `Prescription`, `Exercise`, `WorkoutItem`, `WorkoutDay`, `WorkoutPlan`, `GymProfile`, `PlanRequest`, `ProviderConfig`, `AiPreferences`, `ModelOption`, `AiPlanDraft`, `PlannerState`, `CatalogQuery`, `SwapCandidate`, `Result<T>`, `CreationContext`, and `AiErrorCode`. `Exercise.prescription` is the literal union `'reps' | 'time'`; `WorkoutItem.prescription` is `Prescription`.

Exact later-worker module exports:
- `catalog`: `exercises: readonly Exercise[]`; `exerciseById: ReadonlyMap<string, Exercise>`.
- `core/catalog`: `isAvailable(exercise: Exercise, gym: GymProfile): boolean`; `queryExercises(query: CatalogQuery, gym: GymProfile): readonly Exercise[]`; `findSwaps(exerciseId: string, gym: GymProfile, limit?: number): readonly SwapCandidate[]`.
- `core/planner`: `createLocalPlan(request: PlanRequest, context: CreationContext): Result<WorkoutPlan>`; `materializeAiPlan(draft: AiPlanDraft, context: CreationContext): WorkoutPlan`; `replaceExercise(plan: WorkoutPlan, dayId: string, itemId: string, replacementId: string, now: string): WorkoutPlan`.
- `core/storage`: `defaultState: PlannerState`; `loadState(): Result<PlannerState>`; `saveState(state: PlannerState): Result<void>`; `exportState(state: PlannerState): string`; `importState(serialized: string): Result<PlannerState>`.
- `ai/index`: `AiError` class with `code: AiErrorCode` and `status?: number`; `discoverModels(options: { config: ProviderConfig; apiKey: string; signal?: AbortSignal }): Promise<readonly ModelOption[]>`; `generatePlan(options: { config: ProviderConfig; apiKey: string; modelId: string; request: PlanRequest; catalog: readonly Exercise[]; signal?: AbortSignal }): Promise<AiPlanDraft>`.
- `graphics/ExerciseViewer`: named `ExerciseViewer` component with props `exercise: Exercise`, `playing?: boolean`, `onPlayingChange?: (playing: boolean) => void`, `className?: string`.
- `pwa/PwaStatus`: named no-argument `PwaStatus` component; `pwa/register.ts`: `registerPwa(): void`.

API keys are transient inputs only and must never be included in persisted `PlannerState`.
