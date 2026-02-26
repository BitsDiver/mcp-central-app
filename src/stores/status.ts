import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { UpstreamStatus } from "@/types";
import { emitEndpoints } from "@/api/socket";

export const useStatusStore = defineStore("status", () => {
  const upstreams = ref<UpstreamStatus[]>([]);
  const isLoading = ref(false);

  const totalTools = computed(() =>
    upstreams.value.reduce((sum, u) => sum + u.toolCount, 0),
  );

  const connectedCount = computed(
    () => upstreams.value.filter((u) => u.status === "connected").length,
  );

  async function load(): Promise<void> {
    isLoading.value = true;
    try {
      const res = await emitEndpoints<{
        upstreams: UpstreamStatus[];
        totalTools: number;
      }>("getStatus", {});
      if (res.status === "error") throw new Error(res.message ?? res.code);
      upstreams.value = res.data!.upstreams;
    } finally {
      isLoading.value = false;
    }
  }

  function updateUpstream(
    update: Partial<UpstreamStatus> & { endpointId: string },
  ): void {
    const idx = upstreams.value.findIndex(
      (u) => u.endpointId === update.endpointId,
    );
    if (idx !== -1) {
      Object.assign(upstreams.value[idx], update);
    } else {
      upstreams.value.push(update as UpstreamStatus);
    }
  }

  function removeUpstream(endpointId: string): void {
    upstreams.value = upstreams.value.filter(
      (u) => u.endpointId !== endpointId,
    );
  }

  function clear(): void {
    upstreams.value = [];
  }

  return {
    upstreams,
    totalTools,
    connectedCount,
    isLoading,
    load,
    updateUpstream,
    removeUpstream,
    clear,
  };
});
