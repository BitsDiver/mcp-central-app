import { ref } from "vue";
import type { ChatMessage, ChatToolCall, Tool } from "@/types";
import { callMcpTool } from "@/api/mcpClient";

interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  images?: string[];
  tool_call_id?: string;
}

interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OllamaStreamChunk {
  model: string;
  done: boolean;
  message?: {
    role?: string;
    content?: string;
    tool_calls?: OllamaToolCall[];
    thinking?: string;
  };
}

function parseThinking(content: string): { thinking: string; text: string } {
  const thinkMatch = content.match(/^<think>([\s\S]*?)<\/think>\s*([\s\S]*)$/s);
  if (thinkMatch) {
    return { thinking: thinkMatch[1].trim(), text: thinkMatch[2].trim() };
  }
  return { thinking: "", text: content };
}

function toolsToOllama(tools: Tool[]): OllamaTool[] {
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

function messagesToOllama(
  messages: ChatMessage[],
  systemPrompt?: string,
): OllamaMessage[] {
  const result: OllamaMessage[] = [];
  if (systemPrompt) {
    result.push({ role: "system", content: systemPrompt });
  }
  for (const msg of messages) {
    if (msg.isStreaming) continue;
    if (msg.role === "user") {
      const ollMsg: OllamaMessage = { role: "user", content: msg.content };
      if (msg.attachments?.length) {
        ollMsg.images = msg.attachments
          .filter((a) => a.type.startsWith("image/"))
          .map((a) => a.base64.split(",").pop() ?? a.base64);
      }
      result.push(ollMsg);
    } else if (msg.role === "assistant") {
      result.push({ role: "assistant", content: msg.content });
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

export function useOllama() {
  const isGenerating = ref(false);
  const abortController = ref<AbortController | null>(null);

  function stop() {
    abortController.value?.abort();
    abortController.value = null;
    isGenerating.value = false;
  }

  async function generate(opts: {
    ollamaUrl: string;
    model: string;
    contextSize: number;
    systemPrompt?: string;
    messages: ChatMessage[];
    tools: Tool[];
    onToken: (text: string, thinking: string) => void;
    onToolCall: (toolCall: ChatToolCall) => Promise<void>;
    onDone: (finalContent: string, finalThinking: string) => void;
    onError: (err: string) => void;
  }): Promise<void> {
    isGenerating.value = true;
    abortController.value = new AbortController();

    const {
      ollamaUrl,
      model,
      contextSize,
      systemPrompt,
      messages,
      tools,
      onToken,
      onToolCall,
      onDone,
      onError,
    } = opts;

    try {
      let continueLoop = true;
      let loopMessages = [...messages];

      while (continueLoop && isGenerating.value) {
        const ollMessages = messagesToOllama(loopMessages, systemPrompt);
        const ollTools = tools.length > 0 ? toolsToOllama(tools) : undefined;

        const res = await fetch(`${ollamaUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.value?.signal,
          body: JSON.stringify({
            model,
            messages: ollMessages,
            tools: ollTools,
            stream: true,
            options: { num_ctx: contextSize },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          onError(`Ollama error ${res.status}: ${errText}`);
          break;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          onError("No response body from Ollama");
          break;
        }

        const decoder = new TextDecoder();
        let accContent = "";
        let accThinking = "";
        let pendingToolCalls: OllamaToolCall[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const lines = decoder.decode(value).split("\n").filter(Boolean);
          for (const line of lines) {
            let chunk: OllamaStreamChunk;
            try {
              chunk = JSON.parse(line);
            } catch {
              continue;
            }

            if (chunk.message?.tool_calls?.length) {
              pendingToolCalls.push(...chunk.message.tool_calls);
            }

            if (chunk.message?.thinking) {
              accThinking += chunk.message.thinking;
            }

            if (chunk.message?.content) {
              const delta = chunk.message.content;
              const combined = accContent + delta;
              const parsed = parseThinking(combined);
              if (parsed.thinking) {
                accThinking = parsed.thinking;
                accContent = parsed.text;
              } else {
                accContent = combined;
              }
              onToken(accContent, accThinking);
            }

            if (chunk.done) {
              if (pendingToolCalls.length > 0) {
                continueLoop = true;
                const toolResultMessages: ChatMessage[] = [];

                for (const tc of pendingToolCalls) {
                  const toolCall: ChatToolCall = {
                    id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    name: tc.function.name,
                    args: tc.function.arguments,
                    status: "running",
                  };
                  await onToolCall(toolCall);

                  try {
                    const result = await callMcpTool(
                      tc.function.name,
                      tc.function.arguments,
                    );
                    toolCall.result = result;
                    toolCall.status = "success";
                    await onToolCall(toolCall);
                  } catch (err) {
                    toolCall.error =
                      err instanceof Error ? err.message : String(err);
                    toolCall.status = "error";
                    await onToolCall(toolCall);
                  }

                  toolResultMessages.push({
                    id: toolCall.id,
                    role: "tool",
                    content: "",
                    toolCalls: [toolCall],
                    createdAt: new Date().toISOString(),
                  });
                }

                loopMessages = [
                  ...loopMessages,
                  {
                    id: `asst-${Date.now()}`,
                    role: "assistant" as const,
                    content: accContent,
                    thinking: accThinking || undefined,
                    createdAt: new Date().toISOString(),
                  },
                  ...toolResultMessages,
                ];

                accContent = "";
                accThinking = "";
                pendingToolCalls = [];
              } else {
                continueLoop = false;
                onDone(accContent, accThinking);
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      isGenerating.value = false;
      abortController.value = null;
    }
  }

  return { isGenerating, generate, stop };
}
