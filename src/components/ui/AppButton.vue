<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none',
      {
        'primary': 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 focus-visible:ring-blue-500',
        'secondary': 'border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
        'ghost': 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
        'danger': 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-500',
      }[variant ?? 'primary'],
      {
        'sm': 'text-xs px-3 py-1.5 rounded-md',
        'md': 'text-sm px-4 py-2',
        'lg': 'text-sm px-5 py-2.5',
      }[size ?? 'md'],
    ]"
  >
    <span v-if="loading" class="animate-spin-smooth w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
    <slot />
  </button>
</template>
