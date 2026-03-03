<script setup lang="ts">
  import { ref, watch } from 'vue';
  import { Sparkles, ChevronRight } from 'lucide-vue-next';
  import { renderMarkdown } from '@/composables/useMarkdown';

  const props = defineProps<{
    content: string;
    isStreaming?: boolean;
  }>();

  // Auto-expand as soon as content starts arriving or streaming begins.
  // The user can still collapse manually; once collapsed we stop auto-re-opening.
  const expanded = ref(false);
  const userCollapsed = ref(false);

  watch(
    () => [props.isStreaming, props.content] as const,
    ([streaming, content]) => {
      if (!userCollapsed.value && (streaming || content)) {
        expanded.value = true;
      }
    },
    { immediate: true },
  );

  function toggle() {
    expanded.value = !expanded.value;
    // Track if the user explicitly collapsed so we stop auto-reopening.
    if (!expanded.value) userCollapsed.value = true;
    else userCollapsed.value = false;
  }
</script>

<template>
  <div class="thinking-block">
    <button type="button" class="thinking-toggle" @click="toggle">
      <!-- Sparkle / reasoning icon -->
      <Sparkles :size="11" :stroke-width="2" class="thinking-icon" aria-hidden="true" />
      <span class="thinking-label">Reasoning</span>
      <!-- Animated dots while no content yet -->
      <span v-if="!content" class="thinking-dots" aria-hidden="true">
        <span /><span /><span />
      </span>
      <!-- Chevron -->
      <ChevronRight class="thinking-chevron" :class="{ 'thinking-chevron--open': expanded }" :size="11"
        :stroke-width="2.5" />
    </button>

    <div class="thinking-content" :class="{ 'thinking-content--visible': expanded }">
      <!-- Live streaming: plain preformatted so re-renders are cheap -->
      <pre v-if="isStreaming && content" class="thinking-pre">{{ content }}<span class="thinking-cursor" /></pre>
      <!-- Finished: render as markdown -->
      <div v-else-if="!isStreaming && content" class="markdown-body thinking-markdown"
        v-html="renderMarkdown(content)" />
      <!-- Empty placeholder while waiting for first token -->
      <p v-else class="thinking-empty">Waiting for reasoning…</p>
    </div>
  </div>
</template>

<style scoped>
  .thinking-block {
    border-left: 2px solid;
    border-image: linear-gradient(to bottom,
        color-mix(in srgb, var(--color-primary-400) 60%, transparent),
        color-mix(in srgb, var(--color-primary-400) 20%, transparent)) 1;
    padding-left: 0;
    margin: 2px 0 4px;
    transition: border-color 0.2s ease;
  }

  .thinking-toggle {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-tertiary);
    transition: color 0.12s ease, background 0.12s ease;
    border-radius: var(--radius-sm);
  }

  .thinking-toggle:hover {
    color: var(--text-secondary);
    background: var(--bg-hover);
  }

  .thinking-icon {
    flex-shrink: 0;
    color: var(--color-primary-400);
  }

  .thinking-label {
    font-size: 11px;
    font-weight: 500;
    font-style: italic;
    letter-spacing: 0.01em;
  }

  .thinking-chevron {
    flex-shrink: 0;
    transition: transform 0.18s ease;
  }

  .thinking-chevron--open {
    transform: rotate(90deg);
  }

  /* Animated dots */
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
    animation: dot-pulse 1.4s ease-in-out infinite;
  }

  .thinking-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .thinking-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes dot-pulse {

    0%,
    80%,
    100% {
      opacity: 0.25;
    }

    40% {
      opacity: 0.8;
    }
  }

  /* Content panel — animates open */
  .thinking-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.25s ease;
  }

  .thinking-content--visible {
    max-height: 600px;
  }

  .thinking-markdown {
    font-size: 12px;
    font-style: italic;
    color: var(--text-tertiary);
    line-height: 1.6;
    padding: 5px 10px 8px;
  }

  .thinking-markdown :deep(p) {
    margin: 0.3em 0;
  }

  .thinking-markdown :deep(code) {
    font-style: normal;
    font-size: 11px;
  }
</style>
