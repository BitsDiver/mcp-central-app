import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Tenant, ApiKey, NewApiKey } from "@/types";
import { setupApi } from "@/api/client";
import { emit } from "@/api/socket";
import { useToastStore } from "./toast";

const STORAGE_KEY = "mcp_selected_tenant_id";

export const useTenantStore = defineStore("tenant", () => {
  const tenants = ref<Tenant[]>([]);
  const selectedTenant = ref<Tenant | null>(null);
  const apiKeys = ref<ApiKey[]>([]);
  const selectedKeyId = ref<string | null>(null);
  const isLoading = ref(false);

  const selectedKey = computed(
    () => apiKeys.value.find((k) => k.id === selectedKeyId.value) ?? null,
  );

  async function loadTenants(): Promise<void> {
    isLoading.value = true;
    try {
      const data = (await setupApi.getTenants()) as { tenants: Tenant[] };
      tenants.value = data.tenants;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Sets the active tenant locally and persists the choice to localStorage.
   * Does NOT load keys — call loadKeys() separately after the socket tenant
   * has been selected (socketStore.selectTenant).
   */
  function setSelectedTenant(tenant: Tenant): void {
    selectedTenant.value = tenant;
    localStorage.setItem(STORAGE_KEY, tenant.id);
  }

  /**
   * Picks the tenant to activate on login / page reload:
   * 1. The tenant that was last explicitly selected (saved in localStorage)
   * 2. The tenant named "Default"
   * 3. The first tenant in the list
   *
   * Must be called after `loadTenants()`.
   */
  function resolveInitialTenant(): Tenant | null {
    if (tenants.value.length === 0) return null;
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      const saved = tenants.value.find((t) => t.id === savedId);
      if (saved) return saved;
    }
    const defaultTenant = tenants.value.find((t) => t.name === "Default");
    return defaultTenant ?? tenants.value[0];
  }

  /**
   * Load API keys for the active tenant via Socket.IO.
   * Requires the socket to be connected and a tenant selected on the socket session.
   */
  async function loadKeys(): Promise<void> {
    const res = await emit<{ keys: ApiKey[]; count: number }>("listKeys", {});
    if (res.status === "error") throw new Error(res.message ?? res.code);
    apiKeys.value = res.data!.keys;
  }

  function selectKey(keyId: string): void {
    selectedKeyId.value = keyId;
  }

  async function createTenant(
    name: string,
  ): Promise<{ tenant: Tenant; apiKey: NewApiKey }> {
    // Tenant creation uses the Auth0-protected REST route (key is shown once to the user)
    const data = (await setupApi.createTenant(name)) as {
      tenant: Tenant;
      apiKey: NewApiKey;
    };
    tenants.value.push(data.tenant);
    const toast = useToastStore();
    toast.success("Tenant created successfully.");
    return data;
  }

  async function createKey(label: string): Promise<NewApiKey> {
    const res = await emit<NewApiKey>("createKey", { label });
    if (res.status === "error") throw new Error(res.message ?? res.code);
    const newKey = res.data as unknown as NewApiKey;
    await loadKeys();
    return newKey;
  }

  async function revokeKey(id: string): Promise<void> {
    const res = await emit("revokeKey", { keyId: id });
    if (res.status === "error") throw new Error(res.message ?? res.code);
    apiKeys.value = apiKeys.value.filter((k) => k.id !== id);
    if (selectedKeyId.value === id) {
      selectedKeyId.value = apiKeys.value[0]?.id ?? null;
    }
    const toast = useToastStore();
    toast.success("API key revoked.");
  }

  async function regenerateKey(id: string): Promise<NewApiKey> {
    const res = await emit<NewApiKey>("regenerateKey", { keyId: id });
    if (res.status === "error") throw new Error(res.message ?? res.code);
    const newKey = res.data as unknown as NewApiKey;
    await loadKeys();
    return newKey;
  }

  /**
   * Delete a tenant and all its data. Removes it from the local list.
   * If the deleted tenant was the active one, `selectedTenant` is set to
   * the first remaining tenant (or null). The caller must switch API sessions
   * appropriately after this call.
   */
  async function deleteTenant(tenantId: string): Promise<void> {
    const res = await emit("deleteTenant", { tenantId });
    if (res.status === "error") throw new Error(res.message ?? res.code);
    tenants.value = tenants.value.filter((t) => t.id !== tenantId);
    if (selectedTenant.value?.id === tenantId) {
      selectedTenant.value = tenants.value[0] ?? null;
      apiKeys.value = [];
      selectedKeyId.value = null;
      localStorage.removeItem(STORAGE_KEY);
    }
    const toast = useToastStore();
    toast.success("Tenant deleted.");
  }

  function clear(): void {
    tenants.value = [];
    selectedTenant.value = null;
    apiKeys.value = [];
    selectedKeyId.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    tenants,
    selectedTenant,
    apiKeys,
    selectedKeyId,
    selectedKey,
    isLoading,
    loadTenants,
    setSelectedTenant,
    loadKeys,
    selectKey,
    createTenant,
    createKey,
    revokeKey,
    regenerateKey,
    deleteTenant,
    resolveInitialTenant,
    clear,
  };
});
