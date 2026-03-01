import { ref, computed } from "vue";
import type { ChatMessage, ChatToolCall, Tool } from "@/types";
import { useChatSettingsStore } from "@/stores/chatSettings";
import { useChatStore } from "@/stores/chat";
import { useOllama } from "@/composables/useOllama";
import { generateViaHttp, abortHttpGeneration } from "@/api/chatTransport";

// ── Shared generate opts interface (compatible with useOllama) ────────────────

export interface GenerateOpts {
  ollamaUrl?: string;
  ollamaApiKey?: string;
  model?: string;
  contextSize?: number;
  /** Maximum tool-call iterations before the agentic loop is stopped. */
  maxIterations?: number;
  systemPrompt?: string;
  messages: ChatMessage[];
  /** Used for Ollama (browser-side MCP). Ignored for backend providers. */
  tools: Tool[];
  onToken: (text: string, thinking: string) => void;
  onToolCall: (toolCall: ChatToolCall) => Promise<void>;
  onDone: (finalContent: string, finalThinking: string) => void;
  onError: (err: string) => void;
  /** Called with total (prompt + completion) token count */
  onUsage?: (usedTokens: number) => void;
}

/**
 * useChat — Unified chat composable that dispatches to the correct provider.
 *
 * - provider === "ollama" && ollamaPath === "browser"
 *     → direct browser call via useOllama (unchanged)
 * - everything else (all backend providers + ollama with ollamaPath === "backend")
 *     → POST /api/chat  HTTP SSE via chatTransport.generateViaHttp()
 *
 * The generate() signature is 100% compatible with the old useOllama signature.
 */
export function useChat() {
  const settingsStore = useChatSettingsStore();
  const chatStore = useChatStore();
  const ollama = useOllama();
  const _httpGenerating = ref(false);

  /** True while any generation is in progress */
  const isGenerating = computed(() => {
    const p = settingsStore.settings.provider;
    const path = settingsStore.settings.ollamaPath ?? "browser";
    return p === "ollama" && path === "browser"
      ? ollama.isGenerating.value
      : _httpGenerating.value;
  });

  /** Abort the active generation */
  function stop() {
    const p = settingsStore.settings.provider;
    const path = settingsStore.settings.ollamaPath ?? "browser";
    if (p === "ollama" && path === "browser") {
      ollama.stop();
    } else {
      abortHttpGeneration();
      _httpGenerating.value = false;
    }
  }

  /** Dispatch generation to the active provider */
  async function generate(opts: GenerateOpts): Promise<void> {
    const provider = settingsStore.settings.provider;
    const ollamaPath = settingsStore.settings.ollamaPath ?? "browser";

    // Ollama browser-direct path (existing, unchanged)
    if (provider === "ollama" && ollamaPath === "browser") {
      return ollama.generate({
        ollamaUrl: opts.ollamaUrl ?? settingsStore.settings.ollamaUrl,
        ollamaApiKey:
          opts.ollamaApiKey ?? settingsStore.settings.ollamaApiKey ?? undefined,
        model: opts.model ?? settingsStore.settings.selectedModel,
        contextSize: opts.contextSize ?? settingsStore.settings.contextSize,
        maxIterations:
          opts.maxIterations ?? settingsStore.settings.maxIterations,
        systemPrompt: opts.systemPrompt,
        messages: opts.messages,
        tools: opts.tools,
        onToken: opts.onToken,
        onToolCall: opts.onToolCall,
        onDone: opts.onDone,
        onError: opts.onError,
        onUsage: opts.onUsage,
      });
    }

    // HTTP SSE path — all backend providers + ollama-backend
    return generateViaBackend(provider, opts);
  }

  async function generateViaBackend(
    provider: string,
    opts: GenerateOpts,
  ): Promise<void> {
    _httpGenerating.value = true;
    const tenantId = chatStore.activeSession?.tenantId ?? null;
    const ollamaUrl =
      provider === "ollama" ? settingsStore.settings.ollamaUrl : undefined;

    try {
      await generateViaHttp({
        provider,
        model: opts.model ?? settingsStore.settings.selectedModel,
        messages: opts.messages,
        tenantId,
        systemPrompt:
          opts.systemPrompt ?? settingsStore.settings.systemPrompt ?? undefined,
        maxIterations:
          opts.maxIterations ?? settingsStore.settings.maxIterations,
        ollamaUrl,
        onToken: opts.onToken,
        onToolCall: opts.onToolCall,
        onDone: opts.onDone,
        onError: opts.onError,
        onUsage: opts.onUsage,
      });
    } finally {
      _httpGenerating.value = false;
    }
  }

  return { isGenerating, generate, stop };
}
