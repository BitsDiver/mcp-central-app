import { ref, watch } from "vue";
import { useTenantStore } from "@/stores/tenant";
import { useAuthStore } from "@/stores/auth";
import {
  getChatKey,
  clearChatKey,
  storeChatKey,
} from "@/composables/useChatMcpKey";
import { initMcpSession, resetMcpSession } from "@/api/mcpClient";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * useChatMcpSession — manages the MCP chat-key lifecycle.
 *
 * Transparently provisions an MCP API key for the active tenant and
 * initialises the MCP session. Re-runs whenever the tenant changes.
 */
export function useChatMcpSession() {
  const tenantStore = useTenantStore();

  /** True once a valid MCP session has been initialised for the active tenant */
  const chatKeyReady = ref(false);

  async function provisionChatKey(tenantId: string): Promise<void> {
    // 1. Try locally-cached key first
    const stored = getChatKey(tenantId);
    if (stored) {
      try {
        await initMcpSession(stored.key);
        chatKeyReady.value = true;
        return;
      } catch {
        clearChatKey(tenantId);
      }
    }

    // 2. Ask the backend for a fresh chat key via HTTP (getOrCreate)
    try {
      const token = useAuthStore().token;
      const res = await fetch(
        `${BASE_URL}/api/ai-keys/mcp-session?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status !== "success" || !json.data) return;
      storeChatKey(tenantId, json.data.id, json.data.key);
      await initMcpSession(json.data.key);
      chatKeyReady.value = true;
    } catch (e) {
      console.warn("[MCP session] provisioning failed:", e);
    }
  }

  // Re-init MCP session whenever the active tenant changes
  watch(
    () => tenantStore.selectedTenant?.id,
    async (tenantId) => {
      resetMcpSession();
      chatKeyReady.value = false;
      if (!tenantId) return;
      await provisionChatKey(tenantId);
    },
    { immediate: true },
  );

  return { chatKeyReady };
}
