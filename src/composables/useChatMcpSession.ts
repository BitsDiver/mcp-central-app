import { ref, watch } from "vue";
import { useTenantStore } from "@/stores/tenant";
import {
  getChatKey,
  clearChatKey,
  storeChatKey,
} from "@/composables/useChatMcpKey";
import { initMcpSession, resetMcpSession } from "@/api/mcpClient";
import { emitChat } from "@/api/socket";

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

    // 2. Ask the backend for a fresh chat key (getOrCreate)
    try {
      const res = await emitChat<{ id: string; key: string }>(
        "getChatMcpKey",
        {},
      );
      if (res.status !== "success" || !res.data) return;
      storeChatKey(tenantId, res.data.id, res.data.key);
      await initMcpSession(res.data.key);
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
