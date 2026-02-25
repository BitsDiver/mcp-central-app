import { ref, computed, type Ref, type ComputedRef } from "vue";
import { registryApi } from "@/api/client";
import type { RegistryServer } from "@/data/mcpRegistry";

// ── Singleton state (shared across all component instances) ──────────────────
const servers: Ref<RegistryServer[]> = ref([]);
const categories: Ref<string[]> = ref([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
let fetched = false;

// ── Computed lookup maps ─────────────────────────────────────────────────────

/** Map namespace → RegistryServer for O(1) lookups from tool names. */
const namespaceMap: ComputedRef<Record<string, RegistryServer>> = computed(
  () => {
    const map: Record<string, RegistryServer> = {};
    for (const s of servers.value) map[s.namespace] = s;
    return map;
  },
);

// ── Fetch ────────────────────────────────────────────────────────────────────

async function load(): Promise<void> {
  if (fetched || isLoading.value) return;
  isLoading.value = true;
  error.value = null;
  try {
    const data = await registryApi.getServers();
    servers.value = data.servers;
    categories.value = data.categories;
    fetched = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    // Graceful degradation: keep empty arrays so UI doesn't crash
  } finally {
    isLoading.value = false;
  }
}

// ── Public composable ────────────────────────────────────────────────────────

export function useRegistry() {
  // Start fetch on first use (non-blocking)
  if (!fetched && !isLoading.value) load();

  return {
    servers,
    categories,
    namespaceMap,
    isLoading,
    error,
    /** Force a cache-busting refresh */
    refresh: () => {
      fetched = false;
      return load();
    },
  };
}
