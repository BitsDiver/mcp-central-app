<script setup lang="ts">
    import { computed, onMounted, markRaw } from 'vue';
    import { Box } from 'lucide-vue-next';
    import { useChatSettingsStore, PROVIDER_DEFAULT_MODELS } from '@/stores/chatSettings';
    import { useAiKeysStore } from '@/stores/aiKeys';
    import AppListbox from '@/components/ui/AppListbox.vue';
    import type { LLMProvider, ListboxOption } from '@/types';

    const chatSettings = useChatSettingsStore();
    const aiKeys = useAiKeysStore();

    const PROVIDER_LABELS: Record<LLMProvider, string> = {
        ollama: 'Ollama',
        openai: 'OpenAI',
        anthropic: 'Anthropic',
        gemini: 'Gemini',
        github: 'GitHub',
    };

    const CLOUD_PROVIDERS: LLMProvider[] = ['openai', 'anthropic', 'gemini', 'github'];

    // Ensure backend keys & Ollama model list are loaded
    onMounted(() => {
        if (aiKeys.providers.length === 0) aiKeys.loadProviders();
        if (
            chatSettings.settings.ollamaUrl &&
            chatSettings.availableModels.length === 0 &&
            !chatSettings.isLoadingModels
        ) {
            chatSettings.fetchModels();
        }
    });

    /** Providers that the user has actually configured (Ollama URL or stored API key) */
    const configuredProviders = computed<LLMProvider[]>(() => {
        const result: LLMProvider[] = [];
        if (chatSettings.settings.ollamaUrl) result.push('ollama');
        for (const p of CLOUD_PROVIDERS) {
            if (aiKeys.hasKey(p)) result.push(p);
        }
        return result;
    });

    const CUBE_ICON = markRaw(Box);

    /** Flat options list with groups for each provider */
    const modelOptions = computed<ListboxOption[]>(() => {
        const opts: ListboxOption[] = [];
        for (const p of configuredProviders.value) {
            const models = p === 'ollama'
                ? chatSettings.availableModels.map((m) => m.name)
                : (PROVIDER_DEFAULT_MODELS[p] ?? []);
            for (const m of models) {
                opts.push({ value: `${p}::${m}`, label: m, group: PROVIDER_LABELS[p] });
            }
        }
        return opts;
    });

    const currentProvider = computed(() => chatSettings.settings.provider ?? 'ollama');
    const selectedModel = computed(() => chatSettings.settings.selectedModel);

    /** Encode provider + model */
    const selectValue = computed(() => `${currentProvider.value}::${selectedModel.value}`);

    function handleChange(raw: string) {
        const sep = raw.indexOf('::');
        if (sep < 0) return;
        const provider = raw.slice(0, sep) as LLMProvider;
        const model = raw.slice(sep + 2);
        if (provider !== currentProvider.value) {
            chatSettings.switchProvider(provider);
        }
        chatSettings.update({ selectedModel: model });
    }
</script>

<template>
    <AppListbox :model-value="selectValue" @update:model-value="handleChange" :options="modelOptions"
        :trigger-icon="CUBE_ICON" size="sm" placement="top" searchable placeholder="No model" />
</template>
