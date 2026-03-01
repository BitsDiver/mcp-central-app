/**
 * usePlanning — generates a decomposed execution plan from a user request.
 *
 * Works with every provider (Ollama / OpenAI / Anthropic / Gemini / GitHub)
 * by re-using the existing useChat() stream layer.  The planning system
 * prompt instructs the model to return a strict JSON structure which is then
 * parsed into an AgentPlan.
 */
import { ref } from "vue";
import { useChat } from "@/composables/useChat";
import { useChatSettingsStore } from "@/stores/chatSettings";
import type { AgentPlan, AgentTask, ChatMessage } from "@/types";

function genId() {
  return crypto.randomUUID();
}

// ── Planning system prompt ─────────────────────────────────────────────────

const PLANNING_SYSTEM_PROMPT = `You are a planning assistant. Given a user request, decompose it into a precise execution plan.

Respond ONLY with a valid JSON object (no markdown fences, no explanation) matching this schema:

{
  "title": "<short human-readable title of the overall task>",
  "parallelGroups": [
    [
      {
        "name": "<short task name>",
        "description": "<detailed instructions for the sub-agent handling this task>",
        "systemPrompt": "<optional override system prompt for this sub-agent, or omit>"
      }
    ]
  ]
}

Rules:
- Tasks in the SAME array element (group) can run IN PARALLEL — place them together only when they are truly independent.
- Groups are executed SEQUENTIALLY in array order — use different groups when later tasks depend on earlier ones.
- Each task description must be self-contained: it will be sent to a separate AI agent that only sees this description.
- Aim for 2–6 tasks total. Avoid over-decomposing simple requests.
- If the request can be handled in a single step, use one group with one task.`;

// ── Return type ────────────────────────────────────────────────────────────

export interface PlanningResult {
  plan: AgentPlan | null;
  error: string | null;
}

// ── Composable ─────────────────────────────────────────────────────────────

export function usePlanning() {
  const isPlanning = ref(false);
  const settingsStore = useChatSettingsStore();

  /**
   * Ask the LLM to decompose `userContent` into a parallel-group execution plan.
   * @param userContent  The raw user message text.
   * @param abortSignal  Optional signal to cancel mid-generation.
   */
  async function generatePlan(
    userContent: string,
    abortSignal?: AbortSignal,
  ): Promise<PlanningResult> {
    isPlanning.value = true;

    // Synthetic single-turn history for the planning call
    const planningHistory: ChatMessage[] = [
      {
        id: genId(),
        role: "user",
        content: userContent,
        createdAt: new Date().toISOString(),
      },
    ];

    const { settings } = settingsStore;

    let rawJson = "";
    let generationError: string | null = null;

    await new Promise<void>((resolve) => {
      if (abortSignal?.aborted) {
        generationError = "Cancelled";
        resolve();
        return;
      }

      const chat = useChat();

      chat.generate({
        ollamaUrl: settings.ollamaUrl,
        ollamaApiKey: settings.ollamaApiKey,
        model: settings.selectedModel,
        contextSize: settings.contextSize,
        systemPrompt: PLANNING_SYSTEM_PROMPT,
        messages: planningHistory,
        tools: [], // No tool calls during planning — pure text response
        maxIterations: 1, // Planning is a single generation, no tool loops
        onToken: (text) => {
          rawJson += text;
        },
        onToolCall: async () => {
          // Should not happen (no tools provided), but guard anyway
        },
        onDone: () => {
          resolve();
        },
        onError: (err) => {
          generationError = err;
          resolve();
        },
        onUsage: () => {},
      });
    });

    isPlanning.value = false;

    if (generationError) {
      return { plan: null, error: generationError };
    }

    // Parse the JSON
    try {
      // Strip potential markdown fences the model may add despite instructions
      const cleaned = rawJson
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();

      const parsed = JSON.parse(cleaned) as {
        title?: string;
        parallelGroups?: Array<
          Array<{
            name?: string;
            description?: string;
            systemPrompt?: string;
          }>
        >;
      };

      if (!Array.isArray(parsed.parallelGroups)) {
        return { plan: null, error: "Plan JSON missing parallelGroups array" };
      }

      const parallelGroups: AgentTask[][] = parsed.parallelGroups.map((group) =>
        group.map((t) => ({
          id: genId(),
          name: t.name ?? "Task",
          description: t.description ?? "",
          systemPrompt: t.systemPrompt,
          status: "pending" as const,
        })),
      );

      const plan: AgentPlan = {
        id: genId(),
        title: parsed.title ?? "Execution plan",
        parallelGroups,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      return { plan, error: null };
    } catch (err) {
      return {
        plan: null,
        error: `Failed to parse plan JSON: ${err instanceof Error ? err.message : String(err)}\n\nRaw: ${rawJson.slice(0, 500)}`,
      };
    }
  }

  return { isPlanning, generatePlan };
}
