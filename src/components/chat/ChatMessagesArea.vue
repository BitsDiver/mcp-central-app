<script setup lang="ts">
    import { ref, nextTick } from 'vue';
    import ChatMessage from '@/components/chat/ChatMessage.vue';
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

    const container = ref<HTMLElement | null>(null);

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
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </div>
            <p class="empty-title">Start a conversation</p>
            <p class="empty-sub">
                <template v-if="toolCount > 0">
                    {{ toolCount }} tool{{ toolCount !== 1 ? 's' : '' }} available
                </template>
                <template v-else>No tools loaded</template>
                <span v-if="selectedModel"> · {{ selectedModel }}</span>
            </p>
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
    }

    .empty-chat {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 40px;
    }

    .empty-icon {
        width: 60px;
        height: 60px;
        border-radius: var(--radius-full);
        background: var(--bg-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-tertiary);
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
    }

    .messages-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-width: 860px;
        width: 100%;
        margin: 0 auto;
    }
</style>
