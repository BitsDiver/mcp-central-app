<script setup lang="ts">
  import { computed } from 'vue';
  import { renderMarkdown } from '@/composables/useMarkdown';
  import ThinkingBlock from '@/components/chat/ThinkingBlock.vue';
  import ToolCallBlock from '@/components/chat/ToolCallBlock.vue';
  import PlanBlock from '@/components/chat/PlanBlock.vue';
  import type { ChatMessage } from '@/types';

  const props = defineProps<{
    message: ChatMessage;
    canRetry: boolean;
  }>();

  const emit = defineEmits<{ retry: [userMsgId: string]; }>();

  const isUser = computed(() => props.message.role === 'user');
  const isAssistant = computed(() => props.message.role === 'assistant');
  const isPlan = computed(() => props.message.role === 'plan');

  const renderedContent = computed(() =>
    props.message.content ? renderMarkdown(props.message.content) : '',
  );

</script>

<template>
  <!-- ── User bubble ──────────────────────────────────────────────────── -->
  <div v-if="isUser" class="msg-row msg-row--user">
    <div class="user-bubble">
      <div class="markdown-body user-markdown" v-html="renderMarkdown(message.content)" />
      <!-- Attachments -->
      <div v-if="message.attachments?.length" class="attachment-list">
        <div v-for="att in message.attachments" :key="att.id" class="attachment-item">
          <img v-if="att.type.startsWith('image/')" :src="att.base64" :alt="att.name" class="attachment-image" />
          <template v-else>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-linecap="round" />
              <polyline points="14 2 14 8 20 8" stroke-linecap="round" />
            </svg>
            <span class="attachment-name">{{ att.name }}</span>
          </template>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Plan generating (no plan yet) ─────────────────────────────── -->
  <div v-else-if="isPlan && !message.agentPlan" class="msg-row msg-row--assistant">
    <div class="assistant-avatar" :class="{ 'assistant-avatar--streaming': message.isStreaming }">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
    </div>
    <div class="assistant-body">
      <!-- Thinking block: visible during waking-up / thinking phases -->
      <ThinkingBlock v-if="message.thinking !== undefined" :content="message.thinking ?? ''"
        :is-streaming="message.isStreaming" />

      <div v-if="message.error" class="assistant-error">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>{{ message.error }}</span>
      </div>
      <!-- Streaming: pulse dots + dynamic phase label ("Waking up model…" / "Thinking…" / "Generating plan…") -->
      <span v-else-if="message.isStreaming" class="streaming-dots-row">
        <span class="dot" /><span class="dot" /><span class="dot" />
        <span class="plan-status-label">{{ message.content || 'Waking up model\u2026' }}</span>
      </span>
      <!-- Non-streaming fallback (e.g. planning failed with a text message) -->
      <div v-else-if="renderedContent" class="markdown-body assistant-markdown" v-html="renderedContent" />
    </div>
  </div>

  <!-- ── Plan card ───────────────────────────────────────────────────── -->
  <div v-else-if="isPlan && message.agentPlan" class="msg-row msg-row--assistant">
    <div class="assistant-avatar">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
    </div>
    <div class="assistant-body">
      <PlanBlock :plan="message.agentPlan" :is-streaming="message.isStreaming" />
    </div>
  </div>

  <!-- ── Assistant turn ─────────────────────────────────────────────── -->
  <div v-else-if="isAssistant" class="msg-row msg-row--assistant">
    <div class="assistant-avatar" :class="{ 'assistant-avatar--streaming': message.isStreaming }">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.07 4.93l-1.41 1.41M12 2v2M4.93 4.93l1.41 1.41M2 12h2m14 0h2M4.93 19.07l1.41-1.41M12 20v2m5.66-2.34l-1.41-1.41"
          stroke-linecap="round" />
      </svg>
    </div>

    <div class="assistant-body">
      <!-- Thinking (reasoning) — auto-expands during streaming -->
      <ThinkingBlock v-if="message.thinking !== undefined" :content="message.thinking ?? ''"
        :is-streaming="message.isStreaming" />

      <!-- Tool calls — timeline -->
      <div v-if="message.toolCalls?.length" class="tool-timeline">
        <ToolCallBlock v-for="tc in message.toolCalls" :key="tc.id" :tool-call="tc" />
      </div>

      <!-- Error state -->
      <div v-if="message.error" class="assistant-error">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>{{ message.error }}</span>
      </div>

      <!-- Prose content -->
      <div v-if="renderedContent" class="markdown-body assistant-markdown" v-html="renderedContent" />

      <!-- Streaming cursor (no content yet) -->
      <span v-if="message.isStreaming && !message.content && !message.thinking" class="streaming-dots-row">
        <span class="dot" /><span class="dot" /><span class="dot" />
      </span>
      <span v-else-if="message.isStreaming && !message.content" class="streaming-cursor" />

      <!-- Retry -->
      <button v-if="canRetry" type="button" class="retry-btn" title="Retry from here"
        @click="emit('retry', message.id)">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M1 4v6h6M23 20v-6h-6" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
        Retry
      </button>
    </div>
  </div>
</template>

<style scoped>

  /* ── Row layout ─────────────────────────────────────────── */
  .msg-row {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  .msg-row--user {
    justify-content: flex-end;
  }

  .msg-row--assistant {
    justify-content: flex-start;
    align-items: flex-start;
  }

  /* ── User bubble ────────────────────────────────────────── */
  .user-bubble {
    max-width: min(72%, 640px);
    background: var(--color-primary-600);
    color: #fff;
    padding: 10px 14px;
    border-radius: var(--radius-2xl) var(--radius-2xl) var(--radius-sm) var(--radius-2xl);
    word-break: break-word;
    line-height: 1.6;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }

  [data-theme="dark"] .user-bubble {
    background: var(--color-primary-500);
  }

  .user-bubble :deep(.markdown-body) {
    font-size: 14px;
    line-height: 1.65;
    color: inherit;
  }

  .user-bubble :deep(.markdown-body p:first-child) {
    margin-top: 0;
  }

  .user-bubble :deep(.markdown-body p:last-child) {
    margin-bottom: 0;
  }

  .user-bubble :deep(.markdown-body code) {
    background: rgba(255, 255, 255, 0.18);
    color: inherit;
    padding: 1px 4px;
    border-radius: 3px;
  }

  /* ── Attachments (inside user bubble) ──────────────────── */
  .attachment-list {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 8px;
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

  .attachment-image {
    max-width: 240px;
    max-height: 160px;
    border-radius: var(--radius-sm);
    object-fit: cover;
  }

  .attachment-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: inherit;
    opacity: 0.9;
  }

  /* ── Assistant avatar ───────────────────────────────────── */
  .assistant-avatar {
    width: 26px;
    height: 26px;
    border-radius: var(--radius-full);
    background: var(--bg-muted);
    border: 1px solid var(--border-default);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
    flex-shrink: 0;
    margin-top: 1px;
    transition: border-color 0.2s ease, color 0.2s ease;
  }

  .assistant-avatar--streaming {
    border-color: var(--color-primary-400);
    color: var(--color-primary-500);
  }

  .assistant-avatar--ghost {
    background: transparent;
    border-color: transparent;
  }

  /* ── Assistant body ─────────────────────────────────────── */
  .assistant-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .assistant-markdown {
    font-size: 14px;
    line-height: 1.75;
  }

  .assistant-markdown :deep(p:first-child) {
    margin-top: 0;
  }

  .assistant-markdown :deep(p:last-child) {
    margin-bottom: 0;
  }

  /* ── Tool timeline ─────────────────────────────────────── */
  .tool-timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* ── Error state ────────────────────────────────────────── */
  .assistant-error {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    padding: 9px 12px;
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-danger-500) 8%, var(--bg-surface));
    border: 1px solid color-mix(in srgb, var(--color-danger-500) 25%, var(--border-default));
    color: var(--color-danger-600);
    font-size: 13px;
    line-height: 1.5;
  }

  [data-theme="dark"] .assistant-error {
    color: var(--color-danger-400);
  }

  .assistant-error svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* ── Streaming states ───────────────────────────────────── */
  .streaming-dots-row {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    padding: 4px 0;
  }

  .plan-status-label {
    margin-left: 6px;
    font-size: 11px;
    color: var(--text-tertiary);
    letter-spacing: 0.01em;
  }

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-tertiary);
    animation: dot-bounce 1.2s ease-in-out infinite;
  }

  .dot:nth-child(2) {
    animation-delay: 0.15s;
  }

  .dot:nth-child(3) {
    animation-delay: 0.3s;
  }

  @keyframes dot-bounce {

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

  .streaming-cursor {
    display: inline-block;
    width: 2px;
    height: 15px;
    background: var(--text-secondary);
    margin-left: 2px;
    vertical-align: text-bottom;
    border-radius: 1px;
    animation: cursor-blink 1s step-end infinite;
  }

  @keyframes cursor-blink {

    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0;
    }
  }

  /* ── Retry button ───────────────────────────────────────── */
  .retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: none;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
    transition: all 0.12s ease;
    align-self: flex-start;
  }

  .retry-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-strong);
    background: var(--bg-hover);
  }
</style>