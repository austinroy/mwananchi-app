import { useClerk } from "@clerk/clerk-react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { LogOut, UserCog } from "lucide-react";
import { useAuth } from "../../lib/auth";
import {
  AiModelSelector,
  isProviderConfigured,
  resolveConfiguredAiSelection,
  useConfiguredAiProviders,
} from "../ai/AiModelSelector";
import {
  aiProviderOptions,
  defaultLmStudioSettings,
  readAiDefaults,
  readLmStudioSettings,
  saveAiDefaults,
  saveLmStudioSettings,
} from "../../lib/aiSettings";
import {
  deleteAiApiKey,
  getApiAiDefaults,
  listAiApiKeyStatuses,
  listProviderModels,
  saveAiApiKey,
  saveApiAiDefaults,
} from "../../lib/api";
import { KeyRound, Laptop, Eye, EyeOff, Trash2, X } from "lucide-react";
import type {
  AiApiKeyStatus,
  AiModelSelection,
  AiProviderId,
} from "../../lib/types";
import { RequireAuth } from "./AuthShell";
import { useI18n } from "../../lib/i18n";

export function AccountPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const signOut = async () => {
    if (auth.isClerkEnabled) {
      await clerk.signOut({ redirectUrl: "/" });
      return;
    }

    await auth.localLogout();
    await navigate({ to: "/" });
  };

  return (
    <RequireAuth>
      <main className="page-shell max-w-4xl">
        <div className="mb-6">
          <p className="text-sm font-semibold text-civic-700">
            {t("account.eyebrow")}
          </p>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">
            {t("account.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {t("account.copy")}
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="surface rounded-lg p-5 sm:p-6">
            <div className="grid size-14 place-items-center rounded-md bg-civic-700 text-white">
              <UserCog size={24} />
            </div>
            <h2 className="mt-5 text-xl font-bold text-ink">
              {auth.user?.name ?? t("account.userFallback")}
            </h2>
            <p className="mt-1 break-words text-sm text-slate-600">
              {auth.user?.email}
            </p>
            <p className="mt-4 rounded-md bg-civic-50 px-3 py-2 text-sm font-semibold text-civic-800">
              {auth.isClerkEnabled
                ? t("account.clerkAccount")
                : t("account.localAccount")}
            </p>
          </section>
          <section className="surface rounded-lg p-5 sm:p-6">
            <h2 className="text-xl font-bold text-ink">
              {t("account.management")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {auth.isClerkEnabled
                ? t("account.managementClerk")
                : t("account.managementLocal")}
            </p>
            <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
              {auth.isClerkEnabled ? (
                <button
                  className="btn-primary w-full sm:w-auto"
                  type="button"
                  onClick={() => void clerk.openUserProfile()}
                >
                  <UserCog size={16} />
                  {t("account.manageClerk")}
                </button>
              ) : null}
              <button
                className="btn-secondary w-full sm:w-auto"
                type="button"
                onClick={() => {
                  void signOut();
                }}
              >
                <LogOut size={16} />
                {t("nav.signOut")}
              </button>
            </div>
          </section>
        </div>
        <section className="surface mt-6 rounded-lg p-5 sm:p-6">
          <h2 className="text-xl font-bold text-ink">
            {t("account.defaultAi")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t("account.defaultAiCopy")}
          </p>
          <AiDefaultsForm />
        </section>
        <section className="surface mt-6 rounded-lg p-5 sm:p-6">
          <h2 className="text-xl font-bold text-ink">{t("account.apiKeys")}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t("account.apiKeysCopy")}
          </p>
          <AiApiKeysForm />
        </section>
        <section className="surface mt-6 rounded-lg p-5 sm:p-6">
          <h2 className="text-xl font-bold text-ink">
            {t("account.localModels")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t("account.localModelsCopy")}
          </p>
          <LmStudioSetup />
        </section>
      </main>
    </RequireAuth>
  );
}

function AiDefaultsForm() {
  const { t } = useI18n();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<AiModelSelection>(() =>
    readAiDefaults(),
  );
  const [status, setStatus] = useState<string | null>(null);
  const configured = useConfiguredAiProviders();
  const { data: storedDefaults } = useQuery({
    queryKey: ["ai-defaults", auth.user?.id],
    queryFn: getApiAiDefaults,
    enabled: auth.isAuthenticated,
  });
  const isSelectionAvailable =
    isProviderConfigured(selection.provider, configured) &&
    Boolean(selection.model);

  useEffect(() => {
    if (!storedDefaults) return;
    setSelection(storedDefaults);
    saveAiDefaults(storedDefaults);
  }, [storedDefaults]);

  const saveMutation = useMutation({
    mutationFn: (nextSelection: AiModelSelection) =>
      auth.isAuthenticated
        ? saveApiAiDefaults(nextSelection)
        : Promise.resolve(nextSelection),
    onSuccess: async (nextSelection) => {
      saveAiDefaults(nextSelection);
      setSelection(nextSelection);
      setStatus(t("account.defaultsSaved"));
      await queryClient.invalidateQueries({
        queryKey: ["ai-defaults", auth.user?.id],
      });
    },
    onError: (error) =>
      setStatus(
        error instanceof Error ? error.message : t("account.defaultsError"),
      ),
  });

  const updateSelection = (nextSelection: AiModelSelection) => {
    setSelection(nextSelection);
    setStatus(null);
  };

  return (
    <div className="mt-5">
      <AiModelSelector selection={selection} onChange={updateSelection} />
      <button
        className="btn-primary mt-5 w-full sm:w-auto"
        type="button"
        disabled={!isSelectionAvailable || saveMutation.isPending}
        onClick={() => {
          saveMutation.mutate(
            resolveConfiguredAiSelection(selection, configured),
          );
        }}
      >
        {saveMutation.isPending
          ? t("account.saving")
          : t("account.saveDefaults")}
      </button>
      {!isSelectionAvailable ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t("account.providerUnavailable")}
        </p>
      ) : null}
      {status ? (
        <p className="mt-3 text-sm font-semibold text-civic-700">{status}</p>
      ) : null}
    </div>
  );
}

function AiApiKeysForm() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["ai-api-key-statuses"],
    queryFn: listAiApiKeyStatuses,
  });
  const [provider, setProvider] = useState<AiProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const keyProviderOptions = aiProviderOptions.filter(
    (option) => option.value !== "lmstudio",
  );
  const configuredProviders = new Map(
    data.map((item: AiApiKeyStatus) => [item.provider, item]),
  );
  const selectedStatus = configuredProviders.get(provider);

  const saveMutation = useMutation({
    mutationFn: () => saveAiApiKey(provider, apiKey),
    onSuccess: async () => {
      setApiKey("");
      setStatus(t("account.keySaved"));
      await queryClient.invalidateQueries({
        queryKey: ["ai-api-key-statuses"],
      });
    },
    onError: (error) =>
      setStatus(
        error instanceof Error ? error.message : t("account.keySaveError"),
      ),
  });
  const deleteMutation = useMutation({
    mutationFn: (nextProvider: AiProviderId) => deleteAiApiKey(nextProvider),
    onSuccess: async () => {
      setStatus(t("account.keyRemoved"));
      await queryClient.invalidateQueries({
        queryKey: ["ai-api-key-statuses"],
      });
    },
    onError: (error) =>
      setStatus(
        error instanceof Error ? error.message : t("account.keyRemoveError"),
      ),
  });

  return (
    <div className="mt-5 grid gap-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
        <label className="text-sm font-semibold text-slate-700">
          {t("account.provider")}
          <select
            className="mt-2 w-full rounded-md border border-civic-100 bg-white px-3 py-2 text-sm"
            value={provider}
            onChange={(event) => {
              setProvider(event.target.value as AiProviderId);
              setStatus(null);
            }}
          >
            {keyProviderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          {t("account.apiKey")}
          <div className="mt-2 flex rounded-md border border-civic-100 bg-white focus-within:ring-2 focus-within:ring-civic-100">
            <input
              className="min-w-0 flex-1 rounded-l-md px-3 py-2 text-sm outline-none"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                setStatus(null);
              }}
              placeholder={
                selectedStatus
                  ? t("account.replaceKeyPlaceholder")
                  : t("account.keyPlaceholder")
              }
            />
            <button
              className="grid w-11 place-items-center text-slate-500"
              type="button"
              onClick={() => setShowKey((value) => !value)}
              aria-label={showKey ? t("account.hideKey") : t("account.showKey")}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          className="btn-primary w-full sm:w-auto"
          type="button"
          disabled={!apiKey.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          <KeyRound size={16} />
          {selectedStatus ? t("account.replaceKey") : t("account.saveKey")}
        </button>
        {selectedStatus ? (
          <button
            className="btn-secondary w-full sm:w-auto"
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(provider)}
          >
            <Trash2 size={16} />
            {t("account.removeKey")}
          </button>
        ) : null}
        <span className="text-sm text-slate-600">
          {isLoading
            ? t("account.checkingKeys")
            : selectedStatus
              ? t("account.configuredOn", {
                  date: new Date(selectedStatus.updatedAt).toLocaleDateString(),
                })
              : t("account.noKey")}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {keyProviderOptions.map((option) => {
          const item = configuredProviders.get(option.value);
          return (
            <div
              key={option.value}
              className="rounded-md border border-civic-100 bg-civic-50/60 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-ink">{option.label}</span>
              <span className="ml-2 text-slate-600">
                {item ? t("account.configured") : t("account.notConfigured")}
              </span>
            </div>
          );
        })}
      </div>

      {status ? (
        <p className="text-sm font-semibold text-civic-700">{status}</p>
      ) : null}
    </div>
  );
}

function LmStudioSetup() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState(() => readLmStudioSettings());

  const saveSettings = (nextSettings: typeof defaultLmStudioSettings) => {
    saveLmStudioSettings(nextSettings);
    saveAiDefaults({
      provider: "lmstudio",
      model: nextSettings.model,
      baseUrl: nextSettings.baseUrl,
    });
    setSettings(nextSettings);
    setIsOpen(false);
  };

  return (
    <div className="mt-5">
      <div className="rounded-md border border-civic-100 bg-civic-50/70 p-4 text-sm leading-6 text-slate-700">
        <p className="font-semibold text-ink">LM Studio</p>
        <p className="mt-1 break-all">Base URL: {settings.baseUrl}</p>
        <p className="break-all">Model: {settings.model}</p>
        <p>
          {settings.models.length
            ? t("account.modelsLoaded", { count: settings.models.length })
            : t("account.noModelsLoaded")}
        </p>
      </div>
      <button
        className="btn-primary mt-4 w-full sm:w-auto"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <Laptop size={16} />
        {t("account.setupLmStudio")}
      </button>
      {isOpen ? (
        <LmStudioModal
          initialSettings={settings}
          onClose={() => setIsOpen(false)}
          onSave={saveSettings}
        />
      ) : null}
    </div>
  );
}

function LmStudioModal({
  initialSettings,
  onClose,
  onSave,
}: {
  initialSettings: typeof defaultLmStudioSettings;
  onClose: () => void;
  onSave: (settings: typeof defaultLmStudioSettings) => void;
}) {
  const { t } = useI18n();
  const [baseUrl, setBaseUrl] = useState(initialSettings.baseUrl);
  const [model, setModel] = useState(initialSettings.model);
  const [models, setModels] = useState<string[]>(initialSettings.models);
  const [status, setStatus] = useState<string | null>(null);
  const modelMutation = useMutation({
    mutationFn: () =>
      listProviderModels(
        "lmstudio",
        baseUrl.trim() || defaultLmStudioSettings.baseUrl,
      ),
    onSuccess: (nextModels) => {
      setModels(nextModels);
      setModel((currentModel) =>
        nextModels.includes(currentModel)
          ? currentModel
          : (nextModels[0] ?? defaultLmStudioSettings.model),
      );
      setStatus(
        nextModels.length
          ? t("account.modelsLoadedStatus", { count: nextModels.length })
          : t("account.noModelsReturned"),
      );
    },
    onError: (error) =>
      setStatus(
        error instanceof Error ? error.message : t("account.modelsLoadError"),
      ),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <section className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-civic-700">
              {t("account.localSetup")}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-ink">
              {t("account.connectLmStudio")}
            </h2>
          </div>
          <button
            className="grid size-9 place-items-center rounded-md border border-civic-100 text-slate-600"
            type="button"
            onClick={onClose}
            aria-label={t("account.closeLmStudio")}
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 rounded-md border border-civic-100 bg-civic-50 p-3 text-sm leading-6 text-slate-700">
          {t("account.lmStudioHelp")}
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-700">
          {t("account.baseUrl")}
          <input
            className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
            value={baseUrl}
            onChange={(event) => {
              setBaseUrl(event.target.value);
              setModels([]);
              setStatus(null);
            }}
            placeholder="http://127.0.0.1:1234/v1"
          />
        </label>
        <button
          className="btn-secondary mt-4 w-full sm:w-auto"
          type="button"
          disabled={modelMutation.isPending}
          onClick={() => modelMutation.mutate()}
        >
          {modelMutation.isPending
            ? t("account.loadingModels")
            : t("account.loadModels")}
        </button>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          {t("account.model")}
          <select
            className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
            value={models.includes(model) ? model : ""}
            disabled={models.length === 0}
            onChange={(event) => setModel(event.target.value)}
          >
            {models.length === 0 ? (
              <option value="">{t("account.loadModelsFirst")}</option>
            ) : null}
            {models.map((modelOption) => (
              <option key={modelOption} value={modelOption}>
                {modelOption}
              </option>
            ))}
          </select>
        </label>
        {status ? (
          <p className="mt-3 text-sm leading-6 text-slate-600">{status}</p>
        ) : null}
        <div className="mt-6 grid gap-3 sm:flex sm:justify-end">
          <button
            className="btn-secondary w-full sm:w-auto"
            type="button"
            onClick={onClose}
          >
            {t("account.cancel")}
          </button>
          <button
            className="btn-primary w-full sm:w-auto"
            type="button"
            onClick={() =>
              onSave({
                baseUrl: baseUrl.trim() || defaultLmStudioSettings.baseUrl,
                model: models.includes(model)
                  ? model
                  : (models[0] ?? defaultLmStudioSettings.model),
                models,
              })
            }
            disabled={models.length === 0}
          >
            {t("account.saveLmStudio")}
          </button>
        </div>
      </section>
    </div>
  );
}
