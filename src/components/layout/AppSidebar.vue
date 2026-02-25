<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { useRoute } from 'vue-router';

  defineEmits<{ linkClicked: []; }>();

  const route = useRoute();

  const collapsed = ref(localStorage.getItem('sidebar-collapsed') === 'true');

  function toggleCollapsed() {
    collapsed.value = !collapsed.value;
    localStorage.setItem('sidebar-collapsed', String(collapsed.value));
  }

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
  <aside :class="['sidebar-root', { 'sidebar-collapsed': collapsed }]"
    style="background: var(--bg-sidebar); border-color: var(--border-default);">

    <!-- Header: logo + title + toggle button -->
    <div class="sidebar-header" style="border-color: var(--border-default);">
      <div v-if="!collapsed" class="sidebar-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <span v-if="!collapsed" class="sidebar-title">MCP Central</span>
      <button type="button" class="sidebar-toggle" :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleCollapsed">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path v-if="collapsed" d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
          <path v-else d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <!-- Nav -->
    <nav class="sidebar-nav">
      <router-link v-for="item in navItems" :key="item.to" :to="item.to"
        :class="['sidebar-link', { active: isActive(item.to) }]" :title="collapsed ? item.label : undefined"
        @click="$emit('linkClicked')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
          class="shrink-0">
          <path :d="item.icon" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span v-if="!collapsed">{{ item.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<style scoped>
  .sidebar-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 15rem;
    border-right: 1px solid;
    overflow-y: auto;
    overflow-x: hidden;
    transition: width 0.2s ease;
    flex-shrink: 0;
  }

  .sidebar-collapsed {
    width: 3.5rem;
  }

  /* ── Header ── */
  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 10px 14px 14px;
    border-bottom: 1px solid;
    flex-shrink: 0;
  }

  .sidebar-logo {
    width: 30px;
    height: 30px;
    background: #3b82f6;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sidebar-title {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
  }

  /* Toggle sits right-aligned in the header */
  .sidebar-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 5px;
    color: var(--text-tertiary);
    transition: background 0.12s, color 0.12s;
  }

  .sidebar-toggle:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  /* In collapsed mode the toggle is still in the header, centred */
  .sidebar-collapsed .sidebar-header {
    justify-content: center;
    padding: 14px 0;
  }

  .sidebar-collapsed .sidebar-logo {
    margin: 0;
  }

  /* ── Nav ── */
  .sidebar-nav {
    flex: 1;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
  }

  .sidebar-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap;
    overflow: hidden;
    min-width: 0;
  }

  .sidebar-collapsed .sidebar-link {
    justify-content: center;
    padding: 8px 0;
  }

  .sidebar-link:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .sidebar-link.active {
    background: color-mix(in srgb, var(--color-primary-500) 12%, transparent);
    color: var(--color-primary-500);
    font-weight: 600;
  }

  .sidebar-link.active:hover {
    background: color-mix(in srgb, var(--color-primary-500) 18%, transparent);
  }

  [data-theme="dark"] .sidebar-link.active {
    background: color-mix(in srgb, var(--color-primary-400) 14%, transparent);
    color: var(--color-primary-400);
  }

  [data-theme="dark"] .sidebar-link.active:hover {
    background: color-mix(in srgb, var(--color-primary-400) 20%, transparent);
  }
</style>