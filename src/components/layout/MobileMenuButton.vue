<script setup lang="ts">
defineProps<{ open: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    @click="$emit('toggle')"
    class="w-9 h-9 flex items-center justify-center rounded-lg transition-colors lg:hidden"
    style="color: var(--text-secondary);"
    :class="'hover:bg-[var(--bg-hover)]'"
    aria-label="Toggle menu"
  >
    <svg v-if="!open" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 12h18M3 6h18M3 18h18" stroke-linecap="round"/>
    </svg>
    <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  </button>
</template>
