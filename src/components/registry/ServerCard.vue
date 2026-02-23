<script setup lang="ts">
import type { RegistryServer } from '@/data/mcpRegistry'

defineProps<{
  server: RegistryServer
  added: boolean
  adding: boolean
  success: boolean
}>()

defineEmits<{
  add: []
}>()
</script>

<template>
  <div
    class="card p-4 flex gap-3 transition-all"
    :class="added ? '' : 'card-hover'"
  >
    <div
      class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5"
      :style="`background: ${server.color}`"
    >
      {{ server.iconLetters }}
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5 flex-wrap mb-1">
        <span class="text-sm font-semibold" style="color: var(--text-primary);">{{ server.name }}</span>
        <span v-if="server.official" class="badge badge-primary text-[10px] px-1.5 py-0">Official</span>
      </div>
      <p class="text-xs leading-relaxed mb-2.5" style="color: var(--text-secondary);">{{ server.description }}</p>
      <div class="flex items-center gap-2 flex-wrap mb-3">
        <span class="text-[10px] px-1.5 py-0.5 rounded font-mono" style="background: var(--bg-muted); color: var(--text-tertiary);">{{ server.transport }}</span>
        <span
          v-for="tag in (server.tags ?? []).slice(0, 2)"
          :key="tag"
          class="text-[10px] px-1.5 py-0.5 rounded"
          style="background: var(--bg-muted); color: var(--text-tertiary);"
        >{{ tag }}</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="!added"
          @click="$emit('add')"
          :disabled="adding"
          class="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
          :class="adding ? 'opacity-50 cursor-not-allowed bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'"
        >
          <span v-if="adding" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin-smooth"></span>
          <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          {{ adding ? 'Adding…' : 'Add to endpoints' }}
        </button>
        <span v-else-if="success" class="text-xs text-green-500 font-medium flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Added!
        </span>
        <span v-else class="text-xs flex items-center gap-1" style="color: var(--text-tertiary);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Already added
        </span>
        <a
          v-if="server.githubUrl"
          :href="server.githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs flex items-center gap-1 transition-colors ml-auto"
          style="color: var(--text-tertiary);"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          Docs
        </a>
      </div>
    </div>
  </div>
</template>
