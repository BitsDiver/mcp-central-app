import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { ConnectedMcpClient } from "@/types";
import { identifyClient, type IdentifiedClient } from "@/utils/identifyClient";
import { emitEndpoints } from "@/api/socket";

export interface EnrichedMcpClient extends ConnectedMcpClient {
  identified: IdentifiedClient;
}

export const useMcpClientsStore = defineStore("mcpClients", () => {
  const clients = ref<ConnectedMcpClient[]>([]);
  const isLoading = ref(false);

  /** Clients enriched with identification (display name, brand color). */
  const enrichedClients = computed<EnrichedMcpClient[]>(() =>
    clients.value.map((c) => ({
      ...c,
      identified: identifyClient(c.clientName, c.userAgent),
    })),
  );

  /**
   * De-duplicated client identities — collapses multiple sessions from the
   * same client type into one entry with a count.
   */
  const uniqueClients = computed(() => {
    const map = new Map<
      string,
      { identified: IdentifiedClient; count: number }
    >();
    for (const c of enrichedClients.value) {
      const key = c.identified.displayName;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { identified: c.identified, count: 1 });
      }
    }
    return [...map.values()];
  });

  const clientCount = computed(() => clients.value.length);

  async function load(): Promise<void> {
    isLoading.value = true;
    try {
      const res = await emitEndpoints<{ clients: ConnectedMcpClient[] }>(
        "listMcpClients",
        {},
      );
      if (res.status === "error") throw new Error(res.message ?? res.code);
      clients.value = res.data!.clients;
    } finally {
      isLoading.value = false;
    }
  }

  function addClient(client: ConnectedMcpClient): void {
    // Avoid duplicates (same sessionId)
    if (!clients.value.find((c) => c.sessionId === client.sessionId)) {
      clients.value.push(client);
    }
  }

  function removeClient(sessionId: string): void {
    clients.value = clients.value.filter((c) => c.sessionId !== sessionId);
  }

  function clear(): void {
    clients.value = [];
  }

  return {
    clients,
    enrichedClients,
    uniqueClients,
    clientCount,
    isLoading,
    load,
    addClient,
    removeClient,
    clear,
  };
});
