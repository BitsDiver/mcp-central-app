<script setup lang="ts">
defineProps<{
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <span
    :class="[
      'inline-block rounded-full border-2 border-current border-t-transparent animate-spin-smooth',
      { sm: 'w-3 h-3', md: 'w-5 h-5', lg: 'w-8 h-8' }[size ?? 'md'],
    ]"
    aria-label="Loading"
    role="status"
  />
</template>
