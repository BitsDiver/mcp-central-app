<script setup lang="ts">
  import { watch } from 'vue';
  import { useRouter } from 'vue-router';
  import { useAuth0 } from '@auth0/auth0-vue';
  import { useAuthStore } from '@/stores/auth';
  import { useTenantStore } from '@/stores/tenant';
  import { useSocketStore } from '@/stores/socket';
  import { useEndpointStore } from '@/stores/endpoints';
  import { useToolStore } from '@/stores/tools';
  import { useStatusStore } from '@/stores/status';
  import { useDarkMode } from '@/composables/useDarkMode';
  import { useToastStore } from '@/stores/toast';
  import { markSocketReady, resetSocketReady } from '@/api/socket';
  import { useUsersStore } from '@/stores/users';
  import { purgeAllChatKeys, revokeAllChatKeys } from '@/composables/useChatMcpKey';
  import { resetMcpSession } from '@/api/mcpClient';

  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const router = useRouter();
  const authStore = useAuthStore();
  const tenantStore = useTenantStore();
  const socketStore = useSocketStore();
  const endpointStore = useEndpointStore();
  const toolStore = useToolStore();
  const statusStore = useStatusStore();
  const toast = useToastStore();
  const usersStore = useUsersStore();

  useDarkMode();

  watch([isAuthenticated, isLoading], async ([authed, loading]) => {
    if (loading) return;

    if (authed) {
      try {
        // Purge any chat keys left from a previous login session.
        // If the Auth0 session expired, those keys may have been revoked on logout;
        // clearing localStorage ensures the chat safeguard is shown fresh.
        purgeAllChatKeys();

        const token = await getAccessTokenSilently();
        authStore.setToken(token);
        await authStore.loadProfile();
        await tenantStore.loadTenants();

        if (tenantStore.tenants.length > 0) {
          const first = tenantStore.resolveInitialTenant()!;

          // 1. Set the tenant locally (also persists choice to localStorage)
          tenantStore.setSelectedTenant(first);

          // 2. Connect socket and wait for the tenant session to be established
          //    on the server BEFORE making any socket calls that require a tenant.
          socketStore.connect(token);
          await socketStore.selectTenant(first.id);

          // Socket is connected and tenant is selected — unblock any emit() calls
          // that were queued while this init was running (e.g. views' onMounted hooks
          // on a page reload, which fire before App.vue completes).
          markSocketReady();

          // Connect admin-only users socket
          if (authStore.isAdmin) {
            usersStore.connect().catch(() => { /* non-critical */ });
          }

          // 3. Now load tenant-scoped data via socket
          await tenantStore.loadKeys();
          if (tenantStore.apiKeys.length > 0) {
            tenantStore.selectKey(tenantStore.apiKeys[0].id);
          }

          await Promise.all([
            endpointStore.load(),
            toolStore.load(),
            statusStore.load(),
          ]);
        }

        if (router.currentRoute.value.path === '/') {
          await router.push('/dashboard');
        }
      } catch (err) {
        // Release any waiting emit() calls so views don't hang until timeout.
        // They will fail with their own errors (e.g. "Socket not connected") rather
        // than silently waiting 15 seconds.
        markSocketReady();
        toast.error('Failed to initialize session. Please try again.');
      }
    } else {
      // Revoke all chat keys server-side (best-effort) while the socket is
      // still alive, then drop the MCP session and mark socket as not ready.
      await revokeAllChatKeys().catch(() => { });
      resetMcpSession();
      resetSocketReady();
      if (router.currentRoute.value.meta.requiresAuth) {
        await router.push('/');
      }
    }
  }, { immediate: true });
</script>

<template>
  <router-view />
</template>
