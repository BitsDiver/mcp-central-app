<script setup lang="ts">
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';
  import { useAuthStore } from '@/stores/auth';

  const route = useRoute();
  const authStore = useAuthStore();

  const navItems = computed(() => [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
      to: '/endpoints',
      label: 'Endpoints',
      // Server rack (two rows)
      icon: 'M5 3a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zM3 13a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4zM8 7h.01M8 17h.01M12 7h2M12 17h2',
    },
    {
      to: '/tools',
      label: 'Tools',
      // Wrench
      icon: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
    },
    {
      to: '/registry',
      label: 'Registry',
      // Open book
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    },
    {
      to: '/chat',
      label: 'Chat',
      // CPU/chip — AI tool feel
      icon: 'M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3V1m6 2h2a2 2 0 012 2v2m0 0h2m-2 0v6m2 0h-2m0 0v2a2 2 0 01-2 2h-2m0 0H9m6 0v2m-6-2H7a2 2 0 01-2-2v-2M5 11H3m2 0V9M3 13h2m13-2h2m-2 2h2M9 21h6m-6 0v-2m6 2v-2M9 9h6v6H9V9z',
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    },
  ]);

  function isActive(path: string): boolean {
    return route.path === path || (path !== '/' && route.path.startsWith(path));
  }
</script>

<template>
  <aside class="flex flex-col h-full w-60 shrink-0 border-r overflow-y-auto"
    style="background: var(--bg-sidebar); border-color: var(--border-default);">
    <div class="flex items-center gap-3 px-5 py-5 border-b" style="border-color: var(--border-default);">
      <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <span class="text-sm font-semibold" style="color: var(--text-primary);">MCP Central</span>
    </div>

    <nav class="flex-1 px-3 py-4 flex flex-col gap-1">
      <router-link v-for="item in navItems" :key="item.to" :to="item.to"
        :class="['sidebar-link', { active: isActive(item.to) }]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
          class="shrink-0">
          <path :d="item.icon" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="px-3 pb-4">
      <div class="px-3 py-3 rounded-lg" style="background: var(--bg-muted);">
        <p class="text-xs font-medium truncate" style="color: var(--text-primary);">{{ authStore.user?.name }}</p>
        <p class="text-xs truncate" style="color: var(--text-tertiary);">{{ authStore.user?.email }}</p>
      </div>
    </div>
  </aside>
</template>
