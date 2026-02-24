import { defineStore } from "pinia";
import { ref, watch } from "vue";
import type {
  ChatSettings,
  LLMProvider,
  OllamaModel,
  ProviderConfig,
} from "@/types";

const STORAGE_KEY = "mcp-chat-settings";

function loadFromStorage(): ChatSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ChatSettings>;
      return {
        ollamaUrl: parsed.ollamaUrl ?? "http://localhost:11434",
        ollamaApiKey: parsed.ollamaApiKey ?? "",
        selectedModel: parsed.selectedModel ?? "",
        contextSize: parsed.contextSize ?? 8192,
        systemPrompt: parsed.systemPrompt ?? "",
        provider: parsed.provider ?? "ollama",
        perProviderSettings: parsed.perProviderSettings ?? {},
      };
    }
  } catch {}
  return {
    ollamaUrl: "http://localhost:11434",
    ollamaApiKey: "",
    selectedModel: "",
    contextSize: 8192,
    systemPrompt: "",
    provider: "ollama",
    perProviderSettings: {},
  };
}

// Per-provider default models (shown when no model is selected yet)
export const PROVIDER_DEFAULT_MODELS: Record<LLMProvider, string[]> = {
  ollama: [],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  anthropic: [
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-haiku-3-5",
    "claude-opus-4",
    "claude-sonnet-4",
    "claude-3-5-haiku-latest",
  ],
  gemini: [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ],
};

export const useChatSettingsStore = defineStore("chatSettings", () => {
  const settings = ref<ChatSettings>(loadFromStorage());
  const availableModels = ref<OllamaModel[]>([]);
  const isLoadingModels = ref(false);
  const modelLoadError = ref<string | null>(null);

  watch(
    settings,
    (val) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    },
    { deep: true },
  );

  /** Fetch models from local Ollama (only relevant when provider === "ollama") */
  async function fetchModels(): Promise<void> {
    if (!settings.value.ollamaUrl) return;
    isLoadingModels.value = true;
    modelLoadError.value = null;
    try {
      const res = await fetch(`${settings.value.ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { models: OllamaModel[] };
      availableModels.value = data.models ?? [];
      if (!settings.value.selectedModel && availableModels.value.length > 0) {
        settings.value.selectedModel = availableModels.value[0].name;
      }
    } catch (err) {
      modelLoadError.value =
        err instanceof Error ? err.message : "Failed to connect to Ollama";
      availableModels.value = [];
    } finally {
      isLoadingModels.value = false;
    }
  }

  function update(patch: Partial<ChatSettings>): void {
    settings.value = { ...settings.value, ...patch };
  }

  /** Switch provider — auto-saves the last committed config and restores the target provider's saved config. */
  function switchProvider(nextProvider: LLMProvider): void {
    const currentProvider = settings.value.provider ?? "ollama";
    const perProviderSettings: Partial<Record<LLMProvider, ProviderConfig>> = {
      ...(settings.value.perProviderSettings ?? {}),
      [currentProvider]: {
        selectedModel: settings.value.selectedModel,
        contextSize: settings.value.contextSize,
        systemPrompt: settings.value.systemPrompt,
      },
    };
    const restored = perProviderSettings[nextProvider];
    settings.value = {
      ...settings.value,
      provider: nextProvider,
      selectedModel: restored?.selectedModel ?? "",
      contextSize: restored?.contextSize ?? 8192,
      systemPrompt: restored?.systemPrompt ?? "",
      perProviderSettings,
    };
  }

  /** Explicitly save the current provider's form values and persist them in perProviderSettings. */
  function saveProviderConfig(
    p: LLMProvider,
    config: {
      selectedModel: string;
      contextSize: number;
      systemPrompt: string;
      ollamaUrl?: string;
      ollamaApiKey?: string;
    },
  ): void {
    const perProviderSettings: Partial<Record<LLMProvider, ProviderConfig>> = {
      ...(settings.value.perProviderSettings ?? {}),
      [p]: {
        selectedModel: config.selectedModel,
        contextSize: config.contextSize,
        systemPrompt: config.systemPrompt,
      },
    };
    settings.value = {
      ...settings.value,
      selectedModel: config.selectedModel,
      contextSize: config.contextSize,
      systemPrompt: config.systemPrompt,
      ...(config.ollamaUrl !== undefined
        ? { ollamaUrl: config.ollamaUrl }
        : {}),
      ...(config.ollamaApiKey !== undefined
        ? { ollamaApiKey: config.ollamaApiKey }
        : {}),
      perProviderSettings,
    };
  }

  return {
    settings,
    availableModels,
    isLoadingModels,
    modelLoadError,
    fetchModels,
    update,
    switchProvider,
    saveProviderConfig,
  };
});
