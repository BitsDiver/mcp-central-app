import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Endpoint } from '@/types'
import { api } from '@/api/client'
import { useToastStore } from './toast'

export const useEndpointStore = defineStore('endpoints', () => {
  const endpoints = ref<Endpoint[]>([])
  const isLoading = ref(false)

  async function load(): Promise<void> {
    isLoading.value = true
    try {
      const data = await api.getEndpoints() as { endpoints: Endpoint[] }
      endpoints.value = data.endpoints
    } finally {
      isLoading.value = false
    }
  }

  async function create(payload: Record<string, unknown>): Promise<Endpoint> {
    const data = await api.createEndpoint(payload) as { endpoint: Endpoint }
    endpoints.value.push(data.endpoint)
    const toast = useToastStore()
    toast.success('Endpoint added successfully.')
    return data.endpoint
  }

  async function remove(id: string): Promise<void> {
    await api.deleteEndpoint(id)
    endpoints.value = endpoints.value.filter((e) => e.id !== id)
    const toast = useToastStore()
    toast.success('Endpoint removed.')
  }

  async function toggle(id: string, isEnabled: boolean): Promise<void> {
    await api.toggleEndpoint(id, isEnabled)
    const ep = endpoints.value.find((e) => e.id === id)
    if (ep) ep.isEnabled = isEnabled
  }

  function updateFromSocket(endpointId: string, patch: Partial<Endpoint>): void {
    const ep = endpoints.value.find((e) => e.id === endpointId)
    if (ep) Object.assign(ep, patch)
  }

  function clear(): void {
    endpoints.value = []
  }

  return { endpoints, isLoading, load, create, remove, toggle, updateFromSocket, clear }
})
