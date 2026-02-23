import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ToastMessage } from '@/types'

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastMessage[]>([])

  function add(
    message: string,
    type: ToastMessage['type'] = 'info',
    duration = 4000
  ): void {
    const id = `toast-${Date.now()}-${Math.random()}`
    toasts.value.push({ id, message, type, duration })

    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
  }

  function remove(id: string): void {
    const idx = toasts.value.findIndex((t) => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  function success(msg: string): void { add(msg, 'success') }
  function error(msg: string): void { add(msg, 'error', 6000) }
  function warning(msg: string): void { add(msg, 'warning') }
  function info(msg: string): void { add(msg, 'info') }

  return { toasts, add, remove, success, error, warning, info }
})
