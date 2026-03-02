/**
 * usePlanning — generates a decomposed execution plan from a user request.
 *
 * Works with every provider (Ollama / OpenAI / Anthropic / Gemini / GitHub)
 * by re-using the existing useChat() stream layer.  The planning system
 * prompt instructs the model to return a markdown document which streams live
 * and is parsed into an AgentPlan once complete.
 *
 * Markdown format:
 *   # Title of the plan
 *   ## Task name
 *   Detailed self-contained description…
 *   ## Another task
 *   …
 *
 * Each ## section becomes one sequential AgentTask group.
 */
import { ref } from "vue";
import { useChat } from "@/composables/useChat";
import { useChatSettingsStore } from "@/stores/chatSettings";
import type { AgentPlan, AgentTask, ChatMessage } from "@/types";

function genId() {
  return crypto.randomUUID();
}

// ── Planning system prompt ─────────────────────────────────────────────────

const PLANNING_SYSTEM_PROMPT = `You are a planning assistant. You will decompose the user's request into a precise execution plan that **you yourself** will carry out.

Respond with a markdown document using this exact structure:

# <short, action-oriented title describing what you will accomplish>

## <Task name as a first-person noun phrase>
<Detailed, self-contained instructions written in first person>

## <Another task name as a first-person noun phrase>
<Detailed, self-contained instructions written in first person>

Rules:
- Each ## heading introduces exactly one task.
- **Task names (## headings) MUST be first-person noun phrases** describing the action you are performing — for example "Lecture du fichier de configuration", "Identification des fonctions concernées", "Refactoring of the validation logic". NEVER use imperative verbs addressed to the user (wrong: "Read the file", "Identify the functions").
- The text under each heading is written in first person ("I will examine…", "I am going to refactor…"). It is a complete, self-contained instruction for the isolated sub-agent that will perform this step.
- Tasks are executed sequentially in the order they appear.
- Aim for 2–6 tasks; use a single ## section for simple single-step requests.
- Task descriptions may use markdown formatting (bold, lists, inline code) for clarity.
- Do not add any text before the # title or after the last task description.
- Do not use code fences, JSON, or any other format outside the # / ## structure.

Examples of GOOD ## headings:
  ## Analysis of the current routing structure
  ## Extraction of shared utility functions
  ## Implementation of the new validation middleware
  ## Verification of the test suite

Examples of BAD ## headings (never do this):
  ## Analyze the routing structure
  ## Extract utility functions
  ## Implement the middleware
  ## Run the tests`;

// ── Markdown parser ───────────────────────────────────────────────────────

/**
 * Parse the markdown plan produced by the LLM into an AgentPlan.
 * # heading → plan title; ## headings → sequential tasks.
 *
 * @param streaming  When true, uses deterministic IDs ("streaming-task-N") instead
 *                   of random UUIDs so Vue's v-for keying stays stable across
 *                   every incremental token update during live generation.
 */
export function parseMarkdownPlan(
  markdown: string,
  streaming = false,
): AgentPlan | null {
  const lines = markdown.split("\n");

  // First # heading (not ##) is the plan title
  const titleLine = lines.find((l) => /^#(?!#)/.test(l));
  const title = titleLine?.replace(/^#+\s*/, "").trim() ?? "Execution plan";

  // ## headings (not ###) each start a task block
  const taskBlocks: Array<{ name: string; description: string }> = [];
  let currentName: string | null = null;
  let currentDesc: string[] = [];

  for (const line of lines) {
    if (/^##(?!#)/.test(line)) {
      if (currentName !== null) {
        taskBlocks.push({
          name: currentName,
          description: currentDesc.join("\n").trim(),
        });
      }
      currentName = line.replace(/^#+\s*/, "").trim();
      currentDesc = [];
    } else if (!/^#/.test(line) && currentName !== null) {
      currentDesc.push(line);
    }
  }
  if (currentName !== null) {
    taskBlocks.push({
      name: currentName,
      description: currentDesc.join("\n").trim(),
    });
  }

  if (taskBlocks.length === 0) return null;

  // Each task in its own sequential group
  const parallelGroups: AgentTask[][] = taskBlocks.map((t, i) => [
    {
      id: streaming ? `streaming-task-${i}` : genId(),
      name: t.name,
      description: t.description || t.name,
      status: "pending" as const,
    },
  ]);

  return {
    id: streaming ? "streaming-plan" : genId(),
    title,
    parallelGroups,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

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
    baseSystemPrompt?: string,
    onStreamToken?: (partial: string, thinking: string) => void,
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

    let rawMarkdown = "";
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
        systemPrompt: [baseSystemPrompt, PLANNING_SYSTEM_PROMPT]
          .filter(Boolean)
          .join("\n\n"),
        messages: planningHistory,
        tools: [], // No tool calls during planning — pure text response
        maxIterations: 1, // Planning is a single generation, no tool loops
        onToken: (text, thinking) => {
          // text is cumulative (full content so far) — assign, don't append
          rawMarkdown = text;
          onStreamToken?.(text, thinking);
        },
        onToolCall: async () => {
          // Should not happen (no tools provided), but guard anyway
        },
        onDone: (finalContent) => {
          rawMarkdown = finalContent;
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

    // Parse the streamed markdown into an AgentPlan
    const plan = parseMarkdownPlan(rawMarkdown);
    if (!plan) {
      return {
        plan: null,
        error: `Could not extract any tasks from the plan.\n\nRaw:\n${rawMarkdown.slice(0, 500)}`,
      };
    }

    return { plan, error: null };
  }

  return { isPlanning, generatePlan };
}
