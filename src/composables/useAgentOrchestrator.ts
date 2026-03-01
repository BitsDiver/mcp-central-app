/**
 * useAgentOrchestrator — executes an approved AgentPlan.
 *
 * Parallel groups are run with Promise.all; groups themselves are sequential.
 * Each task gets an isolated useChat() instance (its own AbortController /
 * isGenerating ref) so multiple tasks can stream simultaneously.
 *
 * Status updates are written back via useAgentPlanningStore so the PlanBlock
 * UI reflects live progress.
 */
import { ref } from "vue";
import { useChat } from "@/composables/useChat";
import { useChatSettingsStore } from "@/stores/chatSettings";
import { useToolStore } from "@/stores/tools";
import { useAgentPlanningStore } from "@/stores/agentPlanning";
import type { AgentPlan, AgentTask, ChatMessage, ChatToolCall } from "@/types";

function genId() {
  return crypto.randomUUID();
}

export interface OrchestrationResult {
  /** Flat list of completed task results (in execution order) */
  taskResults: Array<{ task: AgentTask; content: string }>;
  /** Final synthesized summary across all task results */
  summary: string;
  error: string | null;
}

export function useAgentOrchestrator() {
  const isOrchestrating = ref(false);
  const settingsStore = useChatSettingsStore();
  const toolStore = useToolStore();
  const planningStore = useAgentPlanningStore();

  /** Abort controller for the entire orchestration */
  let _abortController: AbortController | null = null;

  function stop() {
    _abortController?.abort();
    _abortController = null;
    isOrchestrating.value = false;
  }

  /**
   * Execute a single task by calling the LLM + tools.
   * Returns the final assistant text content.
   */
  async function _executeTask(
    plan: AgentPlan,
    task: AgentTask,
    contextMessages: ChatMessage[],
    abortSignal: AbortSignal,
  ): Promise<string> {
    const { settings } = settingsStore;

    // Mark task as running in the store
    planningStore.updateTask(plan.id, task.id, { status: "running" });

    // Synthetic message history for this task: context + task instruction
    const taskMessages: ChatMessage[] = [
      ...contextMessages,
      {
        id: genId(),
        role: "user",
        content: task.description,
        createdAt: new Date().toISOString(),
      },
    ];

    let accContent = "";
    let taskError: string | null = null;

    await new Promise<void>((resolve) => {
      if (abortSignal.aborted) {
        taskError = "Cancelled";
        resolve();
        return;
      }

      const chat = useChat();

      chat.generate({
        ollamaUrl: settings.ollamaUrl,
        ollamaApiKey: settings.ollamaApiKey,
        model: settings.selectedModel,
        contextSize: settings.contextSize,
        systemPrompt: task.systemPrompt ?? settings.systemPrompt,
        messages: taskMessages,
        tools: toolStore.tools,
        maxIterations: settings.maxIterations,
        onToken: (text) => {
          accContent += text;
          // Live update of the result snippet in the store (last 200 chars)
          planningStore.updateTask(plan.id, task.id, {
            result: accContent,
          });
        },
        onToolCall: async (toolCall: ChatToolCall) => {
          // Track tool calls so they're visible in the AgentBlock
          const currentTask = _getTask(plan.id, task.id);
          const existing = currentTask?.toolCalls ?? [];
          planningStore.updateTask(plan.id, task.id, {
            toolCalls: [...existing, toolCall],
          });
        },
        onDone: () => {
          resolve();
        },
        onError: (err) => {
          taskError = err;
          resolve();
        },
        onUsage: () => {},
      });
    });

    if (taskError) {
      planningStore.updateTask(plan.id, task.id, {
        status: "error",
        error: taskError,
      });
      throw new Error(taskError);
    }

    planningStore.updateTask(plan.id, task.id, {
      status: "success",
      result: accContent,
    });

    return accContent;
  }

  /** Helper to read back a task from the planning store. */
  function _getTask(planId: string, taskId: string): AgentTask | undefined {
    const plan = planningStore.pendingPlan;
    if (!plan || plan.id !== planId) return undefined;
    for (const group of plan.parallelGroups) {
      const t = group.find((t) => t.id === taskId);
      if (t) return t;
    }
    return undefined;
  }

  /**
   * Execute all groups of an approved plan sequentially (groups) / in
   * parallel (tasks within a group).
   *
   * @param plan            The approved AgentPlan.
   * @param contextMessages Prior chat messages passed as context to every task.
   * @returns               OrchestrationResult with task results + summary.
   */
  async function execute(
    plan: AgentPlan,
    contextMessages: ChatMessage[],
  ): Promise<OrchestrationResult> {
    isOrchestrating.value = true;
    _abortController = new AbortController();
    const { signal } = _abortController;

    planningStore.markRunning(plan.id);

    const allResults: Array<{ task: AgentTask; content: string }> = [];

    try {
      for (const group of plan.parallelGroups) {
        if (signal.aborted) break;

        // Run all tasks in this group in parallel
        const groupResults = await Promise.allSettled(
          group.map((task) =>
            _executeTask(plan, task, contextMessages, signal).then(
              (content) => ({ task, content }),
            ),
          ),
        );

        for (const result of groupResults) {
          if (result.status === "fulfilled") {
            allResults.push(result.value);
          }
          // Rejected tasks are already reflected in the store (status: 'error')
        }
      }

      planningStore.markCompleted(plan.id);

      // Build a simple summary listing each task result
      const summary = allResults
        .map((r) => `**${r.task.name}**\n${r.content}`)
        .join("\n\n---\n\n");

      return { taskResults: allResults, summary, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { taskResults: allResults, summary: "", error: message };
    } finally {
      isOrchestrating.value = false;
      _abortController = null;
    }
  }

  return { isOrchestrating, execute, stop };
}
