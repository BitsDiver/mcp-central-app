<script setup lang="ts">
    import { useChatStore } from '@/stores/chat';
    import type { ChatSession } from '@/types';

    const props = defineProps<{
        session: ChatSession | null;
        visible: boolean;
    }>();

    const chatStore = useChatStore();

    function onInput(e: Event) {
        if (!props.session) return;
        chatStore.setSessionPrompt(props.session.id, (e.target as HTMLTextAreaElement).value);
    }
</script>

<template>
    <div v-if="visible" class="session-prompt-bar">
        <label class="session-prompt-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M8 10h8M8 14h5" stroke-linecap="round" />
            </svg>
            Session prompt
            <span v-if="session?.systemPrompt" class="session-prompt-badge">overriding global</span>
        </label>
        <textarea :value="session?.systemPrompt ?? ''"
            placeholder="Override the global system prompt for this session only…" rows="2"
            class="session-prompt-textarea" @input="onInput" />
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
    }

    .session-prompt-textarea:focus {
        border-color: var(--border-focus);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
</style>
