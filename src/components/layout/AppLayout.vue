<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import AppToast from '@/components/ui/AppToast.vue'
import MobileMenuButton from './MobileMenuButton.vue'

const sidebarOpen = ref(false)
</script>

<template>
  <div class="flex h-dvh overflow-hidden" style="background: var(--bg-base);">
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-black/50 lg:hidden"
      @click="sidebarOpen = false"
    />
    <div :class="[
      'fixed inset-y-0 left-0 z-40 transition-transform duration-300 lg:relative lg:translate-x-0 lg:z-auto',
      sidebarOpen ? 'translate-x-0' : '-translate-x-full',
    ]">
      <AppSidebar @link-clicked="sidebarOpen = false" />
    </div>

    <div class="flex-1 flex flex-col overflow-hidden min-w-0">
      <div class="flex items-center gap-2 pr-2 border-b lg:hidden" style="background: var(--bg-surface); border-color: var(--border-default);">
        <div class="flex items-center gap-2 px-4 py-3 flex-1">
          <MobileMenuButton :open="sidebarOpen" @toggle="sidebarOpen = !sidebarOpen" />
          <span class="text-sm font-semibold" style="color: var(--text-primary);">MCP Central</span>
        </div>
      </div>

      <div class="hidden lg:block">
        <AppHeader />
      </div>

      <main class="flex-1 overflow-y-auto">
        <div class="h-full">
          <slot />
        </div>
      </main>
    </div>

    <AppToast />
  </div>
</template>
