<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useTenantStore } from '@/stores/tenant'
import { useSocketStore } from '@/stores/socket'
import { useEndpointStore } from '@/stores/endpoints'
import { useToolStore } from '@/stores/tools'
import { useStatusStore } from '@/stores/status'

const tenantStore = useTenantStore()
const socketStore = useSocketStore()
const endpointStore = useEndpointStore()
const toolStore = useToolStore()
const statusStore = useStatusStore()

const open = ref(false)
const switching = ref(false)
const containerRef = ref<HTMLElement | null>(null)

onClickOutside(containerRef, () => { open.value = false })

async function switchTenant(tenantId: string) {
  if (switching.value || tenantStore.selectedTenant?.id === tenantId) {
    open.value = false
    return
  }
  switching.value = true
  try {
    const tenant = tenantStore.tenants.find((t) => t.id === tenantId)
    if (!tenant) return
    await tenantStore.selectTenant(tenant)
    await socketStore.selectTenant(tenant.id)
    endpointStore.clear()
    toolStore.clear()
    statusStore.clear()
    await Promise.all([
      endpointStore.load(),
      toolStore.load(),
      statusStore.load(),
    ])
  } finally {
    switching.value = false
    open.value = false
  }
}
</script>

<template>
  <div class="relative inline-block" ref="containerRef">
    <button
      @click="open = !open"
      :disabled="switching"
      class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors max-w-xs"
      style="color: var(--text-primary);"
      :class="'hover:bg-[var(--bg-hover)]'"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-tertiary); shrink-0: true;">
        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
      </svg>
      <span v-if="tenantStore.selectedTenant" class="truncate">{{ tenantStore.selectedTenant.name }}</span>
      <span v-else style="color: var(--text-tertiary);">Select tenant…</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0" style="color: var(--text-tertiary);"><path d="M6 9l6 6 6-6"/></svg>
    </button>

    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute left-0 top-full mt-1.5 w-64 card py-1 z-50 overflow-hidden"
        style="box-shadow: var(--shadow-dropdown);"
      >
        <p class="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-tertiary);">Tenants</p>
        <button
          v-for="tenant in tenantStore.tenants"
          :key="tenant.id"
          @click="switchTenant(tenant.id)"
          class="w-full flex items-center justify-between px-3 py-2 text-sm transition-colors"
          style="color: var(--text-primary);"
          :class="'hover:bg-[var(--bg-hover)]'"
        >
          <span class="truncate">{{ tenant.name }}</span>
          <svg v-if="tenantStore.selectedTenant?.id === tenant.id" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-blue-500 shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
        </button>
        <div v-if="tenantStore.tenants.length === 0" class="px-3 py-2 text-sm" style="color: var(--text-tertiary);">No tenants yet</div>
      </div>
    </Transition>
  </div>
</template>
