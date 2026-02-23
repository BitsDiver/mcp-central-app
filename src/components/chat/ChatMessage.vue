<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '@/types'
import { renderMarkdown } from '@/composables/useMarkdown'
import ThinkingBlock from './ThinkingBlock.vue'
import ToolCallBlock from './ToolCallBlock.vue'

const props = defineProps<{
  message: ChatMessage
}>()

const isUser = computed(() => props.message.role === 'user')
const isTool = computed(() => props.message.role === 'tool')

const formattedTime = computed(() => {
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(props.message.createdAt),
  )
})

const hasAttachments = computed(() => (props.message.attachments?.length ?? 0) > 0)
const hasThinking = computed(() => !!props.message.thinking)
const hasToolCalls = computed(() => (props.message.toolCalls?.length ?? 0) > 0)
const hasContent = computed(() => !!props.message.content || props.message.isStreaming)
</script>

<template>
  <div :class="['message-wrapper', isUser ? 'message-user' : 'message-assistant']">
    <div v-if="!isUser && !isTool" class="assistant-avatar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>

    <div :class="['message-bubble', isUser ? 'bubble-user' : isTool ? 'bubble-tool' : 'bubble-assistant']">
      <div v-if="hasAttachments" class="attachment-list">
        <div
          v-for="att in message.attachments"
          :key="att.id"
          class="attachment-item"
        >
          <template v-if="att.type.startsWith('image/')">
            <img :src="att.base64" :alt="att.name" class="attachment-image" />
          </template>
          <template v-else>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="14 2 14 8 20 8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="attachment-name">{{ att.name }}</span>
          </template>
        </div>
      </div>

      <ThinkingBlock v-if="hasThinking || (message.isStreaming && !message.content && !isUser)" :content="message.thinking ?? ''" />

      <div v-if="isTool && hasToolCalls">
        <ToolCallBlock
          v-for="tc in message.toolCalls"
          :key="tc.id"
          :tool-call="tc"
        />
      </div>

      <div v-if="hasContent">
        <div
          v-if="isUser"
          class="markdown-body user-markdown"
          v-html="renderMarkdown(message.content)"
        />
        <div v-else>
          <div class="markdown-body assistant-markdown" v-html="renderMarkdown(message.content)" />
          <span v-if="message.isStreaming" class="streaming-cursor" />
        </div>
      </div>

      <p v-if="!hasContent && !hasThinking && !isTool && message.isStreaming" class="streaming-placeholder">
        <span class="streaming-dots">
          <span /><span /><span />
        </span>
      </p>

      <p class="message-time">{{ formattedTime }}</p>
    </div>
  </div>
</template>

<style scoped>
.message-wrapper {
  display: flex;
  gap: 10px;
  padding: 4px 0;
}

.message-user {
  flex-direction: row-reverse;
}

.message-assistant {
  flex-direction: row;
  align-items: flex-start;
}

.assistant-avatar {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  background: var(--color-primary-100);
  color: var(--color-primary-600);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

[data-theme="dark"] .assistant-avatar {
  background: rgba(59, 130, 246, 0.15);
  color: var(--color-primary-400);
}

.message-bubble {
  max-width: min(560px, 85%);
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  position: relative;
}

.bubble-user {
  background: var(--color-primary-500);
  color: white;
  border-bottom-right-radius: var(--radius-sm);
}

.bubble-assistant {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-bottom-left-radius: var(--radius-sm);
}

.bubble-tool {
  background: var(--bg-muted);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  width: 100%;
  max-width: 100%;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-sm);
  padding: 3px 6px;
  font-size: 11px;
}

.bubble-assistant .attachment-item {
  background: var(--bg-muted);
}

.attachment-image {
  max-width: 200px;
  max-height: 150px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.attachment-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-time {
  font-size: 10px;
  opacity: 0.5;
  margin: 4px 0 0;
  text-align: right;
}

.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  background: currentColor;
  margin-left: 1px;
  vertical-align: text-bottom;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.streaming-placeholder {
  margin: 2px 0 0;
}

.streaming-dots {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.streaming-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.4;
  animation: bounce 1.2s ease-in-out infinite;
}

.streaming-dots span:nth-child(2) { animation-delay: 0.2s; }
.streaming-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-4px); opacity: 1; }
}
</style>
