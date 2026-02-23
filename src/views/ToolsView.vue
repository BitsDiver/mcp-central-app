<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useToolStore } from '@/stores/tools'

const toolStore = useToolStore()

onMounted(async () => {
  if (toolStore.tools.length === 0) await toolStore.load()
})

const search = ref('')
const selectedNamespace = ref('')

const namespaces = computed(() => {
  const set = new Set<string>()
  for (const t of toolStore.tools) {
    const parts = t.name.split('__')
    if (parts.length > 1) set.add(parts[0])
  }
  return Array.from(set).sort()
})

const filtered = computed(() => {
  let list = toolStore.tools
  if (selectedNamespace.value) {
    list = list.filter((t) => t.name.startsWith(selectedNamespace.value + '__'))
  }
  const q = search.value.toLowerCase().trim()
  if (q) {
    list = list.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    )
  }
  return list
})
</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold" style="color: var(--text-primary);">Tools</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">{{ toolStore.count }} aggregated tools from all upstream servers</p>
        </div>
        <span class="badge badge-primary text-sm px-3 py-1">{{ toolStore.count }} total</span>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          v-model="search"
          type="search"
          placeholder="Search tools…"
          class="flex-1 max-w-sm px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
          style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);"
        />
        <div class="flex gap-2 flex-wrap">
          <button
            @click="selectedNamespace = ''"
            :class="['badge cursor-pointer transition-colors', !selectedNamespace ? 'badge-primary' : 'badge-neutral hover:bg-[var(--bg-hover)]']"
          >
            All
          </button>
          <button
            v-for="ns in namespaces"
            :key="ns"
            @click="selectedNamespace = ns === selectedNamespace ? '' : ns"
            :class="['badge cursor-pointer transition-colors font-mono', selectedNamespace === ns ? 'badge-primary' : 'badge-neutral hover:bg-[var(--bg-hover)]']"
          >
            {{ ns }}
          </button>
        </div>
      </div>

      <div v-if="toolStore.isLoading" class="card overflow-hidden">
        <div v-for="i in 8" :key="i" class="px-5 py-4 border-b flex flex-col gap-2" style="border-color: var(--border-default);">
          <SkeletonBlock height="0.875rem" width="40%" />
          <SkeletonBlock height="0.75rem" width="70%" />
        </div>
      </div>

      <EmptyState
        v-else-if="filtered.length === 0"
        title="No tools found"
        :description="search || selectedNamespace ? 'Try adjusting your filters.' : 'Connect MCP endpoints to see tools here.'"
      >
        <template #icon>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-tertiary);">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </template>
      </EmptyState>

      <div v-else class="card overflow-hidden">
        <details
          v-for="tool in filtered"
          :key="tool.name"
          class="group border-b last:border-0"
          style="border-color: var(--border-default);"
        >
          <summary class="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors list-none gap-3">
            <div class="min-w-0 flex-1">
              <code class="text-xs font-mono font-medium" style="color: var(--text-accent);">{{ tool.name }}</code>
              <p v-if="tool.description" class="text-xs mt-0.5 line-clamp-2" style="color: var(--text-secondary);">{{ tool.description }}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0 transition-transform group-open:rotate-180" style="color: var(--text-tertiary);"><path d="M6 9l6 6 6-6"/></svg>
          </summary>
          <div class="px-5 pb-4 pt-1">
            <pre class="text-xs rounded-lg p-3 overflow-x-auto font-mono leading-relaxed" style="background: var(--bg-muted); color: var(--text-secondary);">{{ JSON.stringify(tool.inputSchema, null, 2) }}</pre>
          </div>
        </details>
      </div>
    </div>
  </AppLayout>
</template>
