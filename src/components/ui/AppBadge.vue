<script setup lang="ts">
defineProps<{
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'primary'
}>()
</script>

<template>
  <span :class="['badge', `badge-${variant ?? 'neutral'}`]">
    <slot />
  </span>
</template>
