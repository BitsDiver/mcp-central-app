<script setup lang="ts">
  import { computed } from 'vue';
  import type { ChatMessage } from '@/types';
  import { renderMarkdown } from '@/composables/useMarkdown';
  import ThinkingBlock from './ThinkingBlock.vue';
  import ToolCallBlock from './ToolCallBlock.vue';
  import PlanBlock from './PlanBlock.vue';
  import AgentBlock from './AgentBlock.vue';

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
  const isPlan = computed(() => props.message.role === 'plan');
  const isAgent = computed(() => props.message.role === 'agent');
  const isError = computed(() => !!props.message.error);

  const formattedTime = computed(() => {
    return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(props.message.createdAt),
    );
  });

  const hasAttachments = computed(() => (props.message.attachments?.length ?? 0) > 0);
  const hasThinking = computed(() => !!props.message.thinking);
  const hasContent = computed(() => !!props.message.content || props.message.isStreaming);
</script>

<template>
  <!-- Tool call messages — full-width, dashed border -->
  <div v-if="isTool" class="tool-wrapper">
    <div class="bubble-tool">
      <ToolCallBlock v-for="tc in message.toolCalls" :key="tc.id" :tool-call="tc" />
    </div>
  </div>

  <!-- Plan message — full-width, PlanBlock UI -->
  <div v-else-if="isPlan" class="plan-wrapper">
    <PlanBlock v-if="message.agentPlan" :plan="message.agentPlan" />
    <p v-else class="text-tertiary" style="font-size:12px">Generating plan…</p>
  </div>

  <!-- Agent task update message -->
  <div v-else-if="isAgent" class="agent-wrapper">
    <AgentBlock v-if="message.agentTask" :task="message.agentTask" />
  </div>

  <!-- User / assistant messages -->
  <div v-else :class="['msg-row', isUser ? 'msg-row--user' : 'msg-row--assistant']">
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

      <!-- User bubble (neutral card) -->
      <div v-if="isUser" class="bubble bubble--user">
        <div class="markdown-body user-markdown" v-html="renderMarkdown(message.content)" />
        <p class="msg-time">{{ formattedTime }}</p>
      </div>

      <!-- Assistant area: no bubble, just flowing content -->
      <div v-else class="assistant-content" :class="{ 'assistant-content--error': isError }">
        <ThinkingBlock v-if="hasThinking || (message.isStreaming && !message.content)"
          :content="message.thinking ?? ''" />

        <!-- Error state -->
        <div v-if="isError" class="error-inline">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            class="shrink-0" style="margin-top:1px">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
          </svg>
          <span>{{ message.error }}</span>
        </div>

        <!-- Normal content -->
        <template v-else-if="hasContent">
          <div class="markdown-body assistant-markdown" v-html="renderMarkdown(message.content)" />
          <span v-if="message.isStreaming" class="streaming-cursor" />
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

  /* ── Plan messages ────────────────────────────────────────────── */
  .plan-wrapper {
    padding: 4px 0;
  }

  /* ── Agent task messages ──────────────────────────────────────── */
  .agent-wrapper {
    padding: 2px 0;
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

  /* ── User bubble (neutral card, right-aligned) ───────────────── */
  .bubble {
    padding: 9px 13px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.65;
  }

  .bubble--user {
    background: var(--bg-muted);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    border-bottom-right-radius: 4px;
    max-width: min(560px, 100%);
  }

  [data-theme="dark"] .bubble--user {
    background: #2a2d35;
    border-color: #3a3d45;
  }

  /* ── Assistant content (no bubble, plain text) ────────────────── */
  .assistant-content {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    line-height: 1.7;
    color: var(--text-primary);
    padding: 2px 0;
  }

  /* Error inline chip */
  .error-inline {
    display: inline-flex;
    align-items: flex-start;
    gap: 7px;
    font-size: 13px;
    background: var(--color-danger-50, #fef2f2);
    border: 1px solid var(--color-danger-200, #fecaca);
    color: var(--color-danger-700, #b91c1c);
    border-radius: var(--radius-md);
    padding: 7px 11px;
  }

  [data-theme="dark"] .error-inline {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.22);
    color: var(--color-danger-400, #f87171);
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

  .bubble--user .attachment-item {
    background: rgba(0, 0, 0, 0.06);
  }

  [data-theme="dark"] .bubble--user .attachment-item {
    background: rgba(255, 255, 255, 0.06);
  }

  .assistant-content .attachment-item {
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

  /* ── Markdown body overrides (user bubble) ──────────────── */
  .user-markdown {
    font-size: 14px;
    color: var(--text-primary);
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
