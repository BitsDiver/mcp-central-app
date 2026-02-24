import { defineStore } from "pinia";
import { ref } from "vue";
import type { Endpoint } from "@/types";
import { emitEndpoints } from "@/api/socket";
import { useToastStore } from "./toast";

export const useEndpointStore = defineStore("endpoints", () => {
  const endpoints = ref<Endpoint[]>([]);
  const isLoading = ref(false);

  async function load(): Promise<void> {
    isLoading.value = true;
    try {
      const res = await emitEndpoints<{ endpoints: Endpoint[]; count: number }>(
        "listEndpoints",
        {},
      );
      if (res.status === "error") throw new Error(res.message ?? res.code);
      endpoints.value = res.data!.endpoints;
    } finally {
      isLoading.value = false;
    }
  }

  async function create(payload: Record<string, unknown>): Promise<Endpoint> {
    const res = await emitEndpoints<{ endpoint: Endpoint }>(
      "createEndpoint",
      payload,
    );
    if (res.status === "error") throw new Error(res.message ?? res.code);
    const endpoint = res.data!.endpoint;
    endpoints.value.push(endpoint);
    const toast = useToastStore();
    toast.success("Endpoint added successfully.");
    return endpoint;
  }

  async function remove(id: string): Promise<void> {
    const res = await emitEndpoints("deleteEndpoint", { endpointId: id });
    if (res.status === "error") throw new Error(res.message ?? res.code);
    endpoints.value = endpoints.value.filter((e) => e.id !== id);
    const toast = useToastStore();
    toast.success("Endpoint removed.");
  }

  async function update(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<Endpoint> {
    const res = await emitEndpoints<{ endpoint: Endpoint }>("updateEndpoint", {
      endpointId: id,
      ...payload,
    });
    if (res.status === "error") throw new Error(res.message ?? res.code);
    const updated = res.data!.endpoint;
    const idx = endpoints.value.findIndex((e) => e.id === id);
    if (idx !== -1) endpoints.value[idx] = updated;
    const toast = useToastStore();
    toast.success("Endpoint updated successfully.");
    return updated;
  }

  async function toggle(id: string, isEnabled: boolean): Promise<void> {
    const res = await emitEndpoints("toggleEndpoint", {
      endpointId: id,
      isEnabled,
    });
    if (res.status === "error") throw new Error(res.message ?? res.code);
    const ep = endpoints.value.find((e) => e.id === id);
    if (ep) ep.isEnabled = isEnabled;
  }
  /**
   * Refresh a specific endpoint on demand:
   * - reconnects immediately if disconnected / in error state
   * - re-discovers tools if already connected
   */
  async function refresh(id: string): Promise<void> {
    const res = await emitEndpoints("refreshEndpoint", { endpointId: id });
    if (res.status === "error") throw new Error(res.message ?? res.code);
  }
  function updateFromSocket(
    endpointId: string,
    patch: Partial<Endpoint>,
  ): void {
    const ep = endpoints.value.find((e) => e.id === endpointId);
    if (ep) Object.assign(ep, patch);
  }

  function clear(): void {
    endpoints.value = [];
  }

  return {
    endpoints,
    isLoading,
    load,
    create,
    update,
    remove,
    toggle,
    refresh,
    updateFromSocket,
    clear,
  };
});
