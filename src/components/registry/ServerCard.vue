<script setup lang="ts">
  import type { RegistryServer } from '@/data/mcpRegistry';

  defineProps<{
    server: RegistryServer;
    added: boolean;
    adding: boolean;
    success: boolean;
  }>();

  defineEmits<{
    add: [];
  }>();
</script>

<template>
  <div class="card p-4 flex gap-3 transition-all" :class="added ? '' : 'card-hover'">
    <!-- Color icon -->
    <div class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5"
      :style="`background: ${server.color}`">
      {{ server.iconLetters }}
    </div>

    <div class="flex-1 min-w-0">
      <!-- Top row: name + badges + install action -->
      <div class="flex items-start justify-between gap-2 mb-1.5">
        <div class="flex items-center gap-1.5 flex-wrap min-w-0">
          <span class="text-sm font-semibold leading-tight" style="color: var(--text-primary);">{{ server.name }}</span>
          <span v-if="server.official" class="badge badge-primary text-[10px] px-1.5 py-0">Official</span>
        </div>
        <!-- Install / Installed indicator -->
        <div class="shrink-0 mt-0.5">
          <!-- Installing spinner -->
          <span v-if="adding"
            class="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg opacity-70 bg-blue-500 text-white">
            <span class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin-smooth"></span>
            Installing…
          </span>
          <!-- Just installed flash -->
          <span v-else-if="success"
            class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
            style="background: rgba(34,197,94,.15); color: #16a34a;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            Installed!
          </span>
          <!-- Already added -->
          <span v-else-if="added" class="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg"
            style="background: rgba(34,197,94,.08); color: #16a34a; border: 1px solid rgba(34,197,94,.2);">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            Installed
          </span>
          <!-- Install button -->
          <button v-else @click="$emit('add')"
            class="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all bg-blue-500 hover:bg-blue-600 active:scale-95 text-white">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Install
          </button>
        </div>
      </div>

      <!-- Description -->
      <p class="text-xs leading-relaxed mb-2.5" style="color: var(--text-secondary);">{{ server.description }}</p>

      <!-- Footer: transport + tags + github -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style="background: var(--bg-muted); color: var(--text-tertiary);">{{ server.transport }}</span>
          <span v-for="tag in (server.tags ?? []).slice(0, 2)" :key="tag" class="text-[10px] px-1.5 py-0.5 rounded"
            style="background: var(--bg-muted); color: var(--text-tertiary);">{{ tag }}</span>
        </div>
        <a v-if="server.githubUrl" :href="server.githubUrl" target="_blank" rel="noopener noreferrer"
          class="text-[11px] flex items-center gap-1 transition-colors shrink-0 hover:underline"
          style="color: var(--text-tertiary);">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Docs
        </a>
      </div>
    </div>
  </div>
</template>
