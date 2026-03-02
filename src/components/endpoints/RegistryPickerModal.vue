<script setup lang="ts">
  import AppModal from '@/components/ui/AppModal.vue';
  import RegistryBrowser from '@/components/registry/RegistryBrowser.vue';
  import type { RegistryServer } from '@/data/mcpRegistry';

  defineProps<{
    open: boolean;
  }>();

  const emit = defineEmits<{
    close: [];
    select: [server: RegistryServer];
  }>();

  function handleSelect(server: RegistryServer) {
    emit('select', server);
    emit('close');
  }
</script>

<template>
  <AppModal :open="open" title="Browse MCP Registry" size="xl" @close="emit('close')">
    <RegistryBrowser compact mode="pick" @select="handleSelect" />
    <template #footer>
      <router-link to="/registry" class="text-xs mr-auto" style="color: var(--text-secondary);"
        @click="emit('close')">View full registry →</router-link>
      <button class="btn btn-secondary text-sm" @click="emit('close')">Close</button>
    </template>
  </AppModal>
</template>
