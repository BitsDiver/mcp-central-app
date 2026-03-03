<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { ChevronRight, Check, Copy } from 'lucide-vue-next';
  import type { ChatToolCall } from '@/types';

  const props = defineProps<{ toolCall: ChatToolCall; }>();

  const expanded = ref(false);

  const statusInfo = computed(() => {
    const s = props.toolCall.status;
    const map = {
      pending: { label: 'Pending', cls: 'node--pending' },
      running: { label: 'Running', cls: 'node--running' },
      success: { label: 'Done', cls: 'node--success' },
      error: { label: 'Error', cls: 'node--error' },
    } as const;
    return map[s as keyof typeof map] ?? map.pending;
  });

  const argsText = computed(() => {
    if (!props.toolCall.args) return '{}';
    // Always pretty-print; args should already be an object but guard anyway.
    try {
      return typeof props.toolCall.args === 'string'
        ? JSON.stringify(JSON.parse(props.toolCall.args), null, 2)
        : JSON.stringify(props.toolCall.args, null, 2);
    } catch {
      return String(props.toolCall.args);
    }
  });

  const resultText = computed(() => {
    if (props.toolCall.error) return props.toolCall.error;
    if (props.toolCall.result === undefined) return null;
    if (typeof props.toolCall.result === 'string') {
      // Try to parse + re-indent strings that happen to be JSON.
      try { return JSON.stringify(JSON.parse(props.toolCall.result), null, 2); } catch { /* not JSON */ }
      return props.toolCall.result;
    }
    return JSON.stringify(props.toolCall.result, null, 2);
  });

  const copiedArgs = ref(false);
  const copiedResult = ref(false);

  async function copyToClipboard(text: string, flag: 'args' | 'result') {
    try {
      await navigator.clipboard.writeText(text);
      if (flag === 'args') { copiedArgs.value = true; setTimeout(() => (copiedArgs.value = false), 1500); }
      else { copiedResult.value = true; setTimeout(() => (copiedResult.value = false), 1500); }
    } catch { /* clipboard blocked */ }
  }
</script>

<template>
  <!-- Timeline node wrapper -->
  <div :class="['tool-node', statusInfo.cls]">
    <!-- Status dot (rail drawn by parent .tool-timeline via CSS) -->
    <span class="tool-node-dot">
      <span v-if="toolCall.status === 'running'" class="dot-spin" />
    </span>

    <!-- Header row -->
    <button type="button" class="tool-node-header" @click="expanded = !expanded">
      <span class="tool-node-name">{{ toolCall.name }}</span>
      <span :class="['tool-node-status', statusInfo.cls]">{{ statusInfo.label }}</span>
      <!-- Chevron -->
      <ChevronRight class="tool-node-chevron" :class="{ 'tool-node-chevron--open': expanded }" :size="11"
        :stroke-width="2.5" />
    </button>

    <!-- Expanded body -->
    <div v-if="expanded" class="tool-node-body">
      <!-- Arguments -->
      <div class="tool-section">
        <div class="tool-section-hdr">
          <span class="tool-section-lbl">Arguments</span>
          <button type="button" class="copy-btn" title="Copy arguments" @click.stop="copyToClipboard(argsText, 'args')">
            <Check v-if="copiedArgs" :size="12" stroke="var(--color-success-500)" :stroke-width="2.5" />
            <Copy v-else :size="12" :stroke-width="2" />
          </button>
        </div>
        <pre class="tool-code">{{ argsText }}</pre>
      </div>

      <!-- Result / Error -->
      <div v-if="resultText !== null" class="tool-section">
        <div class="tool-section-hdr">
          <span class="tool-section-lbl">{{ toolCall.error ? 'Error' : 'Result' }}</span>
          <button type="button" class="copy-btn" title="Copy result"
            @click.stop="copyToClipboard(resultText!, 'result')">
            <Check v-if="copiedResult" :size="12" stroke="var(--color-success-500)" :stroke-width="2.5" />
            <Copy v-else :size="12" :stroke-width="2" />
          </button>
        </div>
        <p v-if="toolCall.error" class="tool-error-text">{{ resultText }}</p>
        <pre v-else class="tool-code">{{ resultText }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>

  /* ── Timeline node ─────────────────────────────────────────────── */
  .tool-node {
    position: relative;
    display: flex;
    flex-direction: column;
    padding-left: 20px;
    margin-bottom: 4px;
  }

  /* Vertical rail - parent ChatMessage wraps these in .tool-timeline */
  .tool-node::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 16px;
    bottom: -4px;
    width: 1.5px;
    background: var(--border-default);
    border-radius: 1px;
  }

  .tool-node:last-child::before {
    display: none;
  }

  /* Status dot */
  .tool-node-dot {
    position: absolute;
    left: 0;
    top: 7px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 1.5px solid var(--border-strong);
    background: var(--bg-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }

  .node--pending .tool-node-dot {
    background: var(--bg-muted);
    border-color: var(--border-default);
  }

  .node--running .tool-node-dot {
    border-color: var(--color-primary-400);
    background: color-mix(in srgb, var(--color-primary-400) 15%, var(--bg-surface));
  }

  .node--success .tool-node-dot {
    background: var(--color-success-500, #22c55e);
    border-color: var(--color-success-500, #22c55e);
  }

  .node--error .tool-node-dot {
    background: var(--color-danger-500);
    border-color: var(--color-danger-500);
  }

  /* Spinning ring inside running dot */
  .dot-spin {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    border: 1.5px solid var(--color-primary-400);
    border-top-color: transparent;
    animation: dot-rotate 0.7s linear infinite;
  }

  @keyframes dot-rotate {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Header row ──────────────────────────────────────────────── */
  .tool-node-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    padding: 4px 6px 4px 2px;
    border-radius: var(--radius-sm);
    transition: background 0.1s ease;
  }

  .tool-node-header:hover {
    background: var(--bg-hover);
  }

  .tool-node-name {
    font-size: 12px;
    font-weight: 600;
    font-family: var(--font-mono, monospace);
    color: var(--text-primary);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Inline status label */
  .tool-node-status {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;
  }

  .node--pending .tool-node-status {
    color: var(--text-tertiary);
  }

  .node--running .tool-node-status {
    color: var(--color-primary-500);
  }

  .node--success .tool-node-status {
    color: var(--color-success-600, #16a34a);
  }

  .node--error .tool-node-status {
    color: var(--color-danger-500);
  }

  /* Chevron */
  .tool-node-chevron {
    color: var(--text-tertiary);
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }

  .tool-node-chevron--open {
    transform: rotate(90deg);
  }

  /* ── Body (args + result) ────────────────────────────────────── */
  .tool-node-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 6px 4px 8px;
  }

  .tool-section-hdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .tool-section-lbl {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-tertiary);
  }

  .copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    border-radius: 3px;
    color: var(--text-tertiary);
    transition: color 0.12s ease, background 0.12s ease;
  }

  .copy-btn:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .tool-code {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    color: var(--text-secondary);
    background: var(--bg-muted);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    padding: 7px 9px;
    margin: 0;
    /* Args: compact. Result can be huge — give it more room and always scroll. */
    max-height: 240px;
    overflow-y: auto;
    overflow-x: hidden;
    white-space: pre-wrap;
    word-break: break-word;
    scrollbar-width: thin;
    scrollbar-color: var(--border-default) transparent;
  }

  /* Wider result panel for potentially large payloads */
  .tool-section:last-child .tool-code {
    max-height: 320px;
  }

  .tool-error-text {
    font-size: 12px;
    color: var(--color-danger-500);
    font-family: var(--font-mono, monospace);
    margin: 0;
  }
</style>
