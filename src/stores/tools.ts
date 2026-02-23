import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tool } from '@/types'
import { api } from '@/api/client'

export const useToolStore = defineStore('tools', () => {
  const tools = ref<Tool[]>([])
  const count = ref(0)
  const isLoading = ref(false)

  async function load(): Promise<void> {
    isLoading.value = true
    try {
      const data = await api.getTools() as { tools: Tool[]; count: number }
      tools.value = data.tools
      count.value = data.count
    } finally {
      isLoading.value = false
    }
  }

  function updateFromSocket(updated: Tool[], newCount: number): void {
    tools.value = updated
    count.value = newCount
  }

  function clear(): void {
    tools.value = []
    count.value = 0
  }

  return { tools, count, isLoading, load, updateFromSocket, clear }
})
