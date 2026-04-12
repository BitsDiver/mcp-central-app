<script setup lang="ts">
  import { ref, onMounted, computed } from 'vue';
  import { RefreshCw, Search, Users } from 'lucide-vue-next';
  import AppButton from '@/components/ui/AppButton.vue';
  import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
  import EmptyState from '@/components/ui/EmptyState.vue';
  import { useAuthStore } from '@/stores/auth';
  import { useUsersStore } from '@/stores/users';

  const authStore = useAuthStore();
  const usersStore = useUsersStore();

  const search = ref('');

  async function loadUsers() {
    if (!usersStore.isConnected) {
      await usersStore.connect();
    }
    await usersStore.listUsers(search.value || undefined);
  }

  onMounted(() => {
    loadUsers();
  });

  const filteredUsers = computed(() => {
    if (!search.value) return usersStore.users;
    const q = search.value.toLowerCase();
    return usersStore.users.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
    );
  });

  function formatDate(d: string): string {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(d));
  }

  function initials(name: string | null, email: string | null): string {
    if (name) {
      const parts = name.split(' ').filter(Boolean);
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return '??';
  }
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-base font-semibold" style="color: var(--text-primary);">Users</h2>
        <p class="text-sm mt-0.5" style="color: var(--text-secondary);">
          View registered user accounts. Roles and account status are managed in auth-service.
        </p>
      </div>
      <AppButton variant="secondary" @click="loadUsers">
        <RefreshCw :size="15" />
        Refresh
      </AppButton>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <div class="relative max-w-xs">
        <input v-model="search" @keyup.enter="loadUsers" placeholder="Search by name or email…"
          class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none transition-colors duration-150"
          style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);" />
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2" :size="14" style="color: var(--text-tertiary);" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="usersStore.isLoading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="card flex items-center gap-4 px-5 py-4">
        <SkeletonBlock height="2.5rem" width="2.5rem" class="rounded-full shrink-0" />
        <div class="flex-1 space-y-2">
          <SkeletonBlock height="0.875rem" width="40%" />
          <SkeletonBlock height="0.75rem" width="55%" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="usersStore.error" class="card p-5">
      <p class="text-sm" style="color: var(--color-danger-600);">{{ usersStore.error }}</p>
      <AppButton class="mt-3" size="sm" @click="loadUsers">Retry</AppButton>
    </div>

    <!-- Empty prompt -->
    <EmptyState v-else-if="usersStore.users.length === 0" title="No users loaded"
      description="Click Refresh to load all users.">
      <template #icon>
        <Users :size="24" :stroke-width="1.5" style="color: var(--text-tertiary);" />
      </template>
      <AppButton size="sm" @click="loadUsers">Load Users</AppButton>
    </EmptyState>

    <!-- User cards -->
    <div v-else class="space-y-2">
      <div v-for="user in filteredUsers" :key="user.id" class="card px-5 py-4 flex items-center gap-4">
        <!-- Avatar -->
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          style="background: var(--color-primary-100); color: var(--color-primary-700);">
          {{ initials(user.name, user.email) }}
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium truncate" style="color: var(--text-primary);">
              {{ user.name ?? '—' }}
            </span>
            <span v-if="user.id === authStore.user?.id" class="badge badge-neutral text-[10px]">You</span>
          </div>
          <div class="flex items-center gap-3 mt-0.5">
            <span class="text-xs truncate" style="color: var(--text-secondary);">
              {{ user.email ?? 'No email' }}
            </span>
            <span class="text-xs hidden sm:inline" style="color: var(--text-tertiary);">
              Joined {{ formatDate(user.createdAt) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

  import AppButton from '@/components/ui/AppButton.vue';
  import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
  import EmptyState from '@/components/ui/EmptyState.vue';
  import { useAuthStore } from '@/stores/auth';
  import { useUsersStore } from '@/stores/users';
  import { useToastStore } from '@/stores/toast';

  const authStore = useAuthStore();
  const usersStore = useUsersStore();
  const toast = useToastStore();

  const search = ref('');
  const actionLoading = ref<string | null>(null);

  async function loadUsers() {
    if (!usersStore.isConnected) {
      await usersStore.connect();
    }
    await usersStore.listUsers(search.value || undefined);
  }

  onMounted(() => {
    loadUsers();
  });

  const filteredUsers = computed(() => {
    if (!search.value) return usersStore.users;
    const q = search.value.toLowerCase();
    return usersStore.users.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
    );
  });

  async function toggleRole(userId: string, current: 'admin' | 'user') {
    actionLoading.value = userId;
    try {
      await usersStore.updateRole(userId, current === 'admin' ? 'user' : 'admin');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update role.');
    } finally {
      actionLoading.value = null;
    }
  }

  async function toggleDisabled(userId: string, isDisabled: boolean) {
    actionLoading.value = userId;
    try {
      if (isDisabled) {
        await usersStore.enableUser(userId);
        toast.success('Account re-enabled.');
      } else {
        await usersStore.disableUser(userId);
        toast.success('Account disabled.');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update account status.');
    } finally {
      actionLoading.value = null;
    }
  }

  function formatDate(d: string): string {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(d));
  }

  function initials(name: string | null, email: string | null): string {
    if (name) {
      const parts = name.split(' ').filter(Boolean);
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return '??';
  }

  function planLabel(plan: string | null): string {
    if (!plan || plan === 'free') return 'Free';
    if (plan === 'pro') return 'Pro';
    if (plan === 'enterprise') return 'Enterprise';
    return plan;
  }
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-base font-semibold" style="color: var(--text-primary);">Users</h2>
        <p class="text-sm mt-0.5" style="color: var(--text-secondary);">Manage user accounts, roles and access</p>
      </div>
      <AppButton variant="secondary" @click="loadUsers">
        <RefreshCw :size="15" />
        Refresh
      </AppButton>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <div class="relative max-w-xs">
        <input v-model="search" @keyup.enter="loadUsers" placeholder="Search by name or email…"
          class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none transition-colors duration-150"
          style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);" />
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2" :size="14" style="color: var(--text-tertiary);" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="usersStore.isLoading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="card flex items-center gap-4 px-5 py-4">
        <SkeletonBlock height="2.5rem" width="2.5rem" class="rounded-full shrink-0" />
        <div class="flex-1 space-y-2">
          <SkeletonBlock height="0.875rem" width="40%" />
          <SkeletonBlock height="0.75rem" width="55%" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="usersStore.error" class="card p-5">
      <p class="text-sm" style="color: var(--color-danger-600);">{{ usersStore.error }}</p>
      <AppButton class="mt-3" size="sm" @click="loadUsers">Retry</AppButton>
    </div>

    <!-- Empty prompt -->
    <EmptyState v-else-if="usersStore.users.length === 0" title="No users loaded"
      description="Click Refresh to load all users.">
      <template #icon>
        <Users :size="24" :stroke-width="1.5" style="color: var(--text-tertiary);" />
      </template>
      <AppButton size="sm" @click="loadUsers">Load Users</AppButton>
    </EmptyState>

    <!-- User cards -->
    <div v-else class="space-y-2">
      <div v-for="user in filteredUsers" :key="user.id" class="card px-5 py-4 flex items-center gap-4 transition-colors"
        :class="{ 'opacity-50': user.isDisabled }">
        <!-- Avatar -->
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" :style="{
          background: user.isDisabled ? 'var(--bg-tertiary)' : 'var(--color-primary-100)',
          color: user.isDisabled ? 'var(--text-tertiary)' : 'var(--color-primary-700)',
        }">
          {{ initials(user.name, user.email) }}
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium truncate" style="color: var(--text-primary);">
              {{ user.name ?? '—' }}
            </span>
            <span v-if="user.role === 'admin'" class="badge badge-primary flex items-center gap-1">
              <Crown :size="10" />
              admin
            </span>
            <span v-else class="badge badge-neutral">user</span>
            <span v-if="user.isDisabled" class="badge flex items-center gap-1 text-[10px]"
              style="background: var(--color-danger-100); color: var(--color-danger-700);">
              <Ban :size="10" />
              disabled
            </span>
            <span class="badge badge-neutral text-[10px]" :title="'Subscription: ' + planLabel(user.subscriptionPlan)">
              {{ planLabel(user.subscriptionPlan) }}
            </span>
          </div>
          <div class="flex items-center gap-3 mt-0.5">
            <span class="text-xs truncate" style="color: var(--text-secondary);">
              {{ user.email ?? 'No email' }}
            </span>
            <span class="text-xs hidden sm:inline" style="color: var(--text-tertiary);">
              Joined {{ formatDate(user.createdAt) }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="user.id !== authStore.user?.id" class="flex items-center gap-1 shrink-0">
          <!-- Toggle role -->
          <button class="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-hover)]"
            :title="user.role === 'admin' ? 'Demote to user' : 'Promote to admin'" :disabled="actionLoading === user.id"
            @click="toggleRole(user.id, user.role)">
            <ShieldCheck v-if="user.role !== 'admin'" :size="16" style="color: var(--color-primary-500);" />
            <ShieldOff v-else :size="16" style="color: var(--text-tertiary);" />
          </button>

          <!-- Toggle disable -->
          <button class="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-hover)]"
            :title="user.isDisabled ? 'Enable account' : 'Disable account'" :disabled="actionLoading === user.id"
            @click="toggleDisabled(user.id, user.isDisabled)">
            <CheckCircle v-if="user.isDisabled" :size="16" style="color: var(--color-success-500);" />
            <Ban v-else :size="16" style="color: var(--color-danger-500);" />
          </button>
        </div>

        <!-- Self marker -->
        <span v-else class="text-xs shrink-0" style="color: var(--text-tertiary);">You</span>
      </div>
    </div>
  </div>
</template>
