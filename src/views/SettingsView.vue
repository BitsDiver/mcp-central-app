<script setup lang="ts">
import { ref, computed } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import SettingsProfile from '@/components/settings/SettingsProfile.vue'
import SettingsTenants from '@/components/settings/SettingsTenants.vue'
import SettingsKeys from '@/components/settings/SettingsKeys.vue'
import SettingsAI from '@/components/settings/SettingsAI.vue'
import SettingsUsers from '@/components/settings/SettingsUsers.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

type Panel = 'profile' | 'tenants' | 'keys' | 'ai' | 'users'
const activePanel = ref<Panel>('profile')

const navItems = computed(() => {
  const items: { id: Panel; label: string; icon: string }[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    },
    {
      id: 'tenants',
      label: authStore.isAdmin ? 'Tenants' : 'My Tenants',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    },
    {
      id: 'keys',
      label: 'API Keys',
      icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
    },
    {
      id: 'ai',
      label: 'AI Settings',
      icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1',
    },
  ]
  if (authStore.isAdmin) {
    items.push({
      id: 'users',
      label: 'Users',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    })
  }
  return items
})
</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-8 flex justify-center">
      <div class="card w-full max-w-5xl overflow-hidden flex" style="min-height: 520px;">

        <!-- Sub-nav -->
        <aside
          class="w-48 shrink-0 border-r flex flex-col py-4 px-2 gap-0.5"
          style="border-color: var(--border-default); background: var(--bg-muted);"
        >
          <p class="px-3 pt-1 pb-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-tertiary);">Settings</p>
          <button
            v-for="item in navItems"
            :key="item.id"
            :class="[
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm w-full text-left transition-colors duration-150',
              activePanel === item.id
                ? 'font-medium bg-[var(--bg-active)] text-[var(--text-active)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
            ]"
            @click="activePanel = item.id"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="shrink-0">
              <path :d="item.icon" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>{{ item.label }}</span>
          </button>
        </aside>

        <!-- Panel -->
        <main class="flex-1 overflow-y-auto">
          <SettingsProfile v-if="activePanel === 'profile'" />
          <SettingsTenants v-else-if="activePanel === 'tenants'" />
          <SettingsKeys v-else-if="activePanel === 'keys'" />
          <SettingsAI v-else-if="activePanel === 'ai'" />
          <SettingsUsers v-else-if="activePanel === 'users' && authStore.isAdmin" />
        </main>

      </div>
    </div>
  </AppLayout>
</template>
