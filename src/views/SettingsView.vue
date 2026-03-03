<script setup lang="ts">
  import { ref, computed, markRaw, type Component } from 'vue';
  import AppLayout from '@/components/layout/AppLayout.vue';
  import SettingsProfile from '@/components/settings/SettingsProfile.vue';
  import SettingsTenants from '@/components/settings/SettingsTenants.vue';
  import SettingsKeys from '@/components/settings/SettingsKeys.vue';
  import SettingsAI from '@/components/settings/SettingsAI.vue';
  import SettingsUsers from '@/components/settings/SettingsUsers.vue';
  import SettingsA2A from '@/components/settings/SettingsA2A.vue';
  import SettingsSessions from '@/components/settings/SettingsSessions.vue';
  import { useAuthStore } from '@/stores/auth';
  import { User, Building, KeyRound, Monitor, SquareTerminal, Users, UserPlus } from 'lucide-vue-next';

  const authStore = useAuthStore();

  type Panel = 'profile' | 'tenants' | 'keys' | 'ai' | 'users' | 'a2a' | 'sessions';
  const activePanel = ref<Panel>('profile');

  const navItems = computed(() => {
    const items: { id: Panel; label: string; icon: Component; }[] = [
      {
        id: 'profile',
        label: 'Profile',
        icon: markRaw(User),
      },
      {
        id: 'tenants',
        label: authStore.isAdmin ? 'Tenants' : 'My Tenants',
        icon: markRaw(Building),
      },
      {
        id: 'keys',
        label: 'API Keys',
        icon: markRaw(KeyRound),
      },
      {
        id: 'ai',
        label: 'AI Settings',
        icon: markRaw(Monitor),
      },
      {
        id: 'a2a',
        label: 'A2A',
        icon: markRaw(SquareTerminal),
      },
      {
        id: 'sessions',
        label: 'Sessions',
        icon: markRaw(Users),
      },
    ];
    if (authStore.isAdmin) {
      items.push({
        id: 'users',
        label: 'Users',
        icon: markRaw(UserPlus),
      });
    }
    return items;
  });
</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-8 flex justify-center">
      <div class="card w-full max-w-5xl overflow-hidden flex" style="min-height: 520px;">

        <!-- Sub-nav -->
        <aside class="w-12 sm:w-48 shrink-0 border-r flex flex-col py-4 px-1 sm:px-2 gap-0.5"
          style="border-color: var(--border-default); background: var(--bg-muted);">
          <p class="hidden sm:block px-3 pt-1 pb-3 text-xs font-semibold uppercase tracking-wider"
            style="color: var(--text-tertiary);">
            Settings
          </p>
          <button v-for="item in navItems" :key="item.id" :title="item.label" :class="[
            'flex items-center gap-2.5 px-0 sm:px-3 py-2 rounded-md text-sm w-full transition-colors duration-150 justify-center sm:justify-start',
            activePanel === item.id
              ? 'font-medium bg-[var(--bg-active)] text-[var(--text-active)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          ]" @click="activePanel = item.id">
            <component :is="item.icon" :size="16" :stroke-width="1.75" class="shrink-0" />
            <span class="hidden sm:inline">{{ item.label }}</span>
          </button>
        </aside>

        <!-- Panel -->
        <main class="flex-1 overflow-y-auto">
          <SettingsProfile v-if="activePanel === 'profile'" />
          <SettingsTenants v-else-if="activePanel === 'tenants'" />
          <SettingsKeys v-else-if="activePanel === 'keys'" />
          <SettingsAI v-else-if="activePanel === 'ai'" />
          <SettingsUsers v-else-if="activePanel === 'users' && authStore.isAdmin" />
          <SettingsA2A v-else-if="activePanel === 'a2a'" />
          <SettingsSessions v-else-if="activePanel === 'sessions'" />
        </main>

      </div>
    </div>
  </AppLayout>
</template>
