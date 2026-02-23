import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UpstreamStatus } from '@/types'
import { api } from '@/api/client'

export const useStatusStore = defineStore('status', () => {
  const upstreams = ref<UpstreamStatus[]>([])
  const isLoading = ref(false)

  const totalTools = computed(() =>
    upstreams.value.reduce((sum, u) => sum + u.toolCount, 0)
  )

  const connectedCount = computed(
    () => upstreams.value.filter((u) => u.status === 'connected').length
  )

  async function load(): Promise<void> {
    isLoading.value = true
    try {
      const data = await api.getStatus() as { upstreams: UpstreamStatus[]; totalTools: number }
      upstreams.value = data.upstreams
    } finally {
      isLoading.value = false
    }
  }

  function updateUpstream(update: Partial<UpstreamStatus> & { endpointId: string }): void {
    const idx = upstreams.value.findIndex((u) => u.endpointId === update.endpointId)
    if (idx !== -1) {
      Object.assign(upstreams.value[idx], update)
    } else {
      upstreams.value.push(update as UpstreamStatus)
    }
  }

  function clear(): void {
    upstreams.value = []
  }

  return { upstreams, totalTools, connectedCount, isLoading, load, updateUpstream, clear }
})
