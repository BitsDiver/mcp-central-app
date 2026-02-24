import { defineStore } from "pinia";
import { ref } from "vue";
import type { Tool } from "@/types";
import { emitTools } from "@/api/socket";

export const useToolStore = defineStore("tools", () => {
  const tools = ref<Tool[]>([]);
  const count = ref(0);
  const isLoading = ref(false);

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

  return { tools, count, isLoading, load, updateFromSocket, clear };
});
