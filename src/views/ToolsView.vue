<script setup lang="ts">
  import { onMounted } from 'vue';
  import AppLayout from '@/components/layout/AppLayout.vue';
  import ToolList from '@/components/tools/ToolList.vue';
  import { useToolStore } from '@/stores/tools';

  const toolStore = useToolStore();

  onMounted(async () => {
    if (toolStore.tools.length === 0) await toolStore.load();
  });
</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold" style="color: var(--text-primary);">Tools</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            {{ toolStore.count }} aggregated tool{{ toolStore.count !== 1 ? 's' : '' }} from MCP servers
          </p>
        </div>
        <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
          style="background: var(--color-primary-subtle, rgba(99,102,241,.12)); color: var(--color-primary, #6366f1);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" fill="var(--bg-card, #fff)" />
          </svg>
          {{ toolStore.count }} total
        </span>
      </div>

      <ToolList />

    </div>
  </AppLayout>
</template>
