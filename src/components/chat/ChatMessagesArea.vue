<script setup lang="ts">
    import { ref, nextTick, markRaw, type Component } from 'vue';
    import { MessageCircleMore, ClipboardList, Zap, Wrench } from 'lucide-vue-next';
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

    const WELCOME: Record<string, { title: string; sub: string; icon: Component; }> = {
        ask: {
            title: 'Ask anything',
            sub: 'Single-shot answers from your AI model',
            icon: markRaw(MessageCircleMore),
        },
        plan: {
            title: 'Describe a goal',
            sub: 'The AI will decompose it into tasks for your review',
            icon: markRaw(ClipboardList),
        },
        agent: {
            title: 'What would you like to automate?',
            sub: 'Fully autonomous tool loop with your connected MCP servers',
            icon: markRaw(Zap),
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
                <component :is="WELCOME[currentMode()].icon" :size="22" :stroke-width="1.5" />
            </div>
            <p class="empty-title">{{ WELCOME[currentMode()].title }}</p>
            <p class="empty-sub">{{ WELCOME[currentMode()].sub }}</p>
            <div class="empty-chips">
                <span v-if="toolCount > 0" class="chip chip--tools">
                    <Wrench :size="10" :stroke-width="2" />
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
