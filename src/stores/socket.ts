import { defineStore } from "pinia";
import { ref } from "vue";
import type { Socket } from "socket.io-client";
import { connectAll, disconnectAll, getSocket } from "@/api/socket";
import { useToolStore } from "./tools";
import { useStatusStore } from "./status";
import { useEndpointStore } from "./endpoints";
import type { Tool, UpstreamStatus } from "@/types";

export const useSocketStore = defineStore("socket", () => {
  const connected = ref(false);
  const activeTenantId = ref<string | null>(null);

  function connect(token: string): void {
    const { tenants, endpoints, tools } = connectAll(token);
    bindEvents(tenants, endpoints, tools);
  }

  function bindEvents(tenants: Socket, endpoints: Socket, tools: Socket): void {
    // Track connection state on the tenants socket (primary)
    tenants.on("connect", () => {
      connected.value = true;
    });
    tenants.on("disconnect", () => {
      connected.value = false;
    });

    tools.on("tools_changed", (payload: { tools: Tool[]; count: number }) => {
      const toolStore = useToolStore();
      toolStore.updateFromSocket(payload.tools, payload.count);
    });

    endpoints.on(
      "connection_status",
      (payload: Partial<UpstreamStatus> & { endpointId: string }) => {
        const statusStore = useStatusStore();
        statusStore.updateUpstream(payload);
        const endpointStore = useEndpointStore();
        if (payload.endpointId) {
          endpointStore.updateFromSocket(payload.endpointId, {
            toolCount: payload.toolCount ?? 0,
            ...(payload.status ? { connectionStatus: payload.status } : {}),
            ...(payload.lastConnectedAt !== undefined
              ? { lastConnectedAt: payload.lastConnectedAt }
              : {}),
          });
        }
      },
    );
  }

  async function selectTenant(tenantId: string): Promise<void> {
    // selectTenant must be called on every namespace so each socket joins
    // the tenant room and subsequent broadcasts reach all of them.
    const namespaces = ["tenants", "endpoints", "tools", "keys"];
    await Promise.all(
      namespaces.map(
        (ns) =>
          new Promise<void>((resolve, reject) => {
            const socket = getSocket(ns);
            if (!socket) return resolve();
            socket.emit(
              "selectTenant",
              { tenantId },
              (res: { status: string }) => {
                if (res.status === "success") {
                  activeTenantId.value = tenantId;
                  resolve();
                } else {
                  reject(new Error(`Failed to select tenant on /${ns}`));
                }
              },
            );
          }),
      ),
    );
  }

  function disconnect(): void {
    disconnectAll();
    connected.value = false;
    activeTenantId.value = null;
  }

  return { connected, activeTenantId, connect, selectTenant, disconnect };
});
