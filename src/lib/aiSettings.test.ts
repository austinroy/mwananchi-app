import type { AiModelSelection } from "./types";
import {
  defaultAiSelection,
  defaultLmStudioSettings,
  getProviderModels,
  normalizeAiSelection,
  readAiDefaults,
  readLmStudioSettings,
  saveAiDefaults,
  saveLmStudioSettings,
  withLocalProviderSettings,
} from "./aiSettings";

describe("AI settings helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("falls back to the default provider when a stored provider is unknown", () => {
    const selection = normalizeAiSelection({
      provider: "unknown",
      model: "model-that-should-stay",
    } as unknown as AiModelSelection);

    expect(selection).toEqual({
      provider: defaultAiSelection.provider,
      model: "model-that-should-stay",
    });
  });

  it("uses the provider default model when no model is supplied", () => {
    expect(normalizeAiSelection({ provider: "anthropic", model: "" })).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-4-5",
    });
  });

  it("keeps base URLs only for LM Studio selections", () => {
    expect(
      normalizeAiSelection({
        provider: "lmstudio",
        model: "local-model",
        baseUrl: "http://localhost:1234/v1",
      }),
    ).toEqual({
      provider: "lmstudio",
      model: "local-model",
      baseUrl: "http://localhost:1234/v1",
    });

    expect(
      normalizeAiSelection({
        provider: "openai",
        model: "gpt-5.4-mini",
        baseUrl: "http://localhost:1234/v1",
      }),
    ).toEqual({
      provider: "openai",
      model: "gpt-5.4-mini",
    });
  });

  it("reads, normalizes, and repairs malformed browser AI defaults", () => {
    expect(readAiDefaults()).toEqual(defaultAiSelection);

    saveAiDefaults({ provider: "openrouter", model: "" });
    expect(readAiDefaults()).toEqual({
      provider: "openrouter",
      model: "openai/gpt-5.4-mini",
    });

    window.localStorage.setItem("mwananchi_ai_defaults", "{bad json");
    expect(readAiDefaults()).toEqual(defaultAiSelection);
    expect(window.localStorage.getItem("mwananchi_ai_defaults")).toBeNull();
  });

  it("normalizes LM Studio settings and dispatches a change event when saved", () => {
    const listener = jest.fn();
    window.addEventListener("mwananchi-lm-studio-settings", listener);

    saveLmStudioSettings({
      baseUrl: "  http://127.0.0.1:4321/v1  ",
      model: "  civic-local-model  ",
      models: [" civic-local-model ", "", "civic-local-model", "other"],
    });

    expect(readLmStudioSettings()).toEqual({
      baseUrl: "http://127.0.0.1:4321/v1",
      model: "civic-local-model",
      models: ["civic-local-model", "other"],
    });
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("mwananchi-lm-studio-settings", listener);
  });

  it("adds local provider settings to LM Studio generation requests", () => {
    expect(readLmStudioSettings()).toEqual(defaultLmStudioSettings);

    saveLmStudioSettings({
      baseUrl: "http://127.0.0.1:4321/v1",
      model: "civic-local-model",
    });

    expect(
      withLocalProviderSettings({ provider: "lmstudio", model: "" }),
    ).toEqual({
      provider: "lmstudio",
      model: "local-model",
      baseUrl: "http://127.0.0.1:4321/v1",
    });
    expect(
      withLocalProviderSettings({ provider: "openai", model: "" }),
    ).toEqual({
      provider: "openai",
      model: "gpt-5.4-mini",
    });
  });

  it("returns known models for configured providers", () => {
    expect(getProviderModels("openai")).toContain("gpt-5.4-mini");
  });
});
