<script setup lang="ts">
import type { EndpointStatus } from '@/types'

defineProps<{
  status: EndpointStatus
}>()

const labelMap: Record<string, string> = {
  connected: 'Connected',
  connecting: 'Connecting',
  disconnected: 'Disconnected',
  error: 'Error',
}

const variantMap: Record<string, string> = {
  connected: 'badge badge-success',
  connecting: 'badge badge-warning',
  disconnected: 'badge badge-neutral',
  error: 'badge badge-danger',
}
</script>

<template>
  <span :class="variantMap[status] ?? 'badge badge-neutral'" class="inline-flex items-center gap-1.5">
    <span class="status-dot" :class="status" />
    {{ labelMap[status] ?? status }}
  </span>
</template>
