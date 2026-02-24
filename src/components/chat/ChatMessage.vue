<script setup lang="ts">
  import { computed } from 'vue';
  import type { ChatMessage } from '@/types';
  import { renderMarkdown } from '@/composables/useMarkdown';
  import ThinkingBlock from './ThinkingBlock.vue';
  import ToolCallBlock from './ToolCallBlock.vue';

  const props = defineProps<{
    message: ChatMessage;
    /** True when this user message was immediately followed by a failed generation */
    canRetry?: boolean;
  }>();

  const emit = defineEmits<{
    retry: [messageId: string];
  }>();

  const isUser = computed(() => props.message.role === 'user');
  const isTool = computed(() => props.message.role === 'tool');
  const isError = computed(() => !!props.message.error);

  const formattedTime = computed(() => {
    return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(props.message.createdAt),
    );
  });

  const hasAttachments = computed(() => (props.message.attachments?.length ?? 0) > 0);
  const hasThinking = computed(() => !!props.message.thinking);
  const hasToolCalls = computed(() => (props.message.toolCalls?.length ?? 0) > 0);
  const hasContent = computed(() => !!props.message.content || props.message.isStreaming);
</script>

<template>
  <!-- Tool call messages — full-width, dashed border -->
  <div v-if="isTool" class="tool-wrapper">
    <div class="bubble-tool">
      <ToolCallBlock v-for="tc in message.toolCalls" :key="tc.id" :tool-call="tc" />
    </div>
  </div>

  <!-- User / assistant messages -->
  <div v-else :class="['msg-row', isUser ? 'msg-row--user' : 'msg-row--assistant']">
    <!-- Avatar (assistant only) -->
    <div v-if="!isUser" class="assistant-avatar">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path
          d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3V1m6 2h2a2 2 0 012 2v2m0 0h2m-2 0v6m2 0h-2m0 0v2a2 2 0 01-2 2h-2m0 0H9m6 0v2m-6-2H7a2 2 0 01-2-2v-2M5 11H3m2 0V9M3 13h2m13-2h2m-2 2h2M9 21h6m-6 0v-2m6 2v-2M9 9h6v6H9V9z"
          stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>

    <div class="msg-body">
      <!-- Attachments -->
      <div v-if="hasAttachments" class="attachment-list">
        <div v-for="att in message.attachments" :key="att.id" class="attachment-item">
          <template v-if="att.type.startsWith('image/')">
            <img :src="att.base64" :alt="att.name" class="attachment-image" />
          </template>
          <template v-else>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-linecap="round" />
              <polyline points="14 2 14 8 20 8" stroke-linecap="round" />
            </svg>
            <span class="attachment-name">{{ att.name }}</span>
          </template>
        </div>
      </div>

      <!-- Bubble -->
      <div :class="['bubble', isUser ? 'bubble--user' : 'bubble--assistant', isError ? 'bubble--error' : '']">
        <ThinkingBlock v-if="hasThinking || (message.isStreaming && !message.content && !isUser)"
          :content="message.thinking ?? ''" />

        <!-- Error state -->
        <div v-if="isError" class="error-content">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            class="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
          </svg>
          <span>{{ message.error }}</span>
        </div>

        <!-- Normal content -->
        <template v-else-if="hasContent">
          <div v-if="isUser" class="markdown-body user-markdown" v-html="renderMarkdown(message.content)" />
          <div v-else>
            <div class="markdown-body assistant-markdown" v-html="renderMarkdown(message.content)" />
            <span v-if="message.isStreaming" class="streaming-cursor" />
          </div>
        </template>

        <!-- Loading dots -->
        <p v-else-if="!hasThinking && message.isStreaming" class="streaming-placeholder">
          <span class="streaming-dots"><span /><span /><span /></span>
        </p>

        <p class="msg-time">{{ formattedTime }}</p>
      </div>

      <!-- Retry button (under the user message that preceded a failed generation) -->
      <div v-if="isUser && canRetry" class="retry-row">
        <button type="button" class="retry-btn" @click="emit('retry', message.id)">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M1 4v6h6M23 20v-6h-6" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
          Retry
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>

  /* ── Tool messages ────────────────────────────────────────────── */
  .tool-wrapper {
    padding: 2px 0;
  }

  .bubble-tool {
    background: var(--bg-muted);
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-md);
    padding: 8px 12px;
  }

  /* ── Row layout ───────────────────────────────────────────────── */
  .msg-row {
    display: flex;
    gap: 10px;
    padding: 2px 0;
  }

  .msg-row--user {
    flex-direction: row-reverse;
  }

  .msg-row--assistant {
    flex-direction: row;
    align-items: flex-start;
  }

  /* ── Avatar ───────────────────────────────────────────────────── */
  .assistant-avatar {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--color-primary-500) 10%, var(--bg-surface));
    color: var(--color-primary-500);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 3px;
    border: 1px solid color-mix(in srgb, var(--color-primary-500) 18%, transparent);
  }

  [data-theme="dark"] .assistant-avatar {
    background: rgba(59, 130, 246, 0.12);
    color: var(--color-primary-400);
    border-color: rgba(59, 130, 246, 0.2);
  }

  /* ── Body column ──────────────────────────────────────────────── */
  .msg-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: min(700px, 90%);
  }

  .msg-row--user .msg-body {
    align-items: flex-end;
  }

  /* ── Bubbles ──────────────────────────────────────────────────── */
  .bubble {
    padding: 10px 14px;
    border-radius: 14px;
    position: relative;
    font-size: 14px;
    line-height: 1.65;
  }

  .bubble--user {
    background: var(--color-primary-500);
    color: white;
    border-bottom-right-radius: 4px;
  }

  [data-theme="dark"] .bubble--user {
    background: var(--color-primary-600, #2563eb);
  }

  .bubble--assistant {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-bottom-left-radius: 4px;
    color: var(--text-primary);
  }

  [data-theme="dark"] .bubble--assistant {
    background: var(--bg-card);
  }

  .bubble--error.bubble--assistant {
    background: var(--color-danger-50, #fef2f2);
    border-color: var(--color-danger-200, #fecaca);
    color: var(--color-danger-700, #b91c1c);
  }

  [data-theme="dark"] .bubble--error.bubble--assistant {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.2);
    color: var(--color-danger-400, #f87171);
  }

  .error-content {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 13px;
  }

  .error-content svg {
    margin-top: 1px;
  }

  /* ── Attachments ──────────────────────────────────────────────── */
  .attachment-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 6px;
  }

  .attachment-item {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-sm);
    padding: 3px 7px;
    font-size: 11px;
  }

  .bubble--assistant .attachment-item {
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

  /* ── Timestamp ────────────────────────────────────────────────── */
  .msg-time {
    font-size: 10px;
    opacity: 0.45;
    margin: 5px 0 0;
    text-align: right;
  }

  /* ── Streaming ────────────────────────────────────────────────── */
  .streaming-cursor {
    display: inline-block;
    width: 2px;
    height: 14px;
    background: currentColor;
    margin-left: 2px;
    vertical-align: text-bottom;
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {

    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0;
    }
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

  .streaming-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .streaming-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes bounce {

    0%,
    80%,
    100% {
      transform: translateY(0);
      opacity: 0.4;
    }

    40% {
      transform: translateY(-4px);
      opacity: 1;
    }
  }

  /* ── Retry ────────────────────────────────────────────────────── */
  .retry-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 2px;
  }

  .retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    font-size: 11px;
    font-weight: 500;
    border-radius: var(--radius-full);
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .retry-btn:hover {
    border-color: var(--color-primary-400);
    color: var(--color-primary-500);
    background: color-mix(in srgb, var(--color-primary-500) 6%, var(--bg-surface));
  }
</style>
