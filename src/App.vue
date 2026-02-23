<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth0 } from '@auth0/auth0-vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useSocketStore } from '@/stores/socket'
import { useEndpointStore } from '@/stores/endpoints'
import { useToolStore } from '@/stores/tools'
import { useStatusStore } from '@/stores/status'
import { useDarkMode } from '@/composables/useDarkMode'
import { useToastStore } from '@/stores/toast'

const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0()
const router = useRouter()
const authStore = useAuthStore()
const tenantStore = useTenantStore()
const socketStore = useSocketStore()
const endpointStore = useEndpointStore()
const toolStore = useToolStore()
const statusStore = useStatusStore()
const toast = useToastStore()

useDarkMode()

watch([isAuthenticated, isLoading], async ([authed, loading]) => {
  if (loading) return

  if (authed) {
    try {
      const token = await getAccessTokenSilently()
      authStore.setToken(token)
      await authStore.loadProfile()
      await tenantStore.loadTenants()

      if (tenantStore.tenants.length > 0) {
        const first = tenantStore.tenants[0]
        await tenantStore.selectTenant(first)

        socketStore.connect(token)
        await socketStore.selectTenant(first.id)

        await Promise.all([
          endpointStore.load(),
          toolStore.load(),
          statusStore.load(),
        ])
      }

      if (router.currentRoute.value.path === '/') {
        await router.push('/dashboard')
      }
    } catch (err) {
      toast.error('Failed to initialize session. Please try again.')
    }
  } else {
    if (router.currentRoute.value.meta.requiresAuth) {
      await router.push('/')
    }
  }
}, { immediate: true })
</script>

<template>
  <router-view />
</template>
