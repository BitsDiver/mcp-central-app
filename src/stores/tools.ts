import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { Tool } from "@/types";
import { emitTools } from "@/api/socket";

const DISABLED_KEY = "mcp-central:disabled-tools";

function loadDisabled(): Set<string> {
  try {
    const raw = localStorage.getItem(DISABLED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistDisabled(set: Set<string>): void {
  localStorage.setItem(DISABLED_KEY, JSON.stringify([...set]));
}

export const useToolStore = defineStore("tools", () => {
  const tools = ref<Tool[]>([]);
  const count = ref(0);
  const isLoading = ref(false);

  /** Tool names that the user has explicitly disabled. */
  const disabledTools = ref<Set<string>>(loadDisabled());

  /** Only the tools that are currently enabled. */
  const activeTools = computed(() =>
    tools.value.filter((t) => !disabledTools.value.has(t.name)),
  );

  const activeCount = computed(() => activeTools.value.length);

  // ── CRUD ────────────────────────────────────────────────

  async function load(): Promise<void> {
    isLoading.value = true;
    try {
      const res = await emitTools<{ tools: Tool[]; count: number }>(
        "getTools",
        {},
      );
      if (res.status === "error") throw new Error(res.message ?? res.code);
      tools.value = res.data!.tools;
      count.value = res.data!.count;
    } finally {
      isLoading.value = false;
    }
  }

  function updateFromSocket(updated: Tool[], newCount: number): void {
    tools.value = updated;
    count.value = newCount;
  }

  function clear(): void {
    tools.value = [];
    count.value = 0;
  }

  // ── Toggle helpers ──────────────────────────────────────

  function isToolEnabled(toolName: string): boolean {
    return !disabledTools.value.has(toolName);
  }

  function toggleTool(toolName: string): void {
    const next = new Set(disabledTools.value);
    if (next.has(toolName)) {
      next.delete(toolName);
    } else {
      next.add(toolName);
    }
    disabledTools.value = next;
    persistDisabled(next);
  }

  /**
   * Check if every tool belonging to `endpointId` is enabled.
   */
  function isEndpointFullyEnabled(endpointId: string): boolean {
    const epTools = tools.value.filter((t) => t.endpointId === endpointId);
    return epTools.length > 0 && epTools.every((t) => isToolEnabled(t.name));
  }

  /**
   * If all tools of the endpoint are active → disable them all.
   * Otherwise → enable them all.
   */
  function toggleEndpoint(endpointId: string): void {
    const epTools = tools.value.filter((t) => t.endpointId === endpointId);
    if (epTools.length === 0) return;
    const allEnabled = isEndpointFullyEnabled(endpointId);
    const next = new Set(disabledTools.value);
    for (const t of epTools) {
      if (allEnabled) {
        next.add(t.name);
      } else {
        next.delete(t.name);
      }
    }
    disabledTools.value = next;
    persistDisabled(next);
  }

  function getActiveCountForEndpoint(endpointId: string): number {
    return tools.value.filter(
      (t) => t.endpointId === endpointId && !t.isDisabled,
    ).length;
  }

  function getTotalCountForEndpoint(endpointId: string): number {
    return tools.value.filter((t) => t.endpointId === endpointId).length;
  }

  return {
    tools,
    count,
    isLoading,
    disabledTools,
    activeTools,
    activeCount,
    load,
    updateFromSocket,
    clear,
    isToolEnabled,
    toggleTool,
    isEndpointFullyEnabled,
    toggleEndpoint,
    getActiveCountForEndpoint,
    getTotalCountForEndpoint,
  };
});
