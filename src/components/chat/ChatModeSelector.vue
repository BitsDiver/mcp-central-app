<script setup lang="ts">
    import { computed } from 'vue';
    import { useChatSettingsStore } from '@/stores/chatSettings';
    import type { ChatMode } from '@/types';

    const settingsStore = useChatSettingsStore();

    const MODES: { value: ChatMode; label: string; title: string; }[] = [
        { value: 'ask', label: 'Ask', title: 'Single-shot answer — no tool loops' },
        { value: 'plan', label: 'Plan', title: 'Decompose into tasks, review plan, then execute' },
        { value: 'agent', label: 'Agent', title: 'Fully autonomous agentic loop' },
    ];

    const current = computed(() => settingsStore.settings.chatMode ?? 'agent');

    function handleChange(e: Event) {
        settingsStore.update({ chatMode: (e.target as HTMLSelectElement).value as ChatMode });
    }
</script>

<template>
    <div class="mode-selector">
        <svg class="selector-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <select :value="current" class="mode-select" :title="MODES.find(m => m.value === current)?.title"
            @change="handleChange">
            <option v-for="m in MODES" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
    </div>
</template>

<style scoped>
    .mode-selector {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
    }

    .selector-icon {
        flex-shrink: 0;
        color: var(--text-tertiary);
    }

    .mode-select {
        appearance: none;
        -webkit-appearance: none;
        background: none;
        border: none;
        outline: none;
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 11px;
        font-weight: 500;
        color: var(--text-tertiary);
        padding: 2px 14px 2px 0;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0 center;
        transition: color 0.12s ease;
    }

    .mode-select:hover {
        color: var(--text-secondary);
    }

    .mode-select:focus {
        color: var(--text-primary);
    }
</style>
