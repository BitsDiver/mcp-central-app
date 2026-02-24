import { ref, computed } from "vue";
import type { ChatMessage, ChatToolCall, Tool } from "@/types";
import { useChatSettingsStore } from "@/stores/chatSettings";
import { useOllama } from "@/composables/useOllama";
import { getSocket } from "@/api/socket";

// ── Shared generate opts interface (compatible with useOllama) ────────────────

export interface GenerateOpts {
  ollamaUrl?: string;
  ollamaApiKey?: string;
  model?: string;
  contextSize?: number;
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
 * - provider === "ollama"  → direct browser call via useOllama (unchanged path)
 * - provider !== "ollama"  → Socket.IO /chat namespace, streaming events from backend
 *
 * The generate() signature is 100% compatible with the old useOllama signature
 * so ChatView requires only a minimal change (import swap + isConfigured update).
 */
export function useChat() {
  const settingsStore = useChatSettingsStore();
  const ollama = useOllama();
  const _socketGenerating = ref(false);

  /** True while any generation is in progress (Ollama or socket) */
  const isGenerating = computed(() =>
    settingsStore.settings.provider === "ollama"
      ? ollama.isGenerating.value
      : _socketGenerating.value,
  );

  /** Abort the active generation */
  function stop() {
    const provider = settingsStore.settings.provider;
    if (provider === "ollama") {
      ollama.stop();
    } else {
      _socketGenerating.value = false;
      const socket = getSocket("chat");
      socket?.emit("stopGeneration", {});
    }
  }

  /** Dispatch generation to the active provider */
  async function generate(opts: GenerateOpts): Promise<void> {
    const provider = settingsStore.settings.provider;

    if (provider === "ollama") {
      return ollama.generate({
        ollamaUrl: opts.ollamaUrl ?? settingsStore.settings.ollamaUrl,
        ollamaApiKey:
          opts.ollamaApiKey ?? settingsStore.settings.ollamaApiKey ?? undefined,
        model: opts.model ?? settingsStore.settings.selectedModel,
        contextSize: opts.contextSize ?? settingsStore.settings.contextSize,
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

    return generateViaSocket(provider, opts);
  }

  // ── Socket-based generation ────────────────────────────────────────────────

  async function generateViaSocket(
    provider: string,
    opts: GenerateOpts,
  ): Promise<void> {
    const socket = getSocket("chat");
    if (!socket?.connected) {
      opts.onError("Chat socket not connected. Please refresh the page.");
      return;
    }

    _socketGenerating.value = true;

    // Track pending tool calls so we can match start → done events
    const pendingToolCalls = new Map<string, ChatToolCall>();

    return new Promise<void>((resolve) => {
      // ── Event listeners ──────────────────────────────────────────────────

      function onToken({
        content,
        thinking,
      }: {
        content: string;
        thinking?: string;
      }) {
        if (!_socketGenerating.value) return;
        opts.onToken(content, thinking ?? "");
      }

      function onToolStart({
        id,
        name,
        args,
      }: {
        id: string;
        name: string;
        args: Record<string, unknown>;
      }) {
        if (!_socketGenerating.value) return;
        const tc: ChatToolCall = { id, name, args, status: "running" };
        pendingToolCalls.set(id, tc);
        opts.onToolCall(tc).catch(() => {});
      }

      function onToolDone({
        id,
        name,
        result,
        error,
        status,
      }: {
        id: string;
        name: string;
        result?: unknown;
        error?: string;
        status: "success" | "error";
      }) {
        if (!_socketGenerating.value) return;
        const pending = pendingToolCalls.get(id);
        pendingToolCalls.delete(id);
        const tc: ChatToolCall = {
          id,
          name: name || pending?.name || "",
          args: pending?.args ?? {},
          result,
          error,
          status,
        };
        opts.onToolCall(tc).catch(() => {});
      }

      function onDone({
        content,
        thinking,
        usage,
      }: {
        content: string;
        thinking?: string;
        usage?: { promptTokens: number; completionTokens: number };
      }) {
        cleanup();
        opts.onDone(content, thinking ?? "");
        if (usage && opts.onUsage) {
          opts.onUsage(usage.promptTokens + usage.completionTokens);
        }
        _socketGenerating.value = false;
        resolve();
      }

      function onError({ message }: { message: string }) {
        cleanup();
        opts.onError(message);
        _socketGenerating.value = false;
        resolve();
      }

      function cleanup() {
        if (!socket) return;
        socket.off("chat:token", onToken);
        socket.off("chat:tool_start", onToolStart);
        socket.off("chat:tool_done", onToolDone);
        socket.off("chat:done", onDone);
        socket.off("chat:error", onError);
      }

      socket.on("chat:token", onToken);
      socket.on("chat:tool_start", onToolStart);
      socket.on("chat:tool_done", onToolDone);
      socket.on("chat:done", onDone);
      socket.on("chat:error", onError);

      // Emit the chat request to the backend
      socket.emit("chat", {
        provider,
        model: opts.model ?? settingsStore.settings.selectedModel,
        messages: opts.messages,
        systemPrompt: opts.systemPrompt,
        contextSize: opts.contextSize ?? settingsStore.settings.contextSize,
      });
    });
  }

  return { isGenerating, generate, stop };
}
