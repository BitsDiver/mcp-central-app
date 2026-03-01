/**
 * Pinia store for managing agent plan approval flow.
 *
 * The planning composable (usePlanning) generates a plan and then calls
 * `setPendingPlan()`. The PlanBlock component's Approve/Reject buttons
 * resolve the promise returned by `waitForApproval()`.
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import type { AgentPlan } from "@/types";

interface ApprovalCallbacks {
  resolve: (approved: boolean) => void;
}

export const useAgentPlanningStore = defineStore("agentPlanning", () => {
  /** The plan currently awaiting user interaction (null when none). */
  const pendingPlan = ref<AgentPlan | null>(null);

  /** Internal callbacks map: planId → approval resolver */
  const _callbacks = new Map<string, ApprovalCallbacks>();

  /**
   * Register a plan as pending and return a Promise that resolves to:
   * - `true` when the user clicks Approve
   * - `false` when the user clicks Reject (or the plan is replaced)
   */
  function waitForApproval(plan: AgentPlan): Promise<boolean> {
    // Cancel any existing pending plan
    if (pendingPlan.value) {
      _callbacks.get(pendingPlan.value.id)?.resolve(false);
      _callbacks.delete(pendingPlan.value.id);
    }
    pendingPlan.value = { ...plan, status: "pending" };
    return new Promise<boolean>((resolve) => {
      _callbacks.set(plan.id, { resolve });
    });
  }

  /** Called by the PlanBlock Approve button. */
  function approvePlan(planId: string): void {
    if (!pendingPlan.value || pendingPlan.value.id !== planId) return;
    pendingPlan.value = { ...pendingPlan.value, status: "approved" };
    _callbacks.get(planId)?.resolve(true);
    _callbacks.delete(planId);
  }

  /** Called by the PlanBlock Reject button. */
  function rejectPlan(planId: string): void {
    if (!pendingPlan.value || pendingPlan.value.id !== planId) return;
    pendingPlan.value = { ...pendingPlan.value, status: "rejected" };
    _callbacks.get(planId)?.resolve(false);
    _callbacks.delete(planId);
    pendingPlan.value = null;
  }

  /**
   * Update a task's status / result inside the pending (or running) plan.
   * Used by useAgentOrchestrator to reflect live execution progress.
   */
  function updateTask(
    planId: string,
    taskId: string,
    patch: Partial<import("@/types").AgentTask>,
  ): void {
    if (!pendingPlan.value || pendingPlan.value.id !== planId) return;
    const plan = pendingPlan.value;
    const groups = plan.parallelGroups.map((group) =>
      group.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    );
    pendingPlan.value = { ...plan, parallelGroups: groups };
  }

  /** Mark the plan as running (execution has started). */
  function markRunning(planId: string): void {
    if (pendingPlan.value?.id === planId) {
      pendingPlan.value = { ...pendingPlan.value, status: "running" };
    }
  }

  /** Mark the plan as completed. */
  function markCompleted(planId: string): void {
    if (pendingPlan.value?.id === planId) {
      pendingPlan.value = { ...pendingPlan.value, status: "completed" };
    }
  }

  /** Allow the user to edit a task before approval (name + description). */
  function editTask(
    planId: string,
    taskId: string,
    name: string,
    description: string,
  ): void {
    updateTask(planId, taskId, { name, description });
  }

  /** Edit the plan title before approval. */
  function editTitle(planId: string, title: string): void {
    if (!pendingPlan.value || pendingPlan.value.id !== planId) return;
    pendingPlan.value = { ...pendingPlan.value, title };
  }

  /**
   * Add a new blank task as a single-task group.
   * @param afterGroupIndex  Insert after this group index (defaults to end).
   * @returns The new task's ID.
   */
  function addTask(planId: string, afterGroupIndex?: number): string {
    if (!pendingPlan.value || pendingPlan.value.id !== planId) return "";
    const id = crypto.randomUUID();
    const newTask: import("@/types").AgentTask = {
      id,
      name: "New task",
      description: "",
      status: "pending",
    };
    const groups = [...pendingPlan.value.parallelGroups];
    const insertAt =
      afterGroupIndex !== undefined
        ? Math.min(afterGroupIndex + 1, groups.length)
        : groups.length;
    groups.splice(insertAt, 0, [newTask]);
    pendingPlan.value = { ...pendingPlan.value, parallelGroups: groups };
    return id;
  }

  /** Remove a task. If its group becomes empty, remove the group too. */
  function removeTask(planId: string, taskId: string): void {
    if (!pendingPlan.value || pendingPlan.value.id !== planId) return;
    const groups = pendingPlan.value.parallelGroups
      .map((group) => group.filter((t) => t.id !== taskId))
      .filter((group) => group.length > 0);
    pendingPlan.value = { ...pendingPlan.value, parallelGroups: groups };
  }

  /**
   * Swap a group with its neighbour.
   * @param direction  'up' swaps with previous group, 'down' with next.
   */
  function moveGroup(
    planId: string,
    groupIndex: number,
    direction: "up" | "down",
  ): void {
    if (!pendingPlan.value || pendingPlan.value.id !== planId) return;
    const groups = [...pendingPlan.value.parallelGroups];
    const target = direction === "up" ? groupIndex - 1 : groupIndex + 1;
    if (target < 0 || target >= groups.length) return;
    [groups[groupIndex], groups[target]] = [groups[target], groups[groupIndex]];
    pendingPlan.value = { ...pendingPlan.value, parallelGroups: groups };
  }

  return {
    pendingPlan,
    waitForApproval,
    approvePlan,
    rejectPlan,
    updateTask,
    markRunning,
    markCompleted,
    editTask,
    editTitle,
    addTask,
    removeTask,
    moveGroup,
  };
});
