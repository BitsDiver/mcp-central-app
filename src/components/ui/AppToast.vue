<script setup lang="ts">
  import { useToastStore } from '@/stores/toast';
  import type { ToastMessage } from '@/types';
  import { type Component } from 'vue';
  import { CircleCheck, CircleX, TriangleAlert, Info, X } from 'lucide-vue-next';

  const toastStore = useToastStore();

  const icons: Record<ToastMessage['type'], Component> = {
    success: CircleCheck,
    error: CircleX,
    warning: TriangleAlert,
    info: Info,
  };

  const colors: Record<ToastMessage['type'], string> = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  };
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <TransitionGroup name="toast">
        <div v-for="toast in toastStore.toasts" :key="toast.id"
          class="card pointer-events-auto flex items-start gap-3 px-4 py-3 cursor-pointer shadow-lg animate-slide-in-right"
          @click="toastStore.remove(toast.id)">
          <component :is="icons[toast.type]" class="w-5 h-5 shrink-0 mt-0.5" :class="colors[toast.type]"
            :stroke-width="2" />
          <p class="text-sm flex-1" style="color: var(--text-primary)">{{ toast.message }}</p>
          <button class="shrink-0 hover:opacity-70 transition-opacity" style="color: var(--text-tertiary);"
            aria-label="Dismiss">
            <X :size="14" :stroke-width="2.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
