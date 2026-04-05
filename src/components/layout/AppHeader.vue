<script setup lang="ts">
  import { ref } from 'vue';
  import { onClickOutside } from '@vueuse/core';
  import { useAuth } from '@/auth/useAuth';
  import { useDarkMode } from '@/composables/useDarkMode';
  import { useAuthStore } from '@/stores/auth';
  import TenantSwitcher from './TenantSwitcher.vue';
  import { Sun, Moon, ChevronDown, User, LogOut } from 'lucide-vue-next';

  const { logout } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const authStore = useAuthStore();

  const menuOpen = ref(false);
  const menuRef = ref<HTMLElement | null>(null);

  onClickOutside(menuRef, () => { menuOpen.value = false; });

  function handleLogout() {
    logout();
  }
</script>

<template>
  <header class="h-14 shrink-0 flex items-center gap-4 px-4 border-b"
    style="background: var(--bg-surface); border-color: var(--border-default);">
    <div class="flex-1 min-w-0">
      <TenantSwitcher />
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <button @click="toggle" class="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
        style="color: var(--text-secondary);" :class="'hover:bg-[var(--bg-hover)]'"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
        <Sun v-if="isDark" :size="18" :stroke-width="2" />
        <Moon v-else :size="18" :stroke-width="2" />
      </button>

      <div class="relative" ref="menuRef">
        <button @click="menuOpen = !menuOpen"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
          style="color: var(--text-primary);" :class="'hover:bg-[var(--bg-hover)]'">
          <div
            class="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
            {{ authStore.user?.name?.charAt(0).toUpperCase() ?? 'U' }}
          </div>
          <span class="hidden md:block max-w-28 truncate">{{ authStore.user?.name }}</span>
          <ChevronDown :size="14" :stroke-width="2.5" />
        </button>

        <Transition name="dropdown">
          <div v-if="menuOpen" class="absolute right-0 top-full mt-1.5 w-48 card py-1 z-50"
            style="box-shadow: var(--shadow-dropdown);">
            <div class="px-3 py-2 border-b" style="border-color: var(--border-default);">
              <p class="text-xs font-medium truncate" style="color: var(--text-primary);">{{ authStore.user?.name }}</p>
              <p class="text-xs truncate" style="color: var(--text-tertiary);">{{ authStore.user?.email }}</p>
            </div>
            <router-link to="/settings" @click="menuOpen = false"
              class="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)]"
              style="color: var(--text-secondary);">
              <User :size="15" :stroke-width="2" />
              Profile & Settings
            </router-link>
            <button @click="handleLogout"
              class="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-red-500 hover:bg-red-50">
              <LogOut :size="15" :stroke-width="2" />
              Sign out
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>
