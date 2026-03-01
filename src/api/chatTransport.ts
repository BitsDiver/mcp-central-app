/**
 * chatTransport — HTTP SSE transport for the mcp-central /api/chat endpoint.
 *
 * Replaces the Socket.IO-based generateViaSocket() from useChat.ts for all
 * non-Ollama providers (and for Ollama when ollamaPath === 'backend').
 *
 * The backend streams UIMessageChunk objects over Server-Sent Events using
 * Vercel AI SDK's pipeUIMessageStreamToResponse. This module parses those
 * chunks and maps them to the existing callback interface (onToken, onToolCall,
 * onDone, onError) so that useChatGeneration.ts requires zero changes.
 *
 * Message conversion: ChatMessage[] → UIMessage[]
 *   Only user + assistant messages are sent (tool/plan/agent roles are UI-only).
 *   Multi-step tool history is handled server-side within a single request —
 *   the frontend only needs the conversation text history.
 */

import { parseJsonEventStream, uiMessageChunkSchema, type UIMessage } from "ai";
import type { ChatMessage, ChatToolCall } from "@/types";
import { useAuthStore } from "@/stores/auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

// Active AbortController — one per concurrent HTTP generation.
let _activeAbort: AbortController | null = null;

/**
 * Abort the currently running HTTP generation (if any).
 */
export function abortHttpGeneration(): void {
  _activeAbort?.abort();
  _activeAbort = null;
}

// ── Message conversion ──────────────────────────────────────────────────────

/**
 * Convert our ChatMessage[] history to UIMessage[] for the backend.
 * Only user + assistant roles are included — tool/plan/agent roles are
 * UI-only and not needed by the model.
 */
function chatMessagesToUIMessages(messages: ChatMessage[]): UIMessage[] {
  const result: UIMessage[] = [];
  for (const msg of messages) {
    if (msg.isStreaming) continue; // skip in-progress messages
    if (msg.role === "user") {
      result.push({
        id: msg.id,
        role: "user",
        parts: [{ type: "text", text: msg.content }],
      });
    } else if (msg.role === "assistant" && msg.content) {
      const parts: UIMessage["parts"] = [];
      if (msg.thinking) {
        parts.push({ type: "reasoning", text: msg.thinking });
      }
      parts.push({ type: "text", text: msg.content });
      result.push({
        id: msg.id,
        role: "assistant",
        parts,
      });
    }
    // tool / plan / agent roles are display-only — skip
  }
  return result;
}

// ── HTTP SSE transport ──────────────────────────────────────────────────────

export interface HttpGenerateOpts {
  provider: string;
  model: string;
  messages: ChatMessage[];
  tenantId?: string | null;
  systemPrompt?: string;
  maxIterations?: number;
  /** Only used when provider is 'ollama' routed via backend */
  ollamaUrl?: string;
  onToken: (text: string, thinking: string) => void;
  onToolCall: (toolCall: ChatToolCall) => Promise<void>;
  onDone: (finalContent: string, finalThinking: string) => void;
  onError: (err: string) => void;
  onUsage?: (usedTokens: number) => void;
}

/**
 * Generate a chat completion via POST /api/chat (HTTP SSE).
 *
 * Streams UIMessageChunk events and maps them to the onToken / onToolCall /
 * onDone / onError callbacks used by useChatGeneration.ts.
 */
export async function generateViaHttp(opts: HttpGenerateOpts): Promise<void> {
  const authStore = useAuthStore();
  const token = authStore.token;

  // Cancel any previous in-flight request
  _activeAbort?.abort();
  _activeAbort = new AbortController();
  const signal = _activeAbort.signal;

  const uiMessages = chatMessagesToUIMessages(opts.messages);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal,
      body: JSON.stringify({
        provider: opts.provider,
        model: opts.model,
        messages: uiMessages,
        tenantId: opts.tenantId ?? undefined,
        systemPrompt: opts.systemPrompt,
        maxIterations: opts.maxIterations,
        ollamaUrl: opts.ollamaUrl,
      }),
    });
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "AbortError") return;
    opts.onError(err instanceof Error ? err.message : String(err));
    return;
  }

  if (!res.ok) {
    try {
      const body = (await res.json()) as { message?: string };
      opts.onError(body.message ?? `HTTP ${res.status}`);
    } catch {
      opts.onError(`HTTP ${res.status}`);
    }
    return;
  }

  if (!res.body) {
    opts.onError("Empty response body");
    return;
  }

  // ── Parse UIMessageChunk SSE stream ────────────────────────────────────────
  const stream = parseJsonEventStream({
    stream: res.body as ReadableStream<Uint8Array>,
    schema: uiMessageChunkSchema,
  });

  let accText = "";
  let accThinking = "";

  // Track tool calls by ID so we can match inputs → outputs.
  const toolCallMap = new Map<
    string,
    { id: string; name: string; args: Record<string, unknown> }
  >();

  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value.success) continue;
      const chunk = value.value;

      if (chunk.type === "text-delta") {
        accText += chunk.delta;
        opts.onToken(accText, accThinking);
      } else if (chunk.type === "reasoning-delta") {
        accThinking += chunk.delta;
        opts.onToken(accText, accThinking);
      } else if (chunk.type === "tool-input-available") {
        const toolCall: ChatToolCall = {
          id: chunk.toolCallId,
          name: chunk.toolName,
          args: (chunk.input as Record<string, unknown>) ?? {},
          status: "running",
        };
        toolCallMap.set(chunk.toolCallId, {
          id: chunk.toolCallId,
          name: chunk.toolName,
          args: (chunk.input as Record<string, unknown>) ?? {},
        });
        await opts.onToolCall(toolCall);
      } else if (chunk.type === "tool-output-available") {
        const tc = toolCallMap.get(chunk.toolCallId);
        if (tc) {
          const done: ChatToolCall = {
            id: tc.id,
            name: tc.name,
            args: tc.args,
            result: chunk.output,
            status: "success",
          };
          await opts.onToolCall(done);
          // Reset accumulators — useChatGeneration just created a new assistant bubble
          accText = "";
          accThinking = "";
          toolCallMap.delete(chunk.toolCallId);
        }
      } else if (chunk.type === "tool-output-error") {
        const tc = toolCallMap.get(chunk.toolCallId);
        if (tc) {
          const err: ChatToolCall = {
            id: tc.id,
            name: tc.name,
            args: tc.args,
            error: chunk.errorText,
            status: "error",
          };
          await opts.onToolCall(err);
          accText = "";
          accThinking = "";
          toolCallMap.delete(chunk.toolCallId);
        }
      } else if (chunk.type === "finish") {
        // Surface token usage so contextUsage stays accurate
        const usage = (
          chunk as unknown as {
            usage?: {
              inputTokens?: number;
              outputTokens?: number;
            };
          }
        ).usage;
        if (usage && opts.onUsage) {
          const total = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
          if (total > 0) opts.onUsage(total);
        }
        opts.onDone(accText, accThinking);
        _activeAbort = null;
      } else if (chunk.type === "error") {
        opts.onError(chunk.errorText);
        _activeAbort = null;
        return;
      } else if (chunk.type === "abort") {
        opts.onError("Generation aborted by server");
        _activeAbort = null;
        return;
      }
    }
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "AbortError") return;
    opts.onError(err instanceof Error ? err.message : String(err));
  } finally {
    reader.releaseLock();
    _activeAbort = null;
  }
}
