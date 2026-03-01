import { defineStore } from "pinia";
import { ref } from "vue";
import type { LLMProvider, ProviderKeyInfo } from "@/types";
import { useAuthStore } from "@/stores/auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * aiKeys store — manages the user’s stored LLM API keys via HTTP.
 *
 * Keys are stored encrypted on the backend. The frontend only sees:
 *   - which providers have a key (boolean/hint)
 *   - the last 4 chars (keyHint) for display
 * The actual key is never returned after saving.
 */
export const useAiKeysStore = defineStore("aiKeys", () => {
  const providers = ref<ProviderKeyInfo[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function authHeaders(): Record<string, string> {
    const token = useAuthStore().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /** Fetch the list of configured providers from the backend */
  async function loadProviders(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${BASE_URL}/api/ai-keys`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === "success" && json.data) {
        providers.value = json.data.providers;
      } else {
        error.value = json.message ?? "Failed to load providers";
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Save (or replace) an API key for a provider.
   * Returns the keyHint on success.
   */
  async function saveKey(
    provider: LLMProvider,
    apiKey: string,
  ): Promise<string | null> {
    error.value = null;
    try {
      const res = await fetch(`${BASE_URL}/api/ai-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ provider, apiKey }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === "success" && json.data) {
        const existing = providers.value.find((p) => p.provider === provider);
        const now = new Date().toISOString();
        if (existing) {
          existing.keyHint = json.data.keyHint;
          existing.updatedAt = now;
        } else {
          providers.value.push({
            provider,
            keyHint: json.data.keyHint,
            createdAt: now,
            updatedAt: now,
          });
        }
        return json.data.keyHint;
      } else {
        error.value = json.message ?? "Failed to save key";
        return null;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      return null;
    }
  }

  /** Delete a provider key */
  async function deleteKey(provider: LLMProvider): Promise<boolean> {
    error.value = null;
    try {
      const res = await fetch(`${BASE_URL}/api/ai-keys/${provider}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === "success" && json.data?.deleted) {
        providers.value = providers.value.filter(
          (p) => p.provider !== provider,
        );
        return true;
      }
      error.value = json.message ?? "Failed to delete key";
      return false;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      return false;
    }
  }

  /** Returns the stored key info for a provider, or null if not configured */
  function getProviderInfo(provider: LLMProvider): ProviderKeyInfo | null {
    return providers.value.find((p) => p.provider === provider) ?? null;
  }

  /** Returns true if the user has a stored key for this provider */
  function hasKey(provider: LLMProvider): boolean {
    return providers.value.some((p) => p.provider === provider);
  }

  return {
    providers,
    isLoading,
    error,
    loadProviders,
    saveKey,
    deleteKey,
    getProviderInfo,
    hasKey,
  };
});
