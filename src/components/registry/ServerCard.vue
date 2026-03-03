<script setup lang="ts">
  import type { RegistryServer } from '@/data/mcpRegistry';
  import { Check, Plus, Github } from 'lucide-vue-next';

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
    <!-- Icon: remote image or colour+letters fallback -->
    <img v-if="server.iconUrl" :src="server.iconUrl" alt=""
      class="w-10 h-10 rounded-xl object-contain shrink-0 mt-0.5" />
    <div v-else
      class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5"
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
            <Check :size="11" :stroke-width="2.5" />
            Installed!
          </span>
          <!-- Already added -->
          <span v-else-if="added" class="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg"
            style="background: rgba(34,197,94,.08); color: #16a34a; border: 1px solid rgba(34,197,94,.2);">
            <Check :size="11" :stroke-width="2.5" />
            Installed
          </span>
          <!-- Install button -->
          <button v-else @click="$emit('add')"
            class="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all bg-blue-500 hover:bg-blue-600 active:scale-95 text-white">
            <Plus :size="11" :stroke-width="2.5" />
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
          <Github :size="11" fill="currentColor" :stroke-width="0" />
          Docs
        </a>
      </div>
    </div>
  </div>
</template>
