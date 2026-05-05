import type { AiModelSelection, AiProviderId } from './types';

export const aiProviderOptions: Array<{ value: AiProviderId; label: string; models: string[] }> = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5'] },
  { value: 'openrouter', label: 'OpenRouter', models: ['openai/gpt-5.4-mini', 'anthropic/claude-sonnet-4.5', 'google/gemini-2.5-pro'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-sonnet-4-5', 'claude-haiku-4-5'] },
  { value: 'custom', label: 'Custom compatible', models: ['gpt-4.1', 'llama-3.1-70b-instruct'] },
];

const aiDefaultsStorageKey = 'mwananchi_ai_defaults';
export const defaultAiSelection: AiModelSelection = {
  provider: 'openai',
  model: 'gpt-5.4-mini',
};

export function readAiDefaults(): AiModelSelection {
  if (typeof window === 'undefined') return defaultAiSelection;

  const storedValue = window.localStorage.getItem(aiDefaultsStorageKey);
  if (!storedValue) return defaultAiSelection;

  try {
    return normalizeAiSelection(JSON.parse(storedValue) as AiModelSelection);
  } catch {
    window.localStorage.removeItem(aiDefaultsStorageKey);
    return defaultAiSelection;
  }
}

export function saveAiDefaults(selection: AiModelSelection) {
  window.localStorage.setItem(aiDefaultsStorageKey, JSON.stringify(normalizeAiSelection(selection)));
}

export function getProviderModels(provider: AiProviderId) {
  return aiProviderOptions.find((option) => option.value === provider)?.models ?? [];
}

export function normalizeAiSelection(selection: AiModelSelection): AiModelSelection {
  const provider = aiProviderOptions.some((option) => option.value === selection.provider)
    ? selection.provider
    : defaultAiSelection.provider;
  const models = getProviderModels(provider);
  const model = selection.model || models[0] || defaultAiSelection.model;

  return { provider, model };
}
