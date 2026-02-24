<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import ArchitectureDiagram from '@/components/dashboard/ArchitectureDiagram.vue'
import VscodeConfigButton from '@/components/dashboard/VscodeConfigButton.vue'
import { useStatusStore } from '@/stores/status'
import { useToolStore } from '@/stores/tools'
import { useTenantStore } from '@/stores/tenant'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import type { EndpointStatus } from '@/types'

const statusStore = useStatusStore()
const toolStore = useToolStore()
const tenantStore = useTenantStore()

onMounted(async () => {
  if (statusStore.upstreams.length === 0) await statusStore.load()
  if (toolStore.tools.length === 0) await toolStore.load()
})

const stats = computed(() => [
  {
    label: 'Total Tools',
    value: toolStore.count,
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    color: 'text-blue-500',
    darkBg: 'rgba(59,130,246,0.12)',
  },
  {
    label: 'Connected Upstreams',
    value: statusStore.connectedCount,
    icon: 'M5 12h14M12 5l7 7-7 7',
    color: 'text-green-500',
    darkBg: 'rgba(34,197,94,0.12)',
  },
  {
    label: 'Total Upstreams',
    value: statusStore.upstreams.length,
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    color: 'text-amber-500',
    darkBg: 'rgba(245,158,11,0.12)',
  },
])

const isLoading = computed(() => statusStore.isLoading || toolStore.isLoading)
</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 class="text-xl font-semibold" style="color: var(--text-primary);">Dashboard</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            {{ tenantStore.selectedTenant?.name ?? 'No tenant selected' }}
          </p>
        </div>
        <VscodeConfigButton />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <template v-if="isLoading">
          <div v-for="i in 3" :key="i" class="card p-5">
            <SkeletonBlock height="1rem" width="60%" />
            <SkeletonBlock height="2rem" width="40%" class="mt-3" />
          </div>
        </template>
        <template v-else>
          <div v-for="stat in stats" :key="stat.label" class="card p-5 flex items-start gap-4">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" :style="`background: ${stat.darkBg}`">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" :class="stat.color">
                <path :d="stat.icon" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <p class="text-xs font-medium" style="color: var(--text-tertiary);">{{ stat.label }}</p>
              <p class="text-2xl font-bold mt-0.5" style="color: var(--text-primary);">{{ stat.value }}</p>
            </div>
          </div>
        </template>
      </div>

      <div class="mb-6">
        <ArchitectureDiagram />
      </div>

      <div class="card overflow-hidden">
        <div class="px-5 py-4 border-b flex items-center justify-between" style="border-color: var(--border-default);">
          <h2 class="text-sm font-semibold" style="color: var(--text-primary);">Upstream Status</h2>
          <span class="badge badge-neutral text-xs">{{ statusStore.upstreams.length }} servers</span>
        </div>

        <div v-if="isLoading" class="p-5 flex flex-col gap-3">
          <div v-for="i in 3" :key="i" class="flex items-center gap-4">
            <SkeletonBlock height="1rem" width="30%" />
            <SkeletonBlock height="1rem" width="20%" />
            <SkeletonBlock height="1rem" width="15%" />
          </div>
        </div>

        <div v-else-if="statusStore.upstreams.length === 0" class="py-12 text-center">
          <p class="text-sm" style="color: var(--text-tertiary);">No upstream servers configured.</p>
          <router-link to="/registry" class="text-sm text-blue-500 hover:underline mt-1 inline-block">Browse the registry to add servers →</router-link>
        </div>

        <div v-else class="divide-y" style="border-color: var(--border-default);">
          <div
            v-for="upstream in statusStore.upstreams"
            :key="upstream.endpointId"
            class="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[var(--bg-hover)]"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate" style="color: var(--text-primary);">{{ upstream.namespace }}</p>
            </div>
            <div v-if="upstream.status === 'error' && upstream.lastError" class="relative group/errortip">
              <StatusBadge :status="(upstream.status as EndpointStatus)" />
              <div class="pointer-events-none absolute bottom-full right-0 mb-2 z-50 hidden group-hover/errortip:block">
                <div class="max-w-xs rounded-lg px-3 py-2 text-xs shadow-lg" style="background: var(--bg-overlay); border: 1px solid var(--border-default); color: var(--text-secondary); white-space: normal; word-break: break-word;">
                  {{ upstream.lastError }}
                </div>
                <div class="absolute right-3 top-full w-0 h-0" style="border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid var(--border-default);"></div>
              </div>
            </div>
            <StatusBadge v-else :status="(upstream.status as EndpointStatus)" />
            <div class="text-right shrink-0">
              <p class="text-sm font-medium" style="color: var(--text-primary);">{{ upstream.toolCount }}</p>
              <p class="text-xs" style="color: var(--text-tertiary);">tools</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
