<script setup lang="ts">
    import { computed } from 'vue';
    import { useChatStore } from '@/stores/chat';
    import { useChatSettingsStore } from '@/stores/chatSettings';
    import type { ChatSession } from '@/types';

    const props = defineProps<{
        session: ChatSession | null;
        visible: boolean;
    }>();

    const chatStore = useChatStore();
    const settingsStore = useChatSettingsStore();

    /** The default system prompt shown as placeholder when no override is set. */
    const defaultPrompt = computed(() => settingsStore.settings.systemPrompt);

    /** True when the user has typed a custom prompt for this session. */
    const isModified = computed(() => !!props.session?.systemPrompt);

    function onInput(e: Event) {
        if (!props.session) return;
        chatStore.setSessionPrompt(props.session.id, (e.target as HTMLTextAreaElement).value);
    }
</script>

<template>
    <div v-if="visible" class="session-prompt-bar">
        <div class="prompt-bar-header">
            <label class="session-prompt-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M8 10h8M8 14h5" stroke-linecap="round" />
                </svg>
                Session system prompt
            </label>
            <span v-if="isModified" class="session-prompt-badge">Modified</span>
            <span v-else class="session-prompt-badge session-prompt-badge--default">Default</span>
        </div>
        <textarea :value="session?.systemPrompt ?? ''" :placeholder="defaultPrompt ?? 'No default system prompt set.'"
            rows="3" class="session-prompt-textarea" :class="{ 'is-modified': isModified }" @input="onInput" />
        <p class="prompt-hint">
            Leave empty to use the global system prompt. This prompt is also used in Plan and Agent modes.
        </p>
    </div>
</template>

<style scoped>
    .session-prompt-bar {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 8px 16px 10px;
        border-bottom: 1px solid var(--border-default);
        background: color-mix(in srgb, var(--color-primary-500) 3%, var(--bg-surface));
        flex-shrink: 0;
    }

    .prompt-bar-header {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .session-prompt-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .session-prompt-badge {
        font-size: 10px;
        font-weight: 500;
        text-transform: none;
        letter-spacing: 0;
        padding: 1px 6px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-primary-500) 15%, transparent);
        color: var(--color-primary-500);
    }

    .session-prompt-badge--default {
        background: color-mix(in srgb, var(--text-tertiary) 10%, transparent);
        color: var(--text-tertiary);
    }

    .session-prompt-textarea {
        width: 100%;
        padding: 6px 10px;
        font-size: 13px;
        font-family: var(--font-sans);
        line-height: 1.5;
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        background: var(--bg-input);
        color: var(--text-primary);
        resize: vertical;
        outline: none;
        transition: border-color 0.15s ease;
    }

    .session-prompt-textarea::placeholder {
        color: var(--text-tertiary);
        font-style: italic;
        opacity: 0.7;
    }

    .session-prompt-textarea:focus {
        border-color: var(--border-focus);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .session-prompt-textarea.is-modified {
        border-color: var(--color-primary-400);
    }

    .prompt-hint {
        margin: 0;
        font-size: 11px;
        color: var(--text-tertiary);
        line-height: 1.4;
    }
</style>
