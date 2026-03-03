<script setup lang="ts">
  import { ref, computed, type Component } from 'vue';
  import { useRoute } from 'vue-router';
  import {
    Home, DatabaseZap, FlaskConical, Notebook, BotMessageSquare,
    Settings2, CircleHelp, Layers, ChevronRight, ChevronLeft,
  } from 'lucide-vue-next';

  defineEmits<{ linkClicked: []; }>();

  const route = useRoute();

  const collapsed = ref(localStorage.getItem('sidebar-collapsed') === 'true');

  function toggleCollapsed() {
    collapsed.value = !collapsed.value;
    localStorage.setItem('sidebar-collapsed', String(collapsed.value));
  }

  interface NavItem { to: string; label: string; icon: Component; }

  const navItems = computed<NavItem[]>(() => [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/endpoints', label: 'MCP Servers', icon: DatabaseZap },
    { to: '/tools', label: 'Tools', icon: FlaskConical },
    { to: '/registry', label: 'Registry', icon: Notebook },
    { to: '/chat', label: 'Chat', icon: BotMessageSquare },
    { to: '/settings', label: 'Settings', icon: Settings2 },
  ]);

  const bottomItems = computed<NavItem[]>(() => [
    { to: '/help', label: 'Help', icon: CircleHelp },
  ]);

  function isActive(path: string): boolean {
    return route.path === path || (path !== '/' && route.path.startsWith(path));
  }
</script>

<template>
  <aside :class="['sidebar-root', { 'sidebar-collapsed': collapsed }]"
    style="background: var(--bg-sidebar); border-color: var(--border-default);">

    <!-- Header: logo + title + toggle button -->
    <div class="sidebar-header" style="border-color: var(--bg-sidebar);">
      <div v-if="!collapsed" class="sidebar-logo">
        <Layers :size="18" color="white" :stroke-width="2.5" />
      </div>
      <span v-if="!collapsed" class="sidebar-title">MCP Central</span>
      <button type="button" class="sidebar-toggle" :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleCollapsed">
        <component :is="collapsed ? ChevronRight : ChevronLeft" :size="14" :stroke-width="2.5" />
      </button>
    </div>

    <!-- Nav -->
    <nav class="sidebar-nav">
      <router-link v-for="item in navItems" :key="item.to" :to="item.to"
        :class="['sidebar-link', { active: isActive(item.to) }]" :title="collapsed ? item.label : undefined"
        @click="$emit('linkClicked')">
        <component :is="item.icon" :size="18" :stroke-width="2" class="shrink-0" />
        <span v-if="!collapsed">{{ item.label }}</span>
      </router-link>
    </nav>

    <!-- Bottom links (Help, etc.) -->
    <nav class="sidebar-bottom">
      <router-link v-for="item in bottomItems" :key="item.to" :to="item.to"
        :class="['sidebar-link', { active: isActive(item.to) }]" :title="collapsed ? item.label : undefined"
        @click="$emit('linkClicked')">
        <component :is="item.icon" :size="18" :stroke-width="2" class="shrink-0" />
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

  .sidebar-bottom {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-top: 1px solid var(--border-default);
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