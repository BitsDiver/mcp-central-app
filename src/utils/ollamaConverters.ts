/**
 * Pure converter functions for the Ollama API format.
 * Extracted from useOllama.ts so they can be reused by usePlanning and
 * useAgentOrchestrator without creating a useOllama() composable instance.
 */
import type { ChatMessage, Tool } from "@/types";

// ── Ollama wire-format types ───────────────────────────────────────────────

export interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  images?: string[];
  tool_calls?: OllamaToolCall[];
  tool_call_id?: string;
}

export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OllamaStreamChunk {
  model: string;
  done: boolean;
  message?: {
    role?: string;
    content?: string;
    tool_calls?: OllamaToolCall[];
    thinking?: string;
  };
  /** Token usage — present on the final done:true chunk */
  prompt_eval_count?: number;
  eval_count?: number;
}

// ── Pure converter functions ───────────────────────────────────────────────

/**
 * Extract <think>…</think> thinking block from Ollama raw content.
 */
export function parseThinking(content: string): {
  thinking: string;
  text: string;
} {
  const thinkMatch = content.match(/^<think>([\s\S]*?)<\/think>\s*([\s\S]*)$/s);
  if (thinkMatch) {
    return { thinking: thinkMatch[1].trim(), text: thinkMatch[2].trim() };
  }
  return { thinking: "", text: content };
}

/** Convert MCP Tool list to Ollama tool-definition format. */
export function toolsToOllama(tools: Tool[]): OllamaTool[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: (t.inputSchema as Record<string, unknown>) ?? {
        type: "object",
        properties: {},
      },
    },
  }));
}

/**
 * Convert our internal ChatMessage array into the flat Ollama messages format.
 * Ignores streaming messages and plan/agent role messages.
 */
export function messagesToOllama(
  messages: ChatMessage[],
  systemPrompt?: string,
): OllamaMessage[] {
  const result: OllamaMessage[] = [];
  if (systemPrompt) {
    result.push({ role: "system", content: systemPrompt });
  }
  for (const msg of messages) {
    if (msg.isStreaming) continue;
    // Skip plan/agent role messages — they're UI-only
    if (msg.role === "plan" || msg.role === "agent") continue;
    if (msg.role === "user") {
      const ollMsg: OllamaMessage = { role: "user", content: msg.content };
      if (msg.attachments?.length) {
        ollMsg.images = msg.attachments
          .filter((a) => a.type.startsWith("image/"))
          .map((a) => a.base64.split(",").pop() ?? a.base64);
      }
      result.push(ollMsg);
    } else if (msg.role === "assistant") {
      const assistantMsg: OllamaMessage = {
        role: "assistant",
        content: msg.content,
      };
      // Preserve tool_calls so multi-turn tool context is correct
      if ((msg as any)._ollamaToolCalls?.length) {
        assistantMsg.tool_calls = (msg as any)._ollamaToolCalls;
      }
      result.push(assistantMsg);
    } else if (msg.role === "tool" && msg.toolCalls?.length) {
      for (const tc of msg.toolCalls) {
        result.push({
          role: "tool",
          content:
            tc.result !== undefined
              ? JSON.stringify(tc.result)
              : (tc.error ?? ""),
          tool_call_id: tc.id,
        });
      }
    }
  }
  return result;
}
