<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  icon?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style="background: var(--bg-muted);">
      <slot name="icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-tertiary);">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
      </slot>
    </div>
    <h3 class="text-sm font-semibold mb-1" style="color: var(--text-primary)">{{ title }}</h3>
    <p v-if="description" class="text-sm mb-4 max-w-xs" style="color: var(--text-secondary)">{{ description }}</p>
    <slot />
  </div>
</template>
