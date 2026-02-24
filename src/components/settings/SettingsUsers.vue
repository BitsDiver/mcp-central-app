<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useAuthStore } from '@/stores/auth'
import { useUsersStore } from '@/stores/users'
import { useToastStore } from '@/stores/toast'

const authStore = useAuthStore()
const usersStore = useUsersStore()
const toast = useToastStore()

const search = ref('')
const roleUpdating = ref<string | null>(null)

async function loadUsers() {
  if (!usersStore.isConnected) {
    await usersStore.connect()
  }
  await usersStore.listUsers(search.value || undefined)
}

onMounted(() => {
  loadUsers()
})

async function toggleRole(userId: string, current: 'admin' | 'user') {
  roleUpdating.value = userId
  try {
    await usersStore.updateRole(userId, current === 'admin' ? 'user' : 'admin')
  } catch (err: any) {
    toast.error(err?.message ?? 'Failed to update role.')
  } finally {
    roleUpdating.value = null
  }
}

function formatDate(d: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(d))
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-base font-semibold" style="color: var(--text-primary);">Users</h2>
        <p class="text-sm mt-0.5" style="color: var(--text-secondary);">Manage user accounts and roles</p>
      </div>
      <AppButton variant="secondary" @click="loadUsers">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Refresh
      </AppButton>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <div class="relative max-w-xs">
        <input
          v-model="search"
          @keyup.enter="loadUsers"
          placeholder="Search by name or email…"
          class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none transition-colors duration-150"
          style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);"
        />
        <svg class="absolute left-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-tertiary);">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="usersStore.isLoading" class="card overflow-hidden">
      <div v-for="i in 4" :key="i" class="flex items-center gap-4 px-5 py-4 border-b" style="border-color: var(--border-default);">
        <SkeletonBlock height="1rem" width="30%" />
        <SkeletonBlock height="1rem" width="35%" />
        <SkeletonBlock height="1rem" width="15%" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="usersStore.error" class="card p-5">
      <p class="text-sm" style="color: var(--color-danger-600);">{{ usersStore.error }}</p>
      <AppButton class="mt-3" size="sm" @click="loadUsers">Retry</AppButton>
    </div>

    <!-- Empty prompt -->
    <EmptyState
      v-else-if="usersStore.users.length === 0"
      title="No users loaded"
      description="Click Refresh to load all users."
    >
      <template #icon>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-tertiary);">
          <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </template>
      <AppButton size="sm" @click="loadUsers">Load Users</AppButton>
    </EmptyState>

    <!-- Table -->
    <div v-else class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b" style="border-color: var(--border-default);">
            <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-tertiary);">Name</th>
            <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style="color: var(--text-tertiary);">Email</th>
            <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style="color: var(--text-tertiary);">Joined</th>
            <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-tertiary);">Role</th>
            <th class="px-5 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y" style="border-color: var(--border-default);">
          <tr
            v-for="user in usersStore.users"
            :key="user.id"
            class="hover:bg-[var(--bg-hover)] transition-colors"
          >
            <td class="px-5 py-3 font-medium" style="color: var(--text-primary);">{{ user.name ?? '—' }}</td>
            <td class="px-5 py-3 hidden sm:table-cell" style="color: var(--text-secondary);">{{ user.email ?? '—' }}</td>
            <td class="px-5 py-3 hidden md:table-cell" style="color: var(--text-secondary);">{{ formatDate(user.createdAt) }}</td>
            <td class="px-5 py-3">
              <span :class="['badge', user.role === 'admin' ? 'badge-primary' : 'badge-neutral']">{{ user.role }}</span>
            </td>
            <td class="px-5 py-3 text-right">
              <AppButton
                v-if="user.id !== authStore.user?.id"
                variant="ghost"
                size="sm"
                :loading="roleUpdating === user.id"
                @click="toggleRole(user.id, user.role)"
              >
                {{ user.role === 'admin' ? 'Demote' : 'Promote' }}
              </AppButton>
              <span v-else class="text-xs" style="color: var(--text-tertiary);">You</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
