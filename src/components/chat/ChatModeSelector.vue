<script setup lang="ts">
    import { computed, markRaw } from 'vue';
    import { Zap } from 'lucide-vue-next';
    import { useChatSettingsStore } from '@/stores/chatSettings';
    import AppListbox from '@/components/ui/AppListbox.vue';
    import type { ChatMode, ListboxOption } from '@/types';

    const settingsStore = useChatSettingsStore();

    const LIGHTNING_ICON = markRaw(Zap);

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
