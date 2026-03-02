<script setup lang="ts">
  import { ref } from 'vue';
  import AppButton from '@/components/ui/AppButton.vue';
  import AIClientInstallModal from '@/components/dashboard/AIClientInstallModal.vue';

  const showModal = ref(false);
</script>

<template>
  <AppButton variant="primary" size="md" @click="showModal = true">
    <!-- puzzle-piece / integration icon -->
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.5 11H19V7a2 2 0 00-2-2h-4V3.5a2.5 2.5 0 00-5 0V5H4a2 2 0 00-2 2v3.8h1.5a2.5 2.5 0 010 5H2V20a2 2 0 002 2h3.8v-1.5a2.5 2.5 0 015 0V22H17a2 2 0 002-2v-4h1.5a2.5 2.5 0 000-5z" />
    </svg>
    Install in AI client
  </AppButton>

  <AIClientInstallModal :open="showModal" @close="showModal = false" />
</template>
