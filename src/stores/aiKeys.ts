import { defineStore } from "pinia";
import { ref } from "vue";
import type { LLMProvider, ProviderKeyInfo } from "@/types";
import { emitChat } from "@/api/socket";

/**
 * aiKeys store — manages the user's stored LLM API keys.
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

  /** Fetch the list of configured providers from the backend */
  async function loadProviders(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await emitChat<{ providers: ProviderKeyInfo[] }>(
        "listProviderKeys",
        {},
      );
      if (res.status === "success" && res.data) {
        providers.value = res.data.providers;
      } else {
        error.value = res.message ?? "Failed to load providers";
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
      const res = await emitChat<{ provider: LLMProvider; keyHint: string }>(
        "saveProviderKey",
        { provider, apiKey },
      );
      if (res.status === "success" && res.data) {
        // Update local state
        const existing = providers.value.find((p) => p.provider === provider);
        const now = new Date().toISOString();
        if (existing) {
          existing.keyHint = res.data.keyHint;
          existing.updatedAt = now;
        } else {
          providers.value.push({
            provider,
            keyHint: res.data.keyHint,
            createdAt: now,
            updatedAt: now,
          });
        }
        return res.data.keyHint;
      } else {
        error.value = res.message ?? "Failed to save key";
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
      const res = await emitChat<{ deleted: boolean }>("deleteProviderKey", {
        provider,
      });
      if (res.status === "success" && res.data?.deleted) {
        providers.value = providers.value.filter(
          (p) => p.provider !== provider,
        );
        return true;
      }
      error.value = res.message ?? "Failed to delete key";
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
