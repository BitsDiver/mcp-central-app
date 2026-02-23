<script setup lang="ts">
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'

defineProps<{
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <AppModal :open="open" :title="title ?? 'Confirm'" :closable="!loading" @close="emit('cancel')">
    <p class="text-sm" style="color: var(--text-secondary)">{{ message }}</p>
    <template #footer>
      <AppButton variant="secondary" :disabled="loading" @click="emit('cancel')">Cancel</AppButton>
      <AppButton variant="danger" :loading="loading" @click="emit('confirm')">{{ confirmLabel ?? 'Delete' }}</AppButton>
    </template>
  </AppModal>
</template>
