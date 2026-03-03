<script setup lang="ts">
    import AppToggle from '@/components/ui/AppToggle.vue';
    import { Menu, Pencil } from 'lucide-vue-next';
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
            <Menu :size="16" :stroke-width="2" />
        </button>

        <div class="topbar-center">
            <span v-if="session" class="session-title">{{ session.title }}</span>
            <span v-else class="session-title muted">New conversation</span>
        </div>

        <div class="topbar-right">
            <!-- Session prompt override toggle -->
            <button type="button" class="prompt-override-btn" :class="{
                'prompt-override-btn--open': showSessionPrompt,
                'prompt-override-btn--modified': !!session?.systemPrompt,
            }" :title="showSessionPrompt ? 'Hide session prompt' : 'Override system prompt for this session'"
                @click="$emit('update:showSessionPrompt', !showSessionPrompt)">
                <Pencil :size="14" :stroke-width="2" />
                <span class="prompt-override-label">System Prompt</span>
                <span v-if="session?.systemPrompt" class="prompt-override-dot" />
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
        padding-left: 12px;
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

    /* ── Prompt override button ────────────────── */
    .prompt-override-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-default);
        background: none;
        cursor: pointer;
        color: var(--text-tertiary);
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        transition: all 0.12s ease;
        position: relative;
    }

    .prompt-override-btn:hover {
        color: var(--text-primary);
        border-color: var(--border-focus);
        background: var(--bg-hover);
    }

    .prompt-override-btn--open {
        color: var(--color-primary-500);
        border-color: var(--color-primary-400);
        background: color-mix(in srgb, var(--color-primary-500) 6%, transparent);
    }

    .prompt-override-btn--modified {
        color: var(--color-primary-500);
        border-color: var(--color-primary-400);
    }

    .prompt-override-label {
        line-height: 1;
    }

    .prompt-override-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--color-primary-500);
        flex-shrink: 0;
    }
</style>
