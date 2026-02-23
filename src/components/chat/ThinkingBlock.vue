<script setup lang="ts">
import { ref } from 'vue'
import { renderMarkdown } from '@/composables/useMarkdown'

defineProps<{
  content: string
}>()

const expanded = ref(false)
</script>

<template>
  <div class="thinking-block">
    <button
      type="button"
      class="thinking-toggle"
      @click="expanded = !expanded"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        :style="{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }"
      >
        <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Thinking</span>
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
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 8px;
  background: var(--bg-muted);
}

.thinking-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  text-align: left;
  transition: color 0.12s ease;
}

.thinking-toggle:hover {
  color: var(--text-secondary);
}

.thinking-dots {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  margin-left: 2px;
}

.thinking-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 1.4s ease-in-out infinite;
}

.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulse {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

.thinking-content {
  padding: 8px 12px 10px;
  border-top: 1px solid var(--border-default);
}

.thinking-markdown {
  font-size: 12px;
  font-style: italic;
  color: var(--text-tertiary);
}
</style>
