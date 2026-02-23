<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import AppButton from './AppButton.vue'

const props = defineProps<{
  open: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closable?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

function handleKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.closable !== false) {
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', handleKey))
onUnmounted(() => document.removeEventListener('keydown', handleKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-backdrop">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);"
        @mousedown.self="closable !== false && $emit('close')"
      >
        <Transition name="modal-content" appear>
          <div
            v-if="open"
            role="dialog"
            aria-modal="true"
            :class="[
              'card w-full flex flex-col max-h-[90dvh] overflow-hidden',
              {
                sm: 'max-w-sm',
                md: 'max-w-md',
                lg: 'max-w-lg',
                xl: 'max-w-2xl',
              }[size ?? 'md'],
            ]"
            style="box-shadow: var(--shadow-modal);"
          >
            <div v-if="title || closable !== false" class="flex items-center justify-between px-6 py-4 border-b" style="border-color: var(--border-default);">
              <h2 v-if="title" class="text-base font-semibold" style="color: var(--text-primary)">{{ title }}</h2>
              <AppButton
                v-if="closable !== false"
                variant="ghost"
                size="sm"
                class="ml-auto -mr-1"
                @click="$emit('close')"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </AppButton>
            </div>
            <div class="flex-1 overflow-y-auto px-6 py-5">
              <slot />
            </div>
            <div v-if="$slots.footer" class="px-6 py-4 border-t flex items-center justify-end gap-3" style="border-color: var(--border-default);">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
