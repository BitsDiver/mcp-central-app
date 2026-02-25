<script setup lang="ts">
    import { ref, computed, onMounted, watch } from 'vue';
    import { useChatSettingsStore, PROVIDER_DEFAULT_MODELS, MODEL_CONTEXT_LIMITS, DEFAULT_MAX_CONTEXT } from '@/stores/chatSettings';
    import { useAiKeysStore } from '@/stores/aiKeys';
    import type { LLMProvider } from '@/types';

    const chatSettings = useChatSettingsStore();
    const aiKeys = useAiKeysStore();

    const provider = computed(() => chatSettings.settings.provider ?? 'ollama');

    // ── Draft form state (not committed until Save is clicked) ────────────────────
    const draftModel = ref(chatSettings.settings.selectedModel);
    const draftContextSize = ref(chatSettings.settings.contextSize);
    const draftSystemPrompt = ref(chatSettings.settings.systemPrompt);
    const draftOllamaUrl = ref(chatSettings.settings.ollamaUrl);
    const draftOllamaApiKey = ref(chatSettings.settings.ollamaApiKey ?? '');

    const isDirty = computed(() =>
        draftModel.value !== chatSettings.settings.selectedModel ||
        draftContextSize.value !== chatSettings.settings.contextSize ||
        draftSystemPrompt.value !== chatSettings.settings.systemPrompt ||
        draftOllamaUrl.value !== chatSettings.settings.ollamaUrl ||
        draftOllamaApiKey.value !== (chatSettings.settings.ollamaApiKey ?? ''),
    );

    // ── Key management state ──────────────────────────────────────────────────────
    const newApiKey = ref('');
    const isSavingKey = ref(false);
    const keyError = ref<string | null>(null);
    const keySuccess = ref(false);

    // ── Save config feedback ───────────────────────────────────────────────────────
    const configSaved = ref(false);

    const backendModels = computed(() =>
        provider.value !== 'ollama' ? PROVIDER_DEFAULT_MODELS[provider.value] : [],
    );

    // True when the user is explicitly typing a custom model name
    const customModelMode = ref(
        provider.value !== 'ollama' &&
        draftModel.value !== '' &&
        !backendModels.value.includes(draftModel.value),
    );

    // Single merged provider watch — resets key state, reloads drafts, syncs customModelMode
    watch(provider, (p) => {
        newApiKey.value = '';
        keyError.value = null;
        keySuccess.value = false;
        // Restore the saved config for this provider (switchProvider already updated the store)
        draftModel.value = chatSettings.settings.selectedModel;
        draftContextSize.value = chatSettings.settings.contextSize;
        draftSystemPrompt.value = chatSettings.settings.systemPrompt;
        if (p !== 'ollama') {
            const models = PROVIDER_DEFAULT_MODELS[p] ?? [];
            customModelMode.value = draftModel.value !== '' && !models.includes(draftModel.value);
            aiKeys.loadProviders();
        } else {
            customModelMode.value = false;
            chatSettings.fetchModels();
        }
    });

    // Keep draftModel in sync when Ollama auto-selects a model after detection
    watch(
        () => chatSettings.settings.selectedModel,
        (m) => { if (provider.value === 'ollama') draftModel.value = m; },
    );

    onMounted(() => {
        if (provider.value === 'ollama') {
            chatSettings.fetchModels();
        } else {
            aiKeys.loadProviders();
        }
    });

    const PROVIDERS: { id: LLMProvider; label: string; }[] = [
        { id: 'ollama', label: 'Ollama' },
        { id: 'openai', label: 'OpenAI' },
        { id: 'anthropic', label: 'Anthropic' },
        { id: 'gemini', label: 'Gemini' },
    ];

    const currentKeyInfo = computed(() =>
        provider.value !== 'ollama' ? aiKeys.getProviderInfo(provider.value) : null,
    );

    async function handleSaveKey() {
        if (!newApiKey.value.trim()) return;
        isSavingKey.value = true;
        keyError.value = null;
        keySuccess.value = false;
        const hint = await aiKeys.saveKey(provider.value as Exclude<LLMProvider, 'ollama'>, newApiKey.value.trim());
        isSavingKey.value = false;
        if (hint) {
            newApiKey.value = '';
            keySuccess.value = true;
            setTimeout(() => { keySuccess.value = false; }, 2000);
        } else {
            keyError.value = aiKeys.error ?? 'Failed to save key';
        }
    }

    async function handleDeleteKey() {
        keyError.value = null;
        await aiKeys.deleteKey(provider.value as Exclude<LLMProvider, 'ollama'>);
    }

    function handleSaveConfig() {
        chatSettings.saveProviderConfig(provider.value, {
            selectedModel: draftModel.value,
            contextSize: draftContextSize.value,
            systemPrompt: draftSystemPrompt.value,
            ollamaUrl: draftOllamaUrl.value,
            ollamaApiKey: draftOllamaApiKey.value,
        });
        configSaved.value = true;
        setTimeout(() => { configSaved.value = false; }, 2000);
    }

    function formatModelSize(bytes: number): string {
        const gb = bytes / 1073741824;
        return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1048576).toFixed(0)} MB`;
    }

    // ── Context window slider (log scale) ────────────────────────────────────────
    const MIN_CTX = 1024;

    /** Max tokens for the currently selected model (or fallback for Ollama/custom). */
    const maxContextSize = computed(() => MODEL_CONTEXT_LIMITS[draftModel.value] ?? DEFAULT_MAX_CONTEXT);

    /** Format a token count in French locale, e.g. 32 768 tokens. */
    function fmtTokens(n: number): string {
        return new Intl.NumberFormat('fr-FR').format(n) + '\u202ftokens';
    }

    function _sliderToTokens(pos: number, max: number): number {
        const t = pos / 1000;
        return Math.round(Math.exp(Math.log(MIN_CTX) + t * (Math.log(max) - Math.log(MIN_CTX))));
    }

    function _tokensToSlider(tokens: number, max: number): number {
        const clamped = Math.max(MIN_CTX, Math.min(tokens, max));
        return Math.round(((Math.log(clamped) - Math.log(MIN_CTX)) / (Math.log(max) - Math.log(MIN_CTX))) * 1000);
    }

    const sliderPosition = computed({
        get: () => _tokensToSlider(draftContextSize.value, maxContextSize.value),
        set: (pos: number) => { draftContextSize.value = _sliderToTokens(pos, maxContextSize.value); },
    });

    // Clamp stored value when the model changes to a smaller context window
    watch(maxContextSize, (max) => {
        if (draftContextSize.value > max) draftContextSize.value = max;
    });
</script>

<template>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-xl mx-auto">
        <h2 class="text-base font-semibold mb-1" style="color: var(--text-primary);">AI Settings</h2>
        <p class="text-xs mb-5" style="color: var(--text-tertiary);">Choose a provider and configure the connection.</p>

        <!-- Provider tabs -->
        <div class="flex gap-1 p-1 rounded-lg mb-6" style="background: var(--bg-secondary);">
            <button v-for="p in PROVIDERS" :key="p.id" type="button" :class="[
                'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors duration-150',
                provider === p.id ? 'shadow-sm' : 'hover:opacity-80',
            ]" :style="provider === p.id
                ? 'background: var(--color-primary, #3b82f6); color: white;'
                : 'color: var(--text-secondary);'" @click="chatSettings.switchProvider(p.id)">
                {{ p.label }}
            </button>
        </div>

        <div class="flex flex-col gap-4">

            <!-- ══ OLLAMA ══════════════════════════════════════════════════════ -->
            <template v-if="provider === 'ollama'">
                <p class="text-xs -mt-2" style="color: var(--text-tertiary);">
                    Ollama runs locally — your data never leaves your machine.
                </p>

                <div class="flex flex-col gap-1.5">
                    <label for="ollama-url" class="text-sm font-medium" style="color: var(--text-primary)">Ollama server
                        URL</label>
                    <div class="relative flex items-center">
                        <input id="ollama-url" type="text" :value="draftOllamaUrl"
                            @input="draftOllamaUrl = ($event.target as HTMLInputElement).value"
                            placeholder="http://localhost:11434"
                            class="w-full pl-3 pr-10 py-2 text-sm rounded-lg border transition-colors duration-150 outline-none bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] border-[var(--border-default)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-blue-500/20" />
                        <button type="button" :disabled="chatSettings.isLoadingModels"
                            @click="chatSettings.fetchModels()" title="Detect models"
                            class="absolute right-2 flex items-center justify-center w-6 h-6 rounded transition-colors duration-150 disabled:opacity-40"
                            style="color: var(--text-secondary);" onmouseenter="this.style.color='var(--text-primary)'"
                            onmouseleave="this.style.color='var(--text-secondary)'">
                            <svg v-if="!chatSettings.isLoadingModels" width="15" height="15" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M5.636 18.364a9 9 0 0 1 0-12.728" />
                                <path d="M18.364 5.636a9 9 0 0 1 0 12.728" />
                                <path d="M8.464 15.536a5 5 0 0 1 0-7.072" />
                                <path d="M15.536 8.464a5 5 0 0 1 0 7.072" />
                                <circle cx="12" cy="12" r="1" fill="currentColor" />
                            </svg>
                            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" class="animate-spin">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                        </button>
                    </div>
                    <p class="text-xs" style="color: var(--text-tertiary)">The base URL of your running Ollama instance
                    </p>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label for="ollama-key" class="text-sm font-medium" style="color: var(--text-primary)">
                        API key <span class="font-normal" style="color: var(--text-tertiary);">(optional)</span>
                    </label>
                    <input id="ollama-key" type="password" :value="draftOllamaApiKey"
                        @input="draftOllamaApiKey = ($event.target as HTMLInputElement).value"
                        placeholder="sk-…  (leave empty for local Ollama)" autocomplete="new-password"
                        class="w-full px-3 py-2 text-sm rounded-lg border transition-colors duration-150 outline-none bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] border-[var(--border-default)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-blue-500/20" />
                    <p class="text-xs" style="color: var(--text-tertiary)">
                        Sent as <code
                            style="font-family: var(--font-mono); font-size: 11px;">Authorization: Bearer &lt;key&gt;</code>
                    </p>
                </div>

                <div v-if="chatSettings.modelLoadError" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                    style="background: var(--color-danger-50); color: var(--color-danger-700);">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
                    </svg>
                    {{ chatSettings.modelLoadError }}
                </div>

                <div>
                    <label class="text-sm font-medium block mb-1.5" style="color: var(--text-primary);">Model</label>
                    <select :value="draftModel" @change="draftModel = ($event.target as HTMLSelectElement).value"
                        class="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors duration-150"
                        style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);">
                        <option value="" disabled>{{ chatSettings.availableModels.length === 0 ? 'No models detected' :
                            'Select a model' }}</option>
                        <option v-for="m in chatSettings.availableModels" :key="m.name" :value="m.name">
                            {{ m.name }} ({{ formatModelSize(m.size) }})
                        </option>
                    </select>
                    <p v-if="chatSettings.availableModels.length === 0 && !chatSettings.modelLoadError"
                        class="text-xs mt-1" style="color: var(--text-tertiary);">
                        Click the
                        <svg class="inline-block -mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5.636 18.364a9 9 0 0 1 0-12.728" />
                            <path d="M18.364 5.636a9 9 0 0 1 0 12.728" />
                            <path d="M8.464 15.536a5 5 0 0 1 0-7.072" />
                            <path d="M15.536 8.464a5 5 0 0 1 0 7.072" />
                            <circle cx="12" cy="12" r="1" fill="currentColor" />
                        </svg>
                        button after starting Ollama
                    </p>
                </div>
            </template>

            <!-- ══ Backend providers (OpenAI / Anthropic / Gemini) ════════════ -->
            <template v-else>
                <p class="text-xs -mt-2" style="color: var(--text-tertiary);">
                    Your API key is encrypted and stored on the server — it is never exposed in the browser after
                    saving.
                </p>

                <!-- Key status -->
                <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium" style="color: var(--text-primary);">API key</label>

                    <!-- Existing key badge -->
                    <div v-if="currentKeyInfo" class="flex items-center gap-2">
                        <div class="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs"
                            style="background: var(--color-success-50, #f0fdf4); border-color: var(--color-success-200, #bbf7d0); color: var(--color-success-700, #15803d);">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path
                                    d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 011.52 0C14.51 3.81 17 5 19 5a1 1 0 011 1z" />
                                <polyline points="9 12 11 14 15 10" />
                            </svg>
                            Key saved — ends in
                            <code
                                style="font-family: var(--font-mono); font-size: 11px;">…{{ currentKeyInfo.keyHint }}</code>
                        </div>
                        <button type="button" @click="handleDeleteKey"
                            class="px-3 py-2 text-xs rounded-lg border transition-colors duration-150"
                            style="color: var(--color-danger-600, #dc2626); border-color: var(--border-default); background: var(--bg-card);"
                            onmouseenter="this.style.background='var(--color-danger-50,#fef2f2)'"
                            onmouseleave="this.style.background='var(--bg-card)'">
                            Remove
                        </button>
                    </div>

                    <!-- Key input (new or replace) -->
                    <div class="flex gap-2">
                        <input v-model="newApiKey" type="password"
                            :placeholder="currentKeyInfo ? 'Paste new key to replace…' : (provider === 'openai' ? 'sk-…' : provider === 'anthropic' ? 'sk-ant-…' : 'AIza…')"
                            autocomplete="new-password"
                            class="flex-1 px-3 py-2 text-sm rounded-lg border transition-colors duration-150 outline-none bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] border-[var(--border-default)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-blue-500/20"
                            @keydown.enter="handleSaveKey" />
                        <button type="button" :disabled="!newApiKey.trim() || isSavingKey" @click="handleSaveKey"
                            class="px-4 py-2 text-xs font-medium rounded-lg transition-all duration-150 disabled:opacity-50"
                            style="background: var(--color-primary, #3b82f6); color: white;">
                            <span v-if="isSavingKey">Saving…</span>
                            <span v-else-if="keySuccess">Saved ✓</span>
                            <span v-else>{{ currentKeyInfo ? 'Replace' : 'Save' }}</span>
                        </button>
                    </div>

                    <div v-if="keyError || aiKeys.error" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                        style="background: var(--color-danger-50); color: var(--color-danger-700);">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
                        </svg>
                        {{ keyError ?? aiKeys.error }}
                    </div>
                </div>

                <!-- Model selector -->
                <div>
                    <label class="text-sm font-medium block mb-1.5" style="color: var(--text-primary);">Model</label>
                    <select :value="customModelMode ? '__custom__' : draftModel" @change="(e) => {
                        const v = (e.target as HTMLSelectElement).value;
                        if (v === '__custom__') {
                            customModelMode = true;
                            draftModel = '';
                        } else {
                            customModelMode = false;
                            draftModel = v;
                        }
                    }" class="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors duration-150"
                        style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);">
                        <option value="" disabled>Select a model</option>
                        <option v-for="m in backendModels" :key="m" :value="m">{{ m }}</option>
                        <option value="__custom__">Custom model…</option>
                    </select>
                    <input v-if="customModelMode" :value="draftModel"
                        @input="draftModel = ($event.target as HTMLInputElement).value"
                        placeholder="Enter model name (e.g. gpt-4o-2024-11-20)"
                        class="mt-2 w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors duration-150 bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] border-[var(--border-default)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-blue-500/20" />
                </div>
            </template>

            <!-- ══ Shared settings ═════════════════════════════════════════════ -->

            <!-- ── Context window slider ───────────────────────────────────── -->
            <div class="flex flex-col gap-2">
                <div class="flex items-baseline justify-between">
                    <label for="context-slider" class="text-sm font-medium" style="color: var(--text-primary);">Fenêtre
                        de
                        contexte</label>
                    <span class="text-sm font-semibold tabular-nums" style="color: var(--color-primary);">{{
                        fmtTokens(draftContextSize) }}</span>
                </div>
                <input id="context-slider" type="range" min="0" max="1000" :value="sliderPosition"
                    @input="sliderPosition = Number(($event.target as HTMLInputElement).value)"
                    class="w-full h-2 rounded-full cursor-pointer appearance-none"
                    style="accent-color: var(--color-primary);" />
                <p class="text-xs" style="color: var(--text-tertiary);">
                    <template v-if="draftModel && MODEL_CONTEXT_LIMITS[draftModel]">
                        Maximum pour <strong class="font-medium" style="color: var(--text-secondary);">{{ draftModel
                            }}</strong> : {{ fmtTokens(maxContextSize) }}
                    </template>
                    <template v-else>
                        Maximum (par défaut) : {{ fmtTokens(maxContextSize) }}
                    </template>
                </p>
            </div>

            <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium" style="color: var(--text-primary);">
                    System prompt <span class="font-normal" style="color: var(--text-tertiary);">(optional)</span>
                </label>
                <textarea :value="draftSystemPrompt"
                    @input="draftSystemPrompt = ($event.target as HTMLTextAreaElement).value"
                    placeholder="You are a helpful assistant with access to MCP tools..." rows="3"
                    class="w-full px-3 py-2 text-sm rounded-lg border outline-none resize-y transition-colors duration-150"
                    style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default); font-family: var(--font-sans);" />
                <p class="text-xs" style="color: var(--text-tertiary);">Injected as the system message before every
                    conversation</p>
            </div>

            <!-- ══ Save button ════════════════════════════════════════════════ -->
            <div class="flex items-center justify-end gap-3 pt-3 mt-1 border-t"
                style="border-color: var(--border-default);">
                <span v-if="isDirty" class="text-xs" style="color: var(--color-warning-600, #d97706);">Unsaved
                    changes</span>
                <button type="button" @click="handleSaveConfig"
                    class="px-4 py-2 text-xs font-medium rounded-lg transition-all duration-150"
                    style="background: var(--color-primary, #3b82f6); color: white;">
                    <span v-if="configSaved">Saved ✓</span>
                    <span v-else>Save configuration</span>
                </button>
            </div>

        </div>
    </div>
</template>
