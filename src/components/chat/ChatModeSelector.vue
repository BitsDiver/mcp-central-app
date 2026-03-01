<script setup lang="ts">
    import { computed } from 'vue';
    import { useChatSettingsStore } from '@/stores/chatSettings';
    import AppListbox from '@/components/ui/AppListbox.vue';
    import type { ChatMode, ListboxOption } from '@/types';

    const settingsStore = useChatSettingsStore();

    const LIGHTNING_ICON = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>`;

    const modeOptions: ListboxOption[] = [
        { value: 'ask', label: 'Ask', description: 'Single-shot answer — no tool loops' },
        { value: 'plan', label: 'Plan', description: 'Decompose into tasks, review plan, then execute' },
        { value: 'agent', label: 'Agent', description: 'Fully autonomous agentic loop' },
    ];

    const current = computed(() => settingsStore.settings.chatMode ?? 'agent');

    function handleChange(value: string) {
        settingsStore.update({ chatMode: value as ChatMode });
    }
</script>

<template>
    <AppListbox :model-value="current" @update:model-value="handleChange" :options="modeOptions"
        :trigger-icon="LIGHTNING_ICON" size="sm" placement="top" placeholder="Mode" />
</template>
