<script setup lang="ts">
  import { onMounted, ref } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  import { handleCallback } from '@/auth/useAuth';

  const router = useRouter();
  const route = useRoute();

  const error = ref<string | null>(null);

  onMounted(async () => {
    const code = route.query.code as string | undefined;
    const state = route.query.state as string | undefined;
    const errorParam = route.query.error as string | undefined;
    const errorDescription = route.query.error_description as string | undefined;

    if (errorParam) {
      error.value = errorDescription ?? errorParam;
      return;
    }

    if (!code || !state) {
      error.value = 'Missing authorization code or state.';
      return;
    }

    try {
      const returnTo = await handleCallback(code, state);
      await router.replace(returnTo);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Authentication failed.';
    }
  });
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center" style="background: var(--bg-base);">
    <div v-if="error" class="text-center max-w-sm px-6">
      <p class="text-sm font-medium mb-4" style="color: var(--color-danger);">
        {{ error }}
      </p>
      <router-link to="/" class="text-sm text-blue-500 hover:underline">
        Back to login
      </router-link>
    </div>
    <div v-else class="flex flex-col items-center gap-4">
      <!-- Spinner -->
      <div class="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      <p class="text-sm" style="color: var(--text-secondary);">Completing sign in…</p>
    </div>
  </div>
</template>
