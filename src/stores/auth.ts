import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { setupApi } from '@/api/client'
import { setAuth0Token } from '@/api/client'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function loadProfile(): Promise<void> {
    isLoading.value = true
    try {
      const data = await setupApi.getMe() as { id: string; email: string; name: string; role: 'admin' | 'user'; createdAt: string }
      user.value = data
    } finally {
      isLoading.value = false
    }
  }

  function setToken(token: string): void {
    setAuth0Token(token)
  }

  function clear(): void {
    user.value = null
    setAuth0Token(null)
  }

  return { user, isLoading, isAuthenticated, isAdmin, loadProfile, setToken, clear }
})
