<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useAuth0 } from '@auth0/auth0-vue'
import { useDarkMode } from '@/composables/useDarkMode'
import { useAuthStore } from '@/stores/auth'
import TenantSwitcher from './TenantSwitcher.vue'

const { logout } = useAuth0()
const { isDark, toggle } = useDarkMode()
const authStore = useAuthStore()

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

onClickOutside(menuRef, () => { menuOpen.value = false })

function handleLogout() {
  logout({ logoutParams: { returnTo: window.location.origin } })
}
</script>

<template>
  <header
    class="h-14 shrink-0 flex items-center gap-4 px-4 border-b"
    style="background: var(--bg-surface); border-color: var(--border-default);"
  >
    <div class="flex-1 min-w-0">
      <TenantSwitcher />
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <button
        @click="toggle"
        class="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
        style="color: var(--text-secondary);"
        :class="'hover:bg-[var(--bg-hover)]'"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <svg v-if="isDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>

      <div class="relative" ref="menuRef">
        <button
          @click="menuOpen = !menuOpen"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
          style="color: var(--text-primary);"
          :class="'hover:bg-[var(--bg-hover)]'"
        >
          <div class="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
            {{ authStore.user?.name?.charAt(0).toUpperCase() ?? 'U' }}
          </div>
          <span class="hidden md:block max-w-28 truncate">{{ authStore.user?.name }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
        </button>

        <Transition name="dropdown">
          <div
            v-if="menuOpen"
            class="absolute right-0 top-full mt-1.5 w-48 card py-1 z-50"
            style="box-shadow: var(--shadow-dropdown);"
          >
            <div class="px-3 py-2 border-b" style="border-color: var(--border-default);">
              <p class="text-xs font-medium truncate" style="color: var(--text-primary);">{{ authStore.user?.name }}</p>
              <p class="text-xs truncate" style="color: var(--text-tertiary);">{{ authStore.user?.email }}</p>
            </div>
            <router-link to="/settings" @click="menuOpen = false" class="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)]" style="color: var(--text-secondary);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              Profile & Settings
            </router-link>
            <button @click="handleLogout" class="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-red-500 hover:bg-red-50">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Sign out
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>
