<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ChatToolCall } from '@/types'
import { renderMarkdown } from '@/composables/useMarkdown'

const props = defineProps<{
  toolCall: ChatToolCall
}>()

const expanded = ref(false)

const statusClass = computed(() => {
  switch (props.toolCall.status) {
    case 'success': return 'badge-success'
    case 'error': return 'badge-danger'
    case 'running': return 'badge-warning'
    default: return 'badge-neutral'
  }
})

const statusLabel = computed(() => {
  switch (props.toolCall.status) {
    case 'success': return 'Done'
    case 'error': return 'Error'
    case 'running': return 'Running...'
    default: return 'Pending'
  }
})

const resultText = computed(() => {
  if (props.toolCall.error) return props.toolCall.error
  if (props.toolCall.result === undefined) return null
  if (typeof props.toolCall.result === 'string') return props.toolCall.result
  return JSON.stringify(props.toolCall.result, null, 2)
})
</script>

<template>
  <div class="tool-call-block">
    <button type="button" class="tool-call-header" @click="expanded = !expanded">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="tool-name">{{ toolCall.name }}</span>
      <span :class="['badge', statusClass, 'ml-auto']">
        <span v-if="toolCall.status === 'running'" class="inline-flex gap-1 items-center">
          <span class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin-smooth" />
          {{ statusLabel }}
        </span>
        <span v-else>{{ statusLabel }}</span>
      </span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        :style="{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }"
      >
        <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div v-if="expanded" class="tool-call-body">
      <div class="tool-section">
        <p class="tool-section-label">Arguments</p>
        <pre class="tool-code">{{ JSON.stringify(toolCall.args, null, 2) }}</pre>
      </div>
      <div v-if="resultText !== null" class="tool-section">
        <p class="tool-section-label">{{ toolCall.error ? 'Error' : 'Result' }}</p>
        <div v-if="toolCall.error" class="tool-error-text">{{ resultText }}</div>
        <div v-else class="markdown-body tool-result-markdown" v-html="renderMarkdown(resultText)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-call-block {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 6px;
  background: var(--bg-muted);
}

.tool-call-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  text-align: left;
  transition: background-color 0.12s ease;
}

.tool-call-header:hover {
  background: var(--bg-hover);
}

.tool-name {
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.tool-call-body {
  border-top: 1px solid var(--border-default);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tool-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  margin: 0 0 4px;
}

.tool-code {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  padding: 8px;
  margin: 0;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.tool-error-text {
  font-size: 12px;
  color: var(--color-danger-600);
  font-family: var(--font-mono);
}

.tool-result-markdown {
  font-size: 12px;
}
</style>
