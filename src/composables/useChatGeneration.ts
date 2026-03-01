import { ref, computed, type Ref } from "vue";
import type {
  ChatMessage,
  ChatAttachment,
  ChatToolCall,
  ChatSession,
  ChatMode,
} from "@/types";
import { useChatStore } from "@/stores/chat";
import { useChatSettingsStore } from "@/stores/chatSettings";
import { useToolStore } from "@/stores/tools";
import { useChat } from "@/composables/useChat";
import { usePlanning } from "@/composables/usePlanning";
import { useAgentOrchestrator } from "@/composables/useAgentOrchestrator";
import { useAgentPlanningStore } from "@/stores/agentPlanning";

/**
 * useChatGeneration — encapsulates send / retry / generation orchestration.
 *
 * Extracts the duplicated callback wiring from ChatView into a single
 * `runGeneration()` helper so that `handleSend` and `handleRetry` share
 * the same logic.
 */
export function useChatGeneration(
  chatKeyReady: Ref<boolean>,
  linkToTenant: Ref<boolean>,
  scrollToBottom: (smooth?: boolean) => void,
) {
  const chatStore = useChatStore();
  const settingsStore = useChatSettingsStore();
  const toolStore = useToolStore();
  const { isGenerating, generate, stop } = useChat();
  const planning = usePlanning();
  const orchestrator = useAgentOrchestrator();
  const planningStore = useAgentPlanningStore();

  const generationError = ref<string | null>(null);
  /** Cumulative token usage (prompt + completion) for the latest completed turn */
  const usedTokens = ref(0);

  const contextUsage = computed(() =>
    settingsStore.settings.contextSize > 0
      ? usedTokens.value / settingsStore.settings.contextSize
      : 0,
  );

  // ── Helpers ────────────────────────────────────────────────

  function generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function ensureActiveSession(): string {
    if (!chatStore.activeSessionId) {
      const tenantId = linkToTenant.value
        ? (chatStore.activeSession?.tenantId ?? null)
        : null;
      chatStore.createSession(tenantId);
    }
    return chatStore.activeSessionId!;
  }

  // ── Core generation loop (shared by send & retry) ─────────

  async function runGeneration(
    sessionId: string,
    assistantId: string,
    precedingMessages: ChatMessage[],
    session: ChatSession | null,
    maxIterationsOverride?: number,
  ): Promise<void> {
    let activeTcMessage: ChatMessage | null = null;
    /** Tracks the assistant message that should receive streamed tokens.
     *  Updated whenever onToolCall creates a fresh assistant bubble. */
    let currentAssistantId = assistantId;

    await generate({
      ollamaUrl: settingsStore.settings.ollamaUrl,
      ollamaApiKey: settingsStore.settings.ollamaApiKey || undefined,
      model: settingsStore.settings.selectedModel,
      contextSize: settingsStore.settings.contextSize,
      maxIterations:
        maxIterationsOverride ?? settingsStore.settings.maxIterations,
      systemPrompt:
        session?.systemPrompt ||
        settingsStore.settings.systemPrompt ||
        undefined,
      messages: precedingMessages,
      tools: chatKeyReady.value ? toolStore.tools : [],

      onToken(text: string, thinking: string) {
        chatStore.updateMessage(sessionId, currentAssistantId, {
          content: text,
          thinking: thinking || undefined,
          isStreaming: true,
        });
        scrollToBottom(false);
      },

      async onToolCall(toolCall: ChatToolCall) {
        if (!activeTcMessage) {
          activeTcMessage = {
            id: generateId(),
            role: "tool",
            content: "",
            toolCalls: [],
            createdAt: new Date().toISOString(),
          };
          chatStore.addMessage(sessionId, activeTcMessage);
        }

        // Build the new toolCalls array WITHOUT mutating activeTcMessage first.
        // activeTcMessage is the raw object (not the Vue Proxy), so setting
        // properties on it changes the Proxy's underlying target.  If we do
        // that before chatStore.updateMessage, the Proxy's set-trap sees
        // oldValue === newValue and skips the reactivity trigger.
        const existingIdx = (activeTcMessage.toolCalls ?? []).findIndex(
          (tc) => tc.id === toolCall.id,
        );
        let newToolCalls: ChatToolCall[];
        if (existingIdx !== -1) {
          newToolCalls = [...(activeTcMessage.toolCalls ?? [])];
          newToolCalls[existingIdx] = { ...toolCall };
        } else {
          newToolCalls = [
            ...(activeTcMessage.toolCalls ?? []),
            { ...toolCall },
          ];
        }

        // Push through the Proxy first → triggers Vue reactivity
        chatStore.updateMessage(sessionId, activeTcMessage.id, {
          toolCalls: newToolCalls,
        });
        // Then sync local ref for subsequent lookups
        activeTcMessage.toolCalls = newToolCalls;

        if (toolCall.status === "success" || toolCall.status === "error") {
          // Mark the current assistant as done streaming before switching
          chatStore.updateMessage(sessionId, currentAssistantId, {
            isStreaming: false,
          });

          activeTcMessage = null;
          const nextAssistId = generateId();
          currentAssistantId = nextAssistId;
          const nextAssist: ChatMessage = {
            id: nextAssistId,
            role: "assistant",
            content: "",
            isStreaming: true,
            createdAt: new Date().toISOString(),
          };
          chatStore.addMessage(sessionId, nextAssist);
          scrollToBottom(true);
        }
      },

      onDone(finalContent: string, finalThinking: string) {
        chatStore.updateMessage(sessionId, currentAssistantId, {
          content: finalContent,
          thinking: finalThinking || undefined,
          isStreaming: false,
        });
        scrollToBottom(true);
      },

      onError(err: string) {
        chatStore.updateMessage(sessionId, currentAssistantId, {
          isStreaming: false,
          error: err,
        });
        generationError.value = err;
      },

      onUsage(used: number) {
        usedTokens.value = used;
      },
    });
  }

  // ── Plan mode ──────────────────────────────────────────────

  async function runPlanMode(
    sessionId: string,
    userContent: string,
    precedingMessages: ChatMessage[],
  ): Promise<void> {
    // Step 1: add a placeholder plan message
    const planMsgId = generateId();
    const planMsg: ChatMessage = {
      id: planMsgId,
      role: "plan",
      content: "Generating plan…",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };
    chatStore.addMessage(sessionId, planMsg);
    scrollToBottom(true);

    // Step 2: generate the plan
    const { plan, error: planError } = await planning.generatePlan(userContent);

    if (planError || !plan) {
      chatStore.updateMessage(sessionId, planMsgId, {
        content: planError ?? "Failed to generate plan.",
        isStreaming: false,
        error: planError ?? "Failed to generate plan.",
      });
      generationError.value = planError ?? "Failed to generate plan.";
      return;
    }

    // Step 3: show the plan in the message with the PlanBlock
    chatStore.updateMessage(sessionId, planMsgId, {
      content: "",
      agentPlan: plan,
      isStreaming: false,
    });
    scrollToBottom(true);

    // Step 4: wait for user approval
    const approved = await planningStore.waitForApproval(plan);
    if (!approved) {
      // Rejected — add a brief note and stop
      const rejectedId = generateId();
      chatStore.addMessage(sessionId, {
        id: rejectedId,
        role: "assistant",
        content: "Plan rejected.",
        createdAt: new Date().toISOString(),
      });
      return;
    }

    // Step 5: execute via orchestrator
    scrollToBottom(true);
    const result = await orchestrator.execute(plan, precedingMessages);

    // Step 6: add final summary
    const summaryId = generateId();
    chatStore.addMessage(sessionId, {
      id: summaryId,
      role: "assistant",
      content: result.summary || result.error || "Agent execution complete.",
      isStreaming: false,
      error: result.error ?? undefined,
      createdAt: new Date().toISOString(),
    });
    scrollToBottom(true);
  }

  // ── Public API ─────────────────────────────────────────────

  async function handleSend(
    content: string,
    attachments: ChatAttachment[],
    mode?: ChatMode,
  ) {
    const effectiveMode = mode ?? settingsStore.settings.chatMode ?? "agent";
    const isConfigured = (() => {
      const p = settingsStore.settings.provider ?? "ollama";
      if (p === "ollama")
        return (
          !!settingsStore.settings.ollamaUrl &&
          !!settingsStore.settings.selectedModel
        );
      return !!settingsStore.settings.selectedModel;
    })();
    if (!isConfigured) return;

    generationError.value = null;
    const sessionId = ensureActiveSession();

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: new Date().toISOString(),
    };
    chatStore.addMessage(sessionId, userMsg);

    // ── Plan mode: decompose → approve → execute ─────────────
    if (effectiveMode === "plan") {
      const precedingMessages = [
        ...chatStore.activeSession!.messages.filter((m) => !m.isStreaming),
      ];
      await runPlanMode(sessionId, content, precedingMessages);
      return;
    }

    // ── Ask / Agent mode: single generate call ────────────────
    const assistantId = generateId();
    chatStore.addMessage(sessionId, {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
      createdAt: new Date().toISOString(),
    });
    scrollToBottom(true);

    const allMessages = [
      ...chatStore.activeSession!.messages.filter(
        (m) => !m.isStreaming || m.id === assistantId,
      ),
    ];

    // "ask" caps tool loops to 1 iteration (single-shot response)
    const maxIterations =
      effectiveMode === "ask" ? 1 : settingsStore.settings.maxIterations;

    await runGeneration(
      sessionId,
      assistantId,
      allMessages.slice(0, -1),
      chatStore.activeSession,
      maxIterations,
    );
  }

  async function handleRetry(userMsgId: string) {
    const session = chatStore.activeSession;
    if (!session) return;
    const sessionId = session.id;
    const userMsg = session.messages.find((m) => m.id === userMsgId);
    if (!userMsg || userMsg.role !== "user") return;

    generationError.value = null;
    chatStore.removeMessagesAfter(sessionId, userMsgId);

    const assistantId = generateId();
    chatStore.addMessage(sessionId, {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
      createdAt: new Date().toISOString(),
    });
    scrollToBottom(true);

    const allMessages = [
      ...chatStore.activeSession!.messages.filter(
        (m) => !m.isStreaming || m.id === assistantId,
      ),
    ];

    await runGeneration(
      sessionId,
      assistantId,
      allMessages.slice(0, -1),
      chatStore.activeSession,
    );
  }

  return {
    isGenerating,
    stop,
    generationError,
    usedTokens,
    contextUsage,
    handleSend,
    handleRetry,
  };
}
