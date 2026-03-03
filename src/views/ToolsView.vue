<script setup lang="ts">
  import { onMounted } from 'vue';
  import AppLayout from '@/components/layout/AppLayout.vue';
  import ToolList from '@/components/tools/ToolList.vue';
  import { useToolStore } from '@/stores/tools';
  import { Settings, FlaskConical } from 'lucide-vue-next';

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
          <h1 class="text-xl font-semibold flex items-center gap-2" style="color: var(--text-primary);">
            <FlaskConical :size="20" :stroke-width="2" />
            Tools
          </h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            {{ toolStore.count }} aggregated tool{{ toolStore.count !== 1 ? 's' : '' }} from MCP servers
          </p>
        </div>
        <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
          style="background: var(--color-primary-subtle, rgba(99,102,241,.12)); color: var(--color-primary, #6366f1);">
          <Settings :size="12" :stroke-width="2" />
          {{ toolStore.count }} total
        </span>
      </div>

      <ToolList />

    </div>
  </AppLayout>
</template>
