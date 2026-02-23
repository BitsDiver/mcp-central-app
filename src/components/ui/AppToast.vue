<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import type { ToastMessage } from '@/types'

const toastStore = useToastStore()

const icons: Record<ToastMessage['type'], string> = {
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}

const colors: Record<ToastMessage['type'], string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="card pointer-events-auto flex items-start gap-3 px-4 py-3 cursor-pointer shadow-lg animate-slide-in-right"
          @click="toastStore.remove(toast.id)"
        >
          <svg class="w-5 h-5 shrink-0 mt-0.5" :class="colors[toast.type]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path :d="icons[toast.type]" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p class="text-sm flex-1" style="color: var(--text-primary)">{{ toast.message }}</p>
          <button class="shrink-0 hover:opacity-70 transition-opacity" style="color: var(--text-tertiary);" aria-label="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
