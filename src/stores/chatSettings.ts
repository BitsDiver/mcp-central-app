import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ChatSettings, OllamaModel } from '@/types'

const STORAGE_KEY = 'mcp-chat-settings'

function loadFromStorage(): ChatSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    ollamaUrl: 'http://localhost:11434',
    selectedModel: '',
    contextSize: 8192,
    systemPrompt: '',
  }
}

export const useChatSettingsStore = defineStore('chatSettings', () => {
  const settings = ref<ChatSettings>(loadFromStorage())
  const availableModels = ref<OllamaModel[]>([])
  const isLoadingModels = ref(false)
  const modelLoadError = ref<string | null>(null)

  watch(
    settings,
    (val) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    },
    { deep: true },
  )

  async function fetchModels(): Promise<void> {
    if (!settings.value.ollamaUrl) return
    isLoadingModels.value = true
    modelLoadError.value = null
    try {
      const res = await fetch(`${settings.value.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { models: OllamaModel[] }
      availableModels.value = data.models ?? []
      if (!settings.value.selectedModel && availableModels.value.length > 0) {
        settings.value.selectedModel = availableModels.value[0].name
      }
    } catch (err) {
      modelLoadError.value = err instanceof Error ? err.message : 'Failed to connect to Ollama'
      availableModels.value = []
    } finally {
      isLoadingModels.value = false
    }
  }

  function update(patch: Partial<ChatSettings>): void {
    settings.value = { ...settings.value, ...patch }
  }

  return { settings, availableModels, isLoadingModels, modelLoadError, fetchModels, update }
})
