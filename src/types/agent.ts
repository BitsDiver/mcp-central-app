/**
 * Multi-agent types for the Ask / Plan / Agent chat modes.
 */

// ── Chat mode ──────────────────────────────────────────────────────────────

/** The three operating modes for the send button. */
export type ChatMode = "ask" | "plan" | "agent";

// ── Agent task (one unit of work inside a plan) ───────────────────────────

export type AgentTaskStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "skipped";

export interface AgentTask {
  id: string;
  /** Short display label shown in the plan UI */
  name: string;
  /** Longer description / instructions passed to the sub-agent */
  description: string;
  /** Optional override system prompt for this specific sub-agent */
  systemPrompt?: string;
  status: AgentTaskStatus;
  /** Plain-text summary returned by the sub-agent */
  result?: string;
  /** Tool calls made during this task */
  toolCalls?: import("./index").ChatToolCall[];
  /** Error message when status === 'error' */
  error?: string;
}

// ── Agent plan (the decomposed multi-step plan) ───────────────────────────

export type AgentPlanStatus =
  | "pending" // generated, waiting for user approval
  | "approved" // user approved, execution not yet started
  | "running" // currently executing
  | "completed" // all tasks done
  | "rejected"; // user rejected

export interface AgentPlan {
  id: string;
  /** Optional high-level title inferred from the user request */
  title: string;
  /**
   * Execution graph expressed as an ordered list of groups.
   * Tasks within the same group run in parallel (Promise.all).
   * Groups are executed sequentially in array order.
   */
  parallelGroups: AgentTask[][];
  status: AgentPlanStatus;
  createdAt: string;
}
