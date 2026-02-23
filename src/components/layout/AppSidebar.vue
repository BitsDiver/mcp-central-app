<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const navItems = computed(() => [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    to: '/endpoints',
    label: 'Endpoints',
    icon: 'M5 12h14M12 5l7 7-7 7',
  },
  {
    to: '/tools',
    label: 'Tools',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    to: '/registry',
    label: 'Registry',
    icon: 'M19 11H5m14 0l-4-4m4 4l-4 4M5 11l4-4M5 11l4 4',
  },
  {
    to: '/chat',
    label: 'Chat',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  },
  {
    to: '/keys',
    label: 'API Keys',
    icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  },
  {
    to: '/tenants',
    label: authStore.isAdmin ? 'Tenants' : 'My Tenants',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
])

function isActive(path: string): boolean {
  return route.path === path || (path !== '/' && route.path.startsWith(path))
}
</script>

<template>
  <aside
    class="flex flex-col h-full w-60 shrink-0 border-r overflow-y-auto"
    style="background: var(--bg-sidebar); border-color: var(--border-default);"
  >
    <div class="flex items-center gap-3 px-5 py-5 border-b" style="border-color: var(--border-default);">
      <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span class="text-sm font-semibold" style="color: var(--text-primary);">MCP Central</span>
    </div>

    <nav class="flex-1 px-3 py-4 flex flex-col gap-1">
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :class="['sidebar-link', { active: isActive(item.to) }]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="shrink-0">
          <path :d="item.icon" stroke-linecap="round" stroke-linejoin="round"/>
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
