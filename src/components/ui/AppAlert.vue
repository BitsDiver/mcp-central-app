<script setup lang="ts">
  import { TriangleAlert, Info } from 'lucide-vue-next';
  defineProps<{
    type?: 'error' | 'warning' | 'success' | 'info';
    message?: string;
  }>();
</script>

<template>
  <div v-if="message" :class="[
    'flex items-start gap-3 rounded-lg px-4 py-3 text-sm',
    {
      error: 'bg-red-50 text-red-700 border border-red-200',
      warning: 'bg-amber-50 text-amber-700 border border-amber-200',
      success: 'bg-green-50 text-green-700 border border-green-200',
      info: 'bg-blue-50 text-blue-700 border border-blue-200',
    }[type ?? 'error'],
  ]">
    <TriangleAlert v-if="type === 'error' || type === 'warning'" class="shrink-0 mt-0.5 w-4 h-4" :stroke-width="2" />
    <Info v-else class="shrink-0 mt-0.5 w-4 h-4" :stroke-width="2" />
    <span>{{ message }}</span>
  </div>
</template>
