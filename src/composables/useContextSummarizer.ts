/**
 * useContextSummarizer — compresses chat history when the context window
 * approaches its limit.
 *
 * When token usage reaches SUMMARIZE_THRESHOLD (85 %) of contextSize the
 * composable:
 *   1. Keeps the KEEP_RECENT_PAIRS most-recent user/assistant pairs verbatim.
 *   2. Summarizes all older pairs in a single generate() call.
 *   3. Returns a synthetic [summary-user-msg, ...recent-pairs] array.
 *
 * If usedTokens is 0 (backend did not report usage) the function estimates
 * token count by dividing total character length by CHARS_PER_TOKEN.
 *
 * Tool / plan / agent messages are excluded from summarization — they are
 * UI-only display messages not sent to the model.
 */
import { useChat } from "@/composables/useChat";
import { useChatSettingsStore } from "@/stores/chatSettings";
import type { ChatMessage } from "@/types";

const SUMMARIZE_THRESHOLD = 0.85;
const KEEP_RECENT_PAIRS = 4; // keep last N user+assistant message pairs
const CHARS_PER_TOKEN = 4; // rough estimate when reported usage is 0

const SUMMARY_SYSTEM_PROMPT = `You are a conversation summarizer assistant. You will receive a list of prior messages from a conversation. Write a concise summary in 2–4 paragraphs that faithfully preserves:
- Key facts, decisions, and conclusions reached
- Any code, commands, or configuration values that were mentioned
- Outstanding questions or action items
- The tone and direction of the conversation

Do not add new information. Do not include any preamble or meta-commentary — output the summary text only.`;

export interface CompressionResult {
  messages: ChatMessage[];
  /** True when compression actually fired (original messages were condensed) */
  didCompress: boolean;
}

export function useContextSummarizer() {
  const settingsStore = useChatSettingsStore();

  /** Rough token estimate via character count when reported usage is absent. */
  function _estimateTokens(messages: ChatMessage[]): number {
    return messages.reduce(
      (sum, m) => sum + Math.ceil(m.content.length / CHARS_PER_TOKEN),
      0,
    );
  }

  /**
   * Compress the message history if the context window is > 85 % full.
   *
   * @param messages     Full conversation history (all roles).
   * @param reportedUsed Token count from the last onUsage callback (0 if unknown).
   */
  async function compressIfNeeded(
    messages: ChatMessage[],
    reportedUsed: number,
  ): Promise<CompressionResult> {
    const contextSize = settingsStore.settings.contextSize;
    if (!contextSize || contextSize <= 0) {
      return { messages, didCompress: false };
    }

    // Prefer reported usage; fall back to character-count estimate
    const estimated = _estimateTokens(messages);
    const used = reportedUsed > 0 ? reportedUsed : estimated;
    const ratio = used / contextSize;

    if (ratio < SUMMARIZE_THRESHOLD) {
      return { messages, didCompress: false };
    }

    // Only user + assistant messages carry semantic content for the model
    const uaMessages = messages.filter(
      (m) => m.role === "user" || m.role === "assistant",
    );

    const keepCount = KEEP_RECENT_PAIRS * 2; // each pair = 1 user + 1 assistant
    if (uaMessages.length <= keepCount) {
      // History is short — nothing useful to compress
      return { messages, didCompress: false };
    }

    const toSummarize = uaMessages.slice(0, -keepCount);
    const toKeep = uaMessages.slice(-keepCount);

    // ── Ask the model to summarize the older portion ──────────────────────
    let summaryText = "";
    const { settings } = settingsStore;

    await new Promise<void>((resolve) => {
      const chat = useChat();
      chat.generate({
        model: settings.selectedModel,
        ollamaUrl: settings.ollamaUrl,
        ollamaApiKey: settings.ollamaApiKey ?? undefined,
        contextSize: settings.contextSize,
        systemPrompt: SUMMARY_SYSTEM_PROMPT,
        messages: toSummarize,
        tools: [], // No tool calls during summarization
        maxIterations: 1,
        onToken: (text) => {
          summaryText = text; // cumulative — last assignment wins
        },
        onToolCall: async () => {},
        onDone: (finalText) => {
          summaryText = finalText;
          resolve();
        },
        onError: () => {
          resolve(); // fall back: return original history
        },
        onUsage: () => {},
      });
    });

    if (!summaryText) {
      // Summary call failed — return original to avoid data loss
      return { messages, didCompress: false };
    }

    // ── Build compressed history ──────────────────────────────────────────
    const summaryMsg: ChatMessage = {
      id: `summary-${Date.now()}`,
      role: "user",
      content: `[Summary of earlier conversation]\n\n${summaryText}`,
      createdAt: new Date().toISOString(),
    };

    return {
      messages: [summaryMsg, ...toKeep],
      didCompress: true,
    };
  }

  return { compressIfNeeded };
}
