<script setup lang="ts">
    import { computed, onMounted } from 'vue';
    import { useChatSettingsStore, PROVIDER_DEFAULT_MODELS } from '@/stores/chatSettings';
    import { useAiKeysStore } from '@/stores/aiKeys';
    import type { LLMProvider } from '@/types';

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

    /** Model groups to render in the <select> */
    const providerGroups = computed(() =>
        configuredProviders.value.map((p) => ({
            provider: p,
            label: PROVIDER_LABELS[p],
            models:
                p === 'ollama'
                    ? chatSettings.availableModels.map((m) => m.name)
                    : (PROVIDER_DEFAULT_MODELS[p] ?? []),
        })),
    );

    const currentProvider = computed(() => chatSettings.settings.provider ?? 'ollama');
    const selectedModel = computed(() => chatSettings.settings.selectedModel);

    /** Encode provider + model so we can decode on change */
    const selectValue = computed(() => `${currentProvider.value}::${selectedModel.value}`);

    function handleChange(e: Event) {
        const raw = (e.target as HTMLSelectElement).value;
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
    <div class="model-selector">
        <select :value="selectValue" @change="handleChange" class="model-select"
            :title="`${PROVIDER_LABELS[currentProvider]} — ${selectedModel || 'No model selected'}`">
            <template v-for="group in providerGroups" :key="group.provider">
                <optgroup :label="group.label">
                    <option v-if="group.models.length === 0" value="" disabled>No models</option>
                    <option v-for="m in group.models" :key="`${group.provider}::${m}`"
                        :value="`${group.provider}::${m}`">
                        {{ m }}
                    </option>
                </optgroup>
            </template>
            <option v-if="providerGroups.length === 0" value="" disabled>
                No provider configured
            </option>
        </select>
    </div>
</template>

<style scoped>
    .model-selector {
        display: inline-flex;
        align-items: center;
        min-width: 0;
    }

    .model-select {
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
        max-width: 200px;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0 center;
        transition: color 0.12s ease;
    }

    .model-select:hover {
        color: var(--text-secondary);
    }

    .model-select:focus {
        color: var(--text-primary);
    }
</style>
