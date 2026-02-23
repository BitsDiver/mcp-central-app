import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Tenant, ApiKey, NewApiKey } from '@/types'
import { setupApi, api, setApiKey } from '@/api/client'
import { useToastStore } from './toast'

export const useTenantStore = defineStore('tenant', () => {
  const tenants = ref<Tenant[]>([])
  const selectedTenant = ref<Tenant | null>(null)
  const apiKeys = ref<ApiKey[]>([])
  const selectedKeyId = ref<string | null>(null)
  const isLoading = ref(false)

  const selectedKey = computed(() =>
    apiKeys.value.find((k) => k.id === selectedKeyId.value) ?? null
  )

  async function loadTenants(): Promise<void> {
    isLoading.value = true
    try {
      const data = await setupApi.getTenants() as { tenants: Tenant[] }
      tenants.value = data.tenants
    } finally {
      isLoading.value = false
    }
  }

  async function selectTenant(tenant: Tenant): Promise<void> {
    selectedTenant.value = tenant
    await loadKeys()
    if (apiKeys.value.length > 0) {
      await selectKey(apiKeys.value[0].id)
    }
  }

  async function loadKeys(): Promise<void> {
    const data = await api.getKeys() as { keys: ApiKey[] }
    apiKeys.value = data.keys
  }

  async function selectKey(keyId: string): Promise<void> {
    selectedKeyId.value = keyId
    const key = apiKeys.value.find((k) => k.id === keyId)
    if (key) {
      setApiKey(`${key.keyPrefix}...placeholder`)
    }
  }

  function setKeyDirect(plainKey: string): void {
    setApiKey(plainKey)
  }

  async function createTenant(name: string): Promise<{ tenant: Tenant; apiKey: NewApiKey }> {
    const data = await setupApi.createTenant(name) as { tenant: Tenant; apiKey: NewApiKey }
    tenants.value.push(data.tenant)
    const toast = useToastStore()
    toast.success('Tenant created successfully.')
    return data
  }

  async function createKey(label: string): Promise<NewApiKey> {
    const data = await api.createKey(label) as NewApiKey
    await loadKeys()
    return data
  }

  async function revokeKey(id: string): Promise<void> {
    await api.deleteKey(id)
    apiKeys.value = apiKeys.value.filter((k) => k.id !== id)
    if (selectedKeyId.value === id) {
      selectedKeyId.value = apiKeys.value[0]?.id ?? null
      if (selectedKeyId.value) {
        await selectKey(selectedKeyId.value)
      } else {
        setApiKey(null)
      }
    }
    const toast = useToastStore()
    toast.success('API key revoked.')
  }

  function clear(): void {
    tenants.value = []
    selectedTenant.value = null
    apiKeys.value = []
    selectedKeyId.value = null
    setApiKey(null)
  }

  return {
    tenants,
    selectedTenant,
    apiKeys,
    selectedKeyId,
    selectedKey,
    isLoading,
    loadTenants,
    selectTenant,
    loadKeys,
    selectKey,
    setKeyDirect,
    createTenant,
    createKey,
    revokeKey,
    clear,
  }
})
