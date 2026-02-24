<script setup lang="ts">
import { onMounted } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import { useChatSettingsStore } from '@/stores/chatSettings'

const chatSettings = useChatSettingsStore()

onMounted(() => {
  chatSettings.fetchModels()
})

function formatModelSize(bytes: number): string {
  const gb = bytes / 1073741824
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1048576).toFixed(0)} MB`
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 py-6 max-w-xl mx-auto">
    <h2 class="text-base font-semibold mb-1" style="color: var(--text-primary);">AI Settings</h2>
    <p class="text-xs mb-5" style="color: var(--text-tertiary);">Configure your local Ollama server for the Chat page.</p>

    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <label for="ollama-url" class="text-sm font-medium" style="color: var(--text-primary)">Ollama server URL</label>
        <div class="relative flex items-center">
          <input
            id="ollama-url"
            type="text"
            :value="chatSettings.settings.ollamaUrl"
            @input="chatSettings.update({ ollamaUrl: ($event.target as HTMLInputElement).value })"
            placeholder="http://localhost:11434"
            class="w-full pl-3 pr-10 py-2 text-sm rounded-lg border transition-colors duration-150 outline-none bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] border-[var(--border-default)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="button"
            :disabled="chatSettings.isLoadingModels"
            @click="chatSettings.fetchModels()"
            title="Detect models"
            class="absolute right-2 flex items-center justify-center w-6 h-6 rounded transition-colors duration-150 disabled:opacity-40"
            style="color: var(--text-secondary);"
            onmouseenter="this.style.color='var(--text-primary)'"
            onmouseleave="this.style.color='var(--text-secondary)'"
          >
            <svg v-if="!chatSettings.isLoadingModels" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5.636 18.364a9 9 0 0 1 0-12.728"/>
              <path d="M18.364 5.636a9 9 0 0 1 0 12.728"/>
              <path d="M8.464 15.536a5 5 0 0 1 0-7.072"/>
              <path d="M15.536 8.464a5 5 0 0 1 0 7.072"/>
              <circle cx="12" cy="12" r="1" fill="currentColor"/>
            </svg>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          </button>
        </div>
        <p class="text-xs" style="color: var(--text-tertiary)">The base URL of your running Ollama instance</p>
      </div>

      <div v-if="chatSettings.modelLoadError" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style="background: var(--color-danger-50); color: var(--color-danger-700);">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" stroke-linecap="round"/></svg>
        {{ chatSettings.modelLoadError }}
      </div>

      <div>
        <label class="text-sm font-medium block mb-1.5" style="color: var(--text-primary);">Model</label>
        <select
          :value="chatSettings.settings.selectedModel"
          @change="chatSettings.update({ selectedModel: ($event.target as HTMLSelectElement).value })"
          class="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors duration-150"
          style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);"
        >
          <option value="" disabled>{{ chatSettings.availableModels.length === 0 ? 'No models detected' : 'Select a model' }}</option>
          <option v-for="m in chatSettings.availableModels" :key="m.name" :value="m.name">
            {{ m.name }} ({{ formatModelSize(m.size) }})
          </option>
        </select>
        <p v-if="chatSettings.availableModels.length === 0 && !chatSettings.modelLoadError" class="text-xs mt-1" style="color: var(--text-tertiary);">
          Use the
          <svg class="inline-block -mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.636 18.364a9 9 0 0 1 0-12.728"/><path d="M18.364 5.636a9 9 0 0 1 0 12.728"/><path d="M8.464 15.536a5 5 0 0 1 0-7.072"/><path d="M15.536 8.464a5 5 0 0 1 0 7.072"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>
          button after starting Ollama
        </p>
      </div>

      <AppInput
        id="context-size"
        label="Context window size"
        type="number"
        :model-value="String(chatSettings.settings.contextSize)"
        @update:model-value="chatSettings.update({ contextSize: Number($event) })"
        hint="Number of tokens in the context window (e.g. 4096, 8192, 32768)"
        placeholder="8192"
      />

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium" style="color: var(--text-primary);">
          System prompt <span class="font-normal" style="color: var(--text-tertiary);">(optional)</span>
        </label>
        <textarea
          :value="chatSettings.settings.systemPrompt"
          @input="chatSettings.update({ systemPrompt: ($event.target as HTMLTextAreaElement).value })"
          placeholder="You are a helpful assistant with access to MCP tools..."
          rows="3"
          class="w-full px-3 py-2 text-sm rounded-lg border outline-none resize-y transition-colors duration-150"
          style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default); font-family: var(--font-sans);"
        />
        <p class="text-xs" style="color: var(--text-tertiary);">Injected as the system message before every conversation</p>
      </div>
    </div>
  </div>
</template>
