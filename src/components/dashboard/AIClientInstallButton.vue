<script setup lang="ts">
  import { ref } from 'vue';
  import { WandSparkles } from 'lucide-vue-next';
  import AppButton from '@/components/ui/AppButton.vue';
  import AIClientInstallModal from '@/components/dashboard/AIClientInstallModal.vue';

  const showModal = ref(false);
</script>

<template>
  <AppButton variant="primary" size="md" @click="showModal = true">
    <WandSparkles :size="16" :stroke-width="1.75" />
    Connect AI client
  </AppButton>

  <AIClientInstallModal :open="showModal" @close="showModal = false" />
</template>
