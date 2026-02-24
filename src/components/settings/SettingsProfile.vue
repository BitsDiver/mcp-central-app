<script setup lang="ts">
    import AppToggle from '@/components/ui/AppToggle.vue';
    import { useAuthStore } from '@/stores/auth';
    import { useDarkMode } from '@/composables/useDarkMode';
    import { useAuth0 } from '@auth0/auth0-vue';

    const authStore = useAuthStore();
    const { isDark, toggle } = useDarkMode();
    const { user: auth0User } = useAuth0();

    function formatDate(date: string): string {
        return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(date));
    }
</script>

<template>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-xl mx-auto">
        <h2 class="text-base font-semibold mb-5" style="color: var(--text-primary);">Profile</h2>

        <div class="card p-5 mb-4">
            <dl class="flex flex-col gap-3">
                <div class="flex items-center justify-between py-2 border-b"
                    style="border-color: var(--border-default);">
                    <dt class="text-sm" style="color: var(--text-secondary);">Name</dt>
                    <dd class="text-sm font-medium" style="color: var(--text-primary);">{{ authStore.user?.name ?? '—'
                        }}</dd>
                </div>
                <div class="flex items-center justify-between py-2 border-b"
                    style="border-color: var(--border-default);">
                    <dt class="text-sm" style="color: var(--text-secondary);">Email</dt>
                    <dd class="text-sm font-medium" style="color: var(--text-primary);">{{ authStore.user?.email ||
                        auth0User?.email || '—' }}</dd>
                </div>
                <div class="flex items-center justify-between py-2 border-b"
                    style="border-color: var(--border-default);">
                    <dt class="text-sm" style="color: var(--text-secondary);">Role</dt>
                    <dd>
                        <span class="badge" :class="authStore.isAdmin ? 'badge-primary' : 'badge-neutral'">
                            {{ authStore.user?.role ?? '—' }}
                        </span>
                    </dd>
                </div>
                <div class="flex items-center justify-between py-2">
                    <dt class="text-sm" style="color: var(--text-secondary);">Member since</dt>
                    <dd class="text-sm" style="color: var(--text-primary);">
                        {{ authStore.user?.createdAt ? formatDate(authStore.user.createdAt) : '—' }}
                    </dd>
                </div>
            </dl>
        </div>

        <div class="card p-5">
            <h3 class="text-sm font-semibold mb-4" style="color: var(--text-primary);">Preferences</h3>
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium" style="color: var(--text-primary);">Dark mode</p>
                    <p class="text-xs mt-0.5" style="color: var(--text-tertiary);">Saved automatically in your browser
                    </p>
                </div>
                <AppToggle :model-value="isDark" @update:model-value="toggle" />
            </div>
        </div>
    </div>
</template>
