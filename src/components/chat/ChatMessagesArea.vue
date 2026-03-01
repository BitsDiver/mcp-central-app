<script setup lang="ts">
    import { ref, nextTick } from 'vue';
    import ChatMessage from '@/components/chat/ChatMessage.vue';
    import { useChatSettingsStore } from '@/stores/chatSettings';
    import type { ChatMessage as ChatMessageType } from '@/types';

    defineProps<{
        messages: ChatMessageType[];
        retryableIds: Set<string>;
        toolCount: number;
        selectedModel: string;
    }>();

    const emit = defineEmits<{
        retry: [userMsgId: string];
    }>();

    const settingsStore = useChatSettingsStore();
    const container = ref<HTMLElement | null>(null);

    const WELCOME: Record<string, { title: string; sub: string; icon: string; }> = {
        ask: {
            title: 'Ask anything',
            sub: 'Single-shot answers from your AI model',
            icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
        },
        plan: {
            title: 'Describe a goal',
            sub: 'The AI will decompose it into tasks for your review',
            icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
        },
        agent: {
            title: 'What would you like to automate?',
            sub: 'Fully autonomous tool loop with your connected MCP servers',
            icon: 'M13 10V3L4 14h7v7l9-11h-7z',
        },
    };

    const currentMode = () => settingsStore.settings.chatMode ?? 'agent';

    function scrollToBottom(smooth = false) {
        nextTick(() => {
            const el = container.value;
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
        });
    }

    defineExpose({ scrollToBottom });
</script>

<template>
    <div ref="container" class="messages-area">
        <div v-if="messages.length === 0" class="empty-chat">
            <div class="empty-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path :d="WELCOME[currentMode()].icon" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </div>
            <p class="empty-title">{{ WELCOME[currentMode()].title }}</p>
            <p class="empty-sub">{{ WELCOME[currentMode()].sub }}</p>
            <div class="empty-chips">
                <span v-if="toolCount > 0" class="chip chip--tools">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path
                            d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
                            stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    {{ toolCount }} tool{{ toolCount !== 1 ? 's' : '' }}
                </span>
                <span v-else class="chip chip--muted">No tools loaded</span>
                <span v-if="selectedModel" class="chip chip--muted">{{ selectedModel }}</span>
            </div>
        </div>

        <div v-else class="messages-list">
            <ChatMessage v-for="msg in messages" :key="msg.id" :message="msg" :can-retry="retryableIds.has(msg.id)"
                @retry="emit('retry', $event)" />
        </div>
    </div>
</template>

<style scoped>
    .messages-area {
        flex: 1;
        overflow-y: auto;
        padding: 20px 16px;
        display: flex;
        flex-direction: column;
        scroll-behavior: smooth;
    }

    /* ── Empty state ──────────────────────────────────────── */
    .empty-chat {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 40px;
        text-align: center;
    }

    .empty-icon {
        width: 52px;
        height: 52px;
        border-radius: var(--radius-full);
        background: var(--bg-muted);
        border: 1px solid var(--border-default);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-primary-400);
        margin-bottom: 4px;
    }

    .empty-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
    }

    .empty-sub {
        font-size: 13px;
        color: var(--text-tertiary);
        margin: 0;
        max-width: 320px;
        line-height: 1.5;
    }

    .empty-chips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 4px;
    }

    .chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 500;
        padding: 3px 8px;
        border-radius: var(--radius-full);
        border: 1px solid var(--border-default);
        background: var(--bg-muted);
        color: var(--text-secondary);
    }

    .chip--tools {
        border-color: color-mix(in srgb, var(--color-primary-500) 30%, var(--border-default));
        color: var(--color-primary-500);
        background: color-mix(in srgb, var(--color-primary-500) 8%, var(--bg-muted));
    }

    .chip--muted {
        color: var(--text-tertiary);
    }

    /* ── Messages list ──────────────────────────────────────── */
    .messages-list {
        display: flex;
        flex-direction: column;
        gap: 18px;
        max-width: 860px;
        width: 100%;
        margin: 0 auto;
    }
</style>
