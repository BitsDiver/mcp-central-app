import { ref } from 'vue'
import type { ApiError } from '@/types'
import { useI18n } from 'vue-i18n'

export function useError() {
  const { t, te } = useI18n()

  function resolveMessage(err: unknown): string {
    if (typeof err === 'object' && err !== null) {
      const apiErr = err as ApiError
      if (apiErr.code && te(`errors.${apiErr.code}`)) {
        return t(`errors.${apiErr.code}`)
      }
      if (apiErr.message) return apiErr.message
    }
    if (typeof err === 'string') return err
    return t('errors.ERR_INTERNAL')
  }

  function useFormErrors() {
    const errors = ref<Record<string, string>>({})

    function setFromApiError(err: unknown): void {
      errors.value = {}
      const msg = resolveMessage(err)
      if (typeof err === 'object' && err !== null) {
        const apiErr = err as ApiError
        const code = apiErr.code ?? ''
        if (code.includes('NAME')) {
          errors.value['name'] = msg
        } else if (code.includes('NAMESPACE')) {
          errors.value['namespace'] = msg
        } else if (code.includes('LABEL')) {
          errors.value['label'] = msg
        } else {
          errors.value['_global'] = msg
        }
      }
    }

    function clearErrors(): void {
      errors.value = {}
    }

    return { errors, setFromApiError, clearErrors }
  }

  return { resolveMessage, useFormErrors }
}
