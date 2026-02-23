<script setup lang="ts">
defineProps<{
  type?: 'error' | 'warning' | 'success' | 'info'
  message?: string
}>()
</script>

<template>
  <div
    v-if="message"
    :class="[
      'flex items-start gap-3 rounded-lg px-4 py-3 text-sm',
      {
        error: 'bg-red-50 text-red-700 border border-red-200',
        warning: 'bg-amber-50 text-amber-700 border border-amber-200',
        success: 'bg-green-50 text-green-700 border border-green-200',
        info: 'bg-blue-50 text-blue-700 border border-blue-200',
      }[type ?? 'error'],
    ]"
  >
    <svg class="shrink-0 mt-0.5 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle v-if="type === 'info' || type === 'success'" cx="12" cy="12" r="10"/>
      <path v-if="type === 'error' || type === 'warning'" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    <span>{{ message }}</span>
  </div>
</template>
