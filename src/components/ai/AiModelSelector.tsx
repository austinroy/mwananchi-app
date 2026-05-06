import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AiModelSelection, AiProviderId, AiApiKeyStatus } from "../../lib/types";
import {
  aiProviderOptions,
  getProviderModels,
  readLmStudioSettings,
} from "../../lib/aiSettings";
import { listAiApiKeyStatuses, listProviderModels } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export function useConfiguredAiProviders() {
  const auth = useAuth();
  const [settingsVersion, setSettingsVersion] = useState(0);
  const { data = [] } = useQuery({
    queryKey: ["ai-api-key-statuses"],
    queryFn: listAiApiKeyStatuses,
    enabled: auth.isAuthenticated,
  });
  const lmStudioSettings = readLmStudioSettings();
  const keyedProviders = new Set(
    data.map((item: AiApiKeyStatus) => item.provider),
  );

  useEffect(() => {
    const refresh = () => setSettingsVersion((version) => version + 1);
    window.addEventListener("mwananchi-lm-studio-settings", refresh);
    return () =>
      window.removeEventListener("mwananchi-lm-studio-settings", refresh);
  }, []);

  return {
    keyedProviders,
    lmStudioSettings,
    settingsVersion,
    isLmStudioConfigured: Boolean(
      lmStudioSettings.baseUrl &&
      lmStudioSettings.model &&
      lmStudioSettings.models.length,
    ),
  };
}

export function isProviderConfigured(
  provider: AiProviderId,
  configured: ReturnType<typeof useConfiguredAiProviders>,
) {
  if (provider === "lmstudio") return configured.isLmStudioConfigured;
  return configured.keyedProviders.has(provider);
}

export function resolveConfiguredAiSelection(
  selection: AiModelSelection,
  configured: ReturnType<typeof useConfiguredAiProviders>,
) {
  const models = getConfiguredProviderModels(selection.provider, configured);
  return {
    ...selection,
    model: models.includes(selection.model)
      ? selection.model
      : (models[0] ?? selection.model),
  };
}

export function getConfiguredProviderModels(
  provider: AiProviderId,
  configured: ReturnType<typeof useConfiguredAiProviders>,
) {
  if (!isProviderConfigured(provider, configured)) return [];
  if (provider === "lmstudio") return configured.lmStudioSettings.models;
  return getProviderModels(provider);
}

export function AiModelSelector({
  selection,
  onChange,
  compact = false,
}: {
  selection: AiModelSelection;
  onChange: (selection: AiModelSelection) => void;
  compact?: boolean;
}) {
  const configured = useConfiguredAiProviders();
  const providerOptions = aiProviderOptions.map((provider) => ({
    ...provider,
    isConfigured: isProviderConfigured(provider.value, configured),
  }));
  const isSelectedProviderConfigured = isProviderConfigured(
    selection.provider,
    configured,
  );
  const {
    data: providerModels = [],
    isLoading: isLoadingModels,
    isError: modelLoadFailed,
  } = useQuery<string[]>({
    queryKey: [
      "ai-provider-models",
      selection.provider,
      selection.provider === "lmstudio"
        ? configured.lmStudioSettings.baseUrl
        : "hosted",
      configured.settingsVersion,
    ],
    queryFn: () =>
      listProviderModels(
        selection.provider,
        selection.provider === "lmstudio"
          ? configured.lmStudioSettings.baseUrl
          : undefined,
      ),
    enabled: isSelectedProviderConfigured,
  });
  const models = useMemo(
    () => (isSelectedProviderConfigured ? providerModels : []),
    [isSelectedProviderConfigured, providerModels],
  );

  useEffect(() => {
    if (!models.length) return;
    if (models.includes(selection.model)) return;
    onChange({ ...selection, model: models[0] });
  }, [models, onChange, selection]);

  return (
    <div className={compact ? "grid gap-2 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"}>
      <label className="block">
        <span className="text-sm font-semibold">Provider</span>
        <select
          className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
          value={selection.provider}
          onChange={(event) => {
            const provider = event.target.value as AiModelSelection["provider"];
            onChange({ provider, model: "" });
          }}
        >
          {providerOptions.map((provider) => (
            <option key={provider.value} value={provider.value} disabled={!provider.isConfigured}>
              {provider.label}
              {provider.isConfigured ? "" : " (not configured)"}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Model</span>
        <select
          className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
          value={models.includes(selection.model) ? selection.model : (models[0] ?? "")}
          disabled={!isSelectedProviderConfigured || models.length === 0}
          onChange={(event) => onChange({ ...selection, model: event.target.value })}
        >
          {!isSelectedProviderConfigured ? <option value="">Configure provider first</option> : null}
          {isSelectedProviderConfigured && isLoadingModels ? <option value="">Loading models...</option> : null}
          {isSelectedProviderConfigured && modelLoadFailed ? <option value="">Could not load models</option> : null}
          {isSelectedProviderConfigured && models.length === 0 ? <option value="">No models available</option> : null}
          {models.map((model) => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
