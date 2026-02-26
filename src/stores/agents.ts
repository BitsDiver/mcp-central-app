import { defineStore } from "pinia";
import { ref } from "vue";
import type { AgentWithStatus, AgentCreateResponse } from "@/types";
import { emitAgent, getSocket } from "@/api/socket";
import { useToastStore } from "./toast";

export const useAgentStore = defineStore("agents", () => {
  const agents = ref<AgentWithStatus[]>([]);
  const isLoading = ref(false);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async function load(): Promise<void> {
    isLoading.value = true;
    try {
      const res = await emitAgent<{ agents: AgentWithStatus[] }>(
        "listAgents",
        {},
      );
      if (res.status === "error") throw new Error(res.message ?? res.code);
      agents.value = res.data!.agents;
    } finally {
      isLoading.value = false;
    }
  }

  async function create(
    name: string,
    ipWhitelist: string[] = [],
  ): Promise<AgentCreateResponse> {
    const res = await emitAgent<{ agent: AgentCreateResponse }>("createAgent", {
      name,
      ipWhitelist,
    });
    if (res.status === "error") throw new Error(res.message ?? res.code);
    const created = res.data!.agent;
    // Add a skeleton entry in the list (without the plain key)
    agents.value.push({
      id: created.id,
      tenantId: "",
      name: created.name,
      namespace: created.namespace,
      keyPrefix: created.keyPrefix,
      isActive: true,
      ipWhitelist,
      lastSeenAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isConnected: false,
    });
    return created;
  }

  async function remove(agentId: string): Promise<void> {
    // Collect the endpoint IDs for this agent BEFORE the server call so we
    // can clean up the local endpoint and status stores immediately after.
    const { useEndpointStore } = await import("./endpoints");
    const { useStatusStore } = await import("./status");
    const endpointStore = useEndpointStore();
    const statusStore = useStatusStore();
    const orphanIds = new Set(
      endpointStore.endpoints
        .filter((e) => e.agentId === agentId)
        .map((e) => e.id),
    );

    const res = await emitAgent("deleteAgent", { agentId });
    if (res.status === "error") throw new Error(res.message ?? res.code);

    // Remove agent from local list
    agents.value = agents.value.filter((a) => a.id !== agentId);

    // Remove deleted endpoints from local caches (backend already removed them)
    if (orphanIds.size > 0) {
      endpointStore.endpoints = endpointStore.endpoints.filter(
        (e) => !orphanIds.has(e.id),
      );
      statusStore.upstreams = statusStore.upstreams.filter(
        (u) => !orphanIds.has(u.endpointId),
      );
    }

    const toast = useToastStore();
    toast.success("Agent removed.");
  }

  async function updateWhitelist(
    agentId: string,
    ipWhitelist: string[],
  ): Promise<void> {
    const res = await emitAgent("updateWhitelist", { agentId, ipWhitelist });
    if (res.status === "error") throw new Error(res.message ?? res.code);
    const agent = agents.value.find((a) => a.id === agentId);
    if (agent) agent.ipWhitelist = ipWhitelist;
    const toast = useToastStore();
    toast.success("IP whitelist updated.");
  }

  async function updateAgent(
    agentId: string,
    name: string,
    ipWhitelist: string[],
  ): Promise<void> {
    const res = await emitAgent("updateAgent", { agentId, name, ipWhitelist });
    if (res.status === "error") throw new Error(res.message ?? res.code);
    const agent = agents.value.find((a) => a.id === agentId);
    if (agent) {
      agent.name = name;
      agent.ipWhitelist = ipWhitelist;
    }
    const toast = useToastStore();
    toast.success("Agent updated.");
  }

  async function regenerateKey(agentId: string): Promise<AgentCreateResponse> {
    const res = await emitAgent<{ agent: AgentCreateResponse }>(
      "regenerateKey",
      { agentId },
    );
    if (res.status === "error") throw new Error(res.message ?? res.code);
    const result = res.data!.agent;
    const agent = agents.value.find((a) => a.id === agentId);
    if (agent) {
      agent.keyPrefix = result.keyPrefix;
    }
    return result;
  }
  // ── Live event handlers ───────────────────────────────────────────────────

  function setupSocketListeners(): void {
    const socket = getSocket("agent");
    if (!socket) return;

    socket.on(
      "agent_connected",
      ({
        agentId,
        ip,
        version,
      }: {
        agentId: string;
        ip?: string;
        version?: string;
      }) => {
        const agent = agents.value.find((a) => a.id === agentId);
        if (agent) {
          agent.isConnected = true;
          agent.connectedIp = ip;
          agent.version = version;
          agent.lastSeenAt = new Date().toISOString();
        }
      },
    );

    socket.on("agent_disconnected", ({ agentId }: { agentId: string }) => {
      const agent = agents.value.find((a) => a.id === agentId);
      if (agent) {
        agent.isConnected = false;
        agent.connectedIp = undefined;
      }
    });
  }

  function clear(): void {
    agents.value = [];
  }

  return {
    agents,
    isLoading,
    load,
    create,
    remove,
    updateWhitelist,
    updateAgent,
    regenerateKey,
    setupSocketListeners,
    clear,
  };
});
