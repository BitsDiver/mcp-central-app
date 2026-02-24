import { emit } from "@/api/socket";

const KEY_PREFIX = "mcp_chat_key_";

export interface StoredChatKey {
  id: string;
  key: string;
}

// ── Local storage helpers ───────────────────────────────────────────────────

export function getChatKey(tenantId: string): StoredChatKey | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + tenantId);
    if (raw) return JSON.parse(raw) as StoredChatKey;
  } catch {}
  return null;
}

export function storeChatKey(tenantId: string, id: string, key: string): void {
  localStorage.setItem(KEY_PREFIX + tenantId, JSON.stringify({ id, key }));
}

export function clearChatKey(tenantId: string): void {
  localStorage.removeItem(KEY_PREFIX + tenantId);
}

/**
 * Clear every mcp_chat_key_* entry from localStorage.
 * Called on login to purge stale keys from a previous session.
 */
export function purgeAllChatKeys(): void {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(KEY_PREFIX)) toRemove.push(k);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}

// ── Server-side revocation ─────────────────────────────────────────────────

/**
 * Revoke the chat key for a single tenant.
 * localStorage is cleared immediately; server revocation is best-effort.
 */
export async function revokeChatKey(tenantId: string): Promise<void> {
  const stored = getChatKey(tenantId);
  clearChatKey(tenantId);
  if (!stored) return;
  try {
    await emit("revokeKey", { keyId: stored.id });
  } catch {
    // Key may already be gone — that's fine
  }
}

/**
 * Revoke ALL stored chat keys server-side then purge localStorage.
 * Called on logout so orphaned keys don't accumulate.
 * localStorage is wiped first; socket revocations are best-effort.
 */
export async function revokeAllChatKeys(): Promise<void> {
  const entries: StoredChatKey[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(KEY_PREFIX)) {
      try {
        entries.push(JSON.parse(localStorage.getItem(k)!));
      } catch {}
    }
  }

  // Wipe localStorage immediately (before socket ops that may fail)
  purgeAllChatKeys();

  // Best-effort server-side revocation (socket may be mid-disconnection)
  await Promise.allSettled(
    entries.map(({ id }) => emit("revokeKey", { keyId: id })),
  );
}
