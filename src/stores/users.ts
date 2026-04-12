import { defineStore } from "pinia";
import { ref } from "vue";
import { connectUsers, disconnectUsers, emitUsers } from "@/api/socket";
import { useAuthStore } from "@/stores/auth";

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export const useUsersStore = defineStore("users", () => {
  const users = ref<AdminUser[]>([]);
  const isLoading = ref(false);
  const isConnected = ref(false);
  const error = ref<string | null>(null);

  // ── Connection ─────────────────────────────────────────────

  async function connect(): Promise<void> {
    const authStore = useAuthStore();
    if (!authStore.isAdmin) return;

    const t = authStore.token;
    if (!t) return;

    const socket = connectUsers(t);

    await new Promise<void>((resolve, reject) => {
      if (socket.connected) {
        isConnected.value = true;
        resolve();
        return;
      }
      socket.once("connect", () => {
        isConnected.value = true;
        resolve();
      });
      socket.once("connect_error", (err) => reject(err));
    });
  }

  function disconnect(): void {
    disconnectUsers();
    isConnected.value = false;
    users.value = [];
  }

  // ── Events ─────────────────────────────────────────────────

  async function listUsers(search?: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await emitUsers<{ users: AdminUser[] }>(
        "listUsers",
        search ? { search } : {},
      );
      if (res.status === "error") throw new Error(res.message ?? res.code);
      users.value = res.data!.users;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  }

  function clear(): void {
    users.value = [];
    error.value = null;
    isConnected.value = false;
  }

  return {
    users,
    isLoading,
    isConnected,
    error,
    connect,
    disconnect,
    listUsers,
    clear,
  };
});
