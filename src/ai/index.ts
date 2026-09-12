import type { AiPlanDraft, Exercise, ModelOption, PlanRequest, ProviderConfig } from '../contracts';
import { AiError } from './error';
import { discoverGemini, generateGemini } from './gemini';
import { discoverOpenAi, generateOpenAi, openAiRoot } from './openai';
import { eligibleCatalog, parsePlan, planInstruction, planPayload } from './validation';

export { AiError } from './error';

type DiscoverOptions = { readonly config: ProviderConfig; readonly apiKey: string; readonly signal?: AbortSignal };
type GenerateOptions = DiscoverOptions & {
  readonly modelId: string; readonly request: PlanRequest; readonly catalog: readonly Exercise[];
};

function unsupportedProvider(config: never): never {
  throw new AiError('provider', 'Select a supported AI provider.');
}

export async function discoverModels(options: DiscoverOptions): Promise<readonly ModelOption[]> {
  switch (options.config.provider) {
    case 'gemini': return discoverGemini(options);
    case 'openai-compatible': return discoverOpenAi(openAiRoot(options.config.baseUrl), options);
    default: return unsupportedProvider(options.config);
  }
}

export async function generatePlan(options: GenerateOptions): Promise<AiPlanDraft> {
  if (!options.modelId.trim()) throw new AiError('provider', 'Enter or select a model ID.');
  const catalog = eligibleCatalog(options.catalog, options.request);
  const generation = { apiKey: options.apiKey, signal: options.signal, modelId: options.modelId,
    instruction: planInstruction, payload: planPayload(options.request, catalog) };
  let text: string;
  switch (options.config.provider) {
    case 'gemini': text = await generateGemini(generation); break;
    case 'openai-compatible': text = await generateOpenAi(openAiRoot(options.config.baseUrl), generation); break;
    default: return unsupportedProvider(options.config);
  }
  return parsePlan(text, options.request, catalog);
}
