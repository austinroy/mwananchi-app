import type { AiModelSelection, AiProviderId } from "./types";

export const aiProviderOptions: Array<{
  value: AiProviderId;
  label: string;
  models: string[];
}> = [
  {
    value: "openai",
    label: "OpenAI",
    models: ["gpt-5.4-mini", "gpt-5.4", "gpt-5.5"],
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    models: [
      "openai/gpt-5.4-mini",
      "anthropic/claude-sonnet-4.5",
      "google/gemini-2.5-pro",
    ],
  },
  {
    value: "anthropic",
    label: "Anthropic",
    models: ["claude-sonnet-4-5", "claude-haiku-4-5"],
  },
  {
    value: "lmstudio",
    label: "LM Studio",
    models: ["local-model", "qwen2.5-7b-instruct", "llama-3.2-3b-instruct"],
  },
  {
    value: "custom",
    label: "Custom compatible",
    models: ["gpt-4.1", "llama-3.1-70b-instruct"],
  },
];

const aiDefaultsStorageKey = "mwananchi_ai_defaults";
const lmStudioSettingsStorageKey = "mwananchi_lm_studio_settings";
export const defaultLmStudioSettings = {
  baseUrl: "http://127.0.0.1:1234/v1",
  model: "local-model",
  models: [] as string[],
};

export const defaultAiSelection: AiModelSelection = {
  provider: "openai",
  model: "gpt-5.4-mini",
};

export function readAiDefaults(): AiModelSelection {
  if (typeof window === "undefined") return defaultAiSelection;

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
  window.localStorage.setItem(
    aiDefaultsStorageKey,
    JSON.stringify(normalizeAiSelection(selection)),
  );
}

export function readLmStudioSettings() {
  if (typeof window === "undefined") return defaultLmStudioSettings;

  const storedValue = window.localStorage.getItem(lmStudioSettingsStorageKey);
  if (!storedValue) return defaultLmStudioSettings;

  try {
    const parsed = JSON.parse(storedValue) as Partial<
      typeof defaultLmStudioSettings
    >;
    return normalizeLmStudioSettings(parsed);
  } catch {
    window.localStorage.removeItem(lmStudioSettingsStorageKey);
    return defaultLmStudioSettings;
  }
}

export function saveLmStudioSettings(
  settings: Partial<typeof defaultLmStudioSettings>,
) {
  window.localStorage.setItem(
    lmStudioSettingsStorageKey,
    JSON.stringify(normalizeLmStudioSettings(settings)),
  );
  window.dispatchEvent(new Event("mwananchi-lm-studio-settings"));
}

export function withLocalProviderSettings(
  selection: AiModelSelection,
): AiModelSelection {
  const normalized = normalizeAiSelection(selection);
  if (normalized.provider !== "lmstudio") return normalized;

  const settings = readLmStudioSettings();
  return {
    ...normalized,
    model: normalized.model || settings.model,
    baseUrl: settings.baseUrl,
  };
}

export function getProviderModels(provider: AiProviderId) {
  return (
    aiProviderOptions.find((option) => option.value === provider)?.models ?? []
  );
}

export function normalizeAiSelection(
  selection: AiModelSelection,
): AiModelSelection {
  const provider = aiProviderOptions.some(
    (option) => option.value === selection.provider,
  )
    ? selection.provider
    : defaultAiSelection.provider;
  const models = getProviderModels(provider);
  const model = selection.model || models[0] || defaultAiSelection.model;

  return {
    provider,
    model,
    ...(provider === "lmstudio" && selection.baseUrl
      ? { baseUrl: selection.baseUrl }
      : {}),
  };
}

function normalizeLmStudioSettings(
  settings: Partial<typeof defaultLmStudioSettings>,
) {
  return {
    baseUrl: settings.baseUrl?.trim() || defaultLmStudioSettings.baseUrl,
    model: settings.model?.trim() || defaultLmStudioSettings.model,
    models: Array.isArray(settings.models)
      ? [
          ...new Set(
            settings.models.map((model) => model.trim()).filter(Boolean),
          ),
        ]
      : defaultLmStudioSettings.models,
  };
}
