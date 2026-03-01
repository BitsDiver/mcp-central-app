<script setup lang="ts">
  import { ref } from 'vue';
  import { renderMarkdown } from '@/composables/useMarkdown';

  defineProps<{
    content: string;
  }>();

  const expanded = ref(false);
</script>

<template>
  <div class="thinking-block" :class="{ 'thinking-expanded': expanded }">
    <button type="button" class="thinking-toggle" @click="expanded = !expanded">
      <svg class="thinking-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" :style="{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }">
        <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="thinking-label">Thinking</span>
      <span class="thinking-dots" v-if="!content">
        <span /><span /><span />
      </span>
    </button>
    <div v-if="expanded && content" class="thinking-content">
      <div class="markdown-body thinking-markdown" v-html="renderMarkdown(content)" />
    </div>
  </div>
</template>

<style scoped>
  .thinking-block {
    border-left: 2px solid var(--border-default);
    margin: 4px 0 8px 2px;
    padding-left: 0;
    transition: border-color 0.15s ease;
  }

  .thinking-block.thinking-expanded {
    border-color: color-mix(in srgb, var(--color-primary-500) 40%, var(--border-default));
  }

  .thinking-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
    text-align: left;
    transition: color 0.12s ease;
    border-radius: var(--radius-sm);
  }

  .thinking-toggle:hover {
    color: var(--text-secondary);
    background: var(--bg-hover);
  }

  .thinking-chevron {
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }

  .thinking-label {
    font-style: italic;
    letter-spacing: 0.01em;
  }

  .thinking-dots {
    display: inline-flex;
    gap: 2px;
    align-items: center;
    margin-left: 1px;
  }

  .thinking-dots span {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: currentColor;
    animation: pulse 1.4s ease-in-out infinite;
  }

  .thinking-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .thinking-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes pulse {

    0%,
    80%,
    100% {
      opacity: 0.25;
    }

    40% {
      opacity: 0.8;
    }
  }

  .thinking-content {
    padding: 6px 12px 8px;
  }

  .thinking-markdown {
    font-size: 12px;
    font-style: italic;
    color: var(--text-tertiary);
    line-height: 1.6;
  }

  .thinking-markdown :deep(p) {
    margin: 0.3em 0;
  }

  .thinking-markdown :deep(code) {
    font-style: normal;
    font-size: 11px;
  }
</style>
