<script setup lang="ts">
import { onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppToggle from '@/components/ui/AppToggle.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'
import { useChatSettingsStore } from '@/stores/chatSettings'

const authStore = useAuthStore()
const { isDark, toggle } = useDarkMode()
const chatSettings = useChatSettingsStore()

onMounted(() => {
  chatSettings.fetchModels()
})

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(date))
}

function formatModelSize(bytes: number): string {
  const gb = bytes / 1073741824
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1048576).toFixed(0)} MB`
}
</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-2xl mx-auto">
      <h1 class="text-xl font-semibold mb-6" style="color: var(--text-primary);">Settings</h1>

      <div class="card p-5 mb-4">
        <h2 class="text-sm font-semibold mb-4" style="color: var(--text-primary);">Profile</h2>
        <dl class="flex flex-col gap-3">
          <div class="flex items-center justify-between py-2 border-b" style="border-color: var(--border-default);">
            <dt class="text-sm" style="color: var(--text-secondary);">Name</dt>
            <dd class="text-sm font-medium" style="color: var(--text-primary);">{{ authStore.user?.name ?? '—' }}</dd>
          </div>
          <div class="flex items-center justify-between py-2 border-b" style="border-color: var(--border-default);">
            <dt class="text-sm" style="color: var(--text-secondary);">Email</dt>
            <dd class="text-sm font-medium" style="color: var(--text-primary);">{{ authStore.user?.email ?? '—' }}</dd>
          </div>
          <div class="flex items-center justify-between py-2 border-b" style="border-color: var(--border-default);">
            <dt class="text-sm" style="color: var(--text-secondary);">Role</dt>
            <dd>
              <span class="badge" :class="authStore.isAdmin ? 'badge-primary' : 'badge-neutral'">
                {{ authStore.user?.role ?? '—' }}
              </span>
            </dd>
          </div>
          <div class="flex items-center justify-between py-2">
            <dt class="text-sm" style="color: var(--text-secondary);">Member since</dt>
            <dd class="text-sm" style="color: var(--text-primary);">{{ authStore.user?.createdAt ? formatDate(authStore.user.createdAt) : '—' }}</dd>
          </div>
        </dl>
      </div>

      <div class="card p-5 mb-4">
        <h2 class="text-sm font-semibold mb-4" style="color: var(--text-primary);">Preferences</h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium" style="color: var(--text-primary);">Dark mode</p>
            <p class="text-xs mt-0.5" style="color: var(--text-tertiary);">Saved automatically in your browser</p>
          </div>
          <AppToggle :model-value="isDark" @update:model-value="toggle" />
        </div>
      </div>

      <div class="card p-5">
        <h2 class="text-sm font-semibold mb-1" style="color: var(--text-primary);">AI Chat</h2>
        <p class="text-xs mb-5" style="color: var(--text-tertiary);">Configure your local Ollama server for the Chat page.</p>

        <div class="flex flex-col gap-4">
          <div class="flex gap-2 items-end">
            <div class="flex-1">
              <AppInput
                id="ollama-url"
                label="Ollama server URL"
                :model-value="chatSettings.settings.ollamaUrl"
                @update:model-value="chatSettings.update({ ollamaUrl: $event })"
                placeholder="http://localhost:11434"
                hint="The base URL of your running Ollama instance"
              />
            </div>
            <AppButton
              variant="secondary"
              size="md"
              :loading="chatSettings.isLoadingModels"
              @click="chatSettings.fetchModels()"
            >
              Detect models
            </AppButton>
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
              Click "Detect models" after starting Ollama
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
            <label class="text-sm font-medium" style="color: var(--text-primary);">System prompt <span class="font-normal" style="color: var(--text-tertiary);">(optional)</span></label>
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
    </div>
  </AppLayout>
</template>
