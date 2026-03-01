<script setup lang="ts">
    import AppToggle from '@/components/ui/AppToggle.vue';
    import type { ChatSession } from '@/types';

    defineProps<{
        session: ChatSession | null;
        sidebarOpen: boolean;
        showSessionPrompt: boolean;
        linkToTenant: boolean;
    }>();

    defineEmits<{
        'update:sidebarOpen': [value: boolean];
        'update:showSessionPrompt': [value: boolean];
        'update:linkToTenant': [value: boolean];
    }>();
</script>

<template>
    <div class="chat-topbar">
        <button type="button" class="topbar-btn" :title="sidebarOpen ? 'Hide sessions' : 'Show sessions'"
            @click="$emit('update:sidebarOpen', !sidebarOpen)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12h18M3 6h18M3 18h18" stroke-linecap="round" />
            </svg>
        </button>

        <div class="topbar-center">
            <span v-if="session" class="session-title">{{ session.title }}</span>
            <span v-else class="session-title muted">New conversation</span>
        </div>

        <div class="topbar-right">
            <!-- Session prompt override toggle -->
            <button type="button" class="topbar-btn"
                :class="{ 'prompt-btn-active': showSessionPrompt || !!session?.systemPrompt }"
                :title="showSessionPrompt ? 'Hide session prompt' : 'Override system prompt for this session'"
                @click="$emit('update:showSessionPrompt', !showSessionPrompt)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9" stroke-linecap="round" />
                    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke-linecap="round"
                        stroke-linejoin="round" />
                </svg>
            </button>

            <div class="tenant-link-toggle">
                <span class="toggle-label">Link to tenant</span>
                <AppToggle :model-value="linkToTenant" @update:model-value="$emit('update:linkToTenant', $event)" />
            </div>
        </div>
    </div>
</template>

<style scoped>
    .chat-topbar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        border-bottom: 1px solid var(--border-default);
        flex-shrink: 0;
        background: var(--bg-surface);
    }

    .topbar-btn {
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-md);
        border: none;
        background: none;
        cursor: pointer;
        color: var(--text-tertiary);
        flex-shrink: 0;
        transition: all 0.12s ease;
    }

    .topbar-btn:hover {
        color: var(--text-primary);
        background: var(--bg-hover);
    }

    .topbar-center {
        flex: 1;
        min-width: 0;
    }

    .session-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
    }

    .session-title.muted {
        color: var(--text-tertiary);
        font-weight: 400;
    }

    .topbar-right {
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }

    .tenant-link-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .toggle-label {
        font-size: 12px;
        color: var(--text-secondary);
        white-space: nowrap;
    }

    .prompt-btn-active {
        color: var(--color-primary-500) !important;
        background: color-mix(in srgb, var(--color-primary-500) 10%, transparent) !important;
    }
</style>
