<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useToolStore } from '@/stores/tools'
import type { Tool } from '@/types'

const toolStore = useToolStore()

onMounted(async () => {
  if (toolStore.tools.length === 0) await toolStore.load()
})

// ── Filtering ──────────────────────────────────────────────────────────────
const search = ref('')
const selectedNamespace = ref('')
const expandedTool = ref<string | null>(null)

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
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    )
  }
  return list
})

// ── Helpers ────────────────────────────────────────────────────────────────
function getNamespace(name: string): string {
  const idx = name.indexOf('__')
  return idx > -1 ? name.slice(0, idx) : ''
}

function getShortName(name: string): string {
  const idx = name.indexOf('__')
  return idx > -1 ? name.slice(idx + 2) : name
}

/** Deterministic hue 0‥359 derived from the namespace string. */
function nsHue(ns: string): number {
  let h = 0
  for (let i = 0; i < ns.length; i++) h = (h * 31 + ns.charCodeAt(i)) & 0xffff
  return h % 360
}

/** Strip the "[namespace] " prefix that ToolRegistry prepends. */
function cleanDescription(desc: string, ns: string): string {
  if (!desc) return ''
  const prefix = `[${ns}] `
  return desc.startsWith(prefix) ? desc.slice(prefix.length) : desc
}

interface Param {
  name: string
  type: string
  required: boolean
  description: string
  enumValues?: unknown[]
}

function getParams(tool: Tool): Param[] {
  const schema = tool.inputSchema as {
    properties?: Record<string, { type?: string; description?: string; enum?: unknown[] }>
    required?: string[]
  }
  if (!schema?.properties) return []
  const required: string[] = schema.required ?? []
  return Object.entries(schema.properties).map(([key, prop]) => ({
    name: key,
    type: prop.type ?? 'any',
    required: required.includes(key),
    description: prop.description ?? '',
    enumValues: prop.enum,
  }))
}

function toggle(name: string) {
  expandedTool.value = expandedTool.value === name ? null : name
}
</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold" style="color: var(--text-primary);">Tools</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            {{ toolStore.count }} aggregated tool{{ toolStore.count !== 1 ? 's' : '' }} from upstream servers
          </p>
        </div>
        <span
          class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
          style="background: var(--color-primary-subtle, rgba(99,102,241,.12)); color: var(--color-primary, #6366f1);"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" fill="var(--bg-card, #fff)"/></svg>
          {{ toolStore.count }} total
        </span>
      </div>

      <!-- Search + namespace filters -->
      <div class="flex flex-col sm:flex-row gap-3 mb-5">
        <div class="relative flex-1 max-w-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style="color: var(--text-tertiary);"
          >
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            v-model="search"
            type="search"
            placeholder="Search tools…"
            class="w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none transition-colors"
            style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);"
          />
        </div>
        <div class="flex gap-2 flex-wrap items-center">
          <button
            @click="selectedNamespace = ''"
            :class="['text-xs font-medium px-3 py-1.5 rounded-full border transition-colors cursor-pointer',
              !selectedNamespace
                ? 'border-transparent'
                : 'border-transparent hover:bg-[var(--bg-hover)]']"
            :style="!selectedNamespace
              ? 'background: var(--color-primary-subtle, rgba(99,102,241,.12)); color: var(--color-primary, #6366f1);'
              : 'background: var(--bg-muted); color: var(--text-secondary);'"
          >All</button>
          <button
            v-for="ns in namespaces"
            :key="ns"
            @click="selectedNamespace = ns === selectedNamespace ? '' : ns"
            class="text-xs font-mono font-medium px-3 py-1.5 rounded-full border-0 transition-colors cursor-pointer"
            :style="selectedNamespace === ns
              ? `background: hsl(${nsHue(ns)} 70% 94%); color: hsl(${nsHue(ns)} 55% 38%);`
              : 'background: var(--bg-muted); color: var(--text-secondary);'"
          >{{ ns }}</button>
        </div>
      </div>

      <!-- Loading skeletons -->
      <div v-if="toolStore.isLoading" class="flex flex-col gap-2">
        <div
          v-for="i in 6" :key="i"
          class="rounded-xl border px-5 py-4 flex flex-col gap-2"
          style="background: var(--bg-card); border-color: var(--border-default);"
        >
          <SkeletonBlock height="0.875rem" width="35%" />
          <SkeletonBlock height="0.75rem" width="65%" />
        </div>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else-if="filtered.length === 0"
        title="No tools found"
        :description="search || selectedNamespace ? 'Try adjusting your filters.' : 'Connect MCP endpoints to see tools here.'"
      >
        <template #icon>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-tertiary);">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </template>
      </EmptyState>

      <!-- Tool cards -->
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="tool in filtered"
          :key="tool.name"
          class="rounded-xl border overflow-hidden transition-shadow"
          :style="`background: var(--bg-card); border-color: ${expandedTool === tool.name ? 'var(--color-primary, #6366f1)' : 'var(--border-default)'};`"
        >
          <!-- Card header (clickable) -->
          <button
            type="button"
            class="w-full flex items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--bg-hover)]"
            @click="toggle(tool.name)"
          >
            <!-- Namespace badge -->
            <span
              v-if="getNamespace(tool.name)"
              class="mt-0.5 shrink-0 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md leading-5"
              :style="`background: hsl(${nsHue(getNamespace(tool.name))} 70% 93%); color: hsl(${nsHue(getNamespace(tool.name))} 55% 38%);`"
            >{{ getNamespace(tool.name) }}</span>
            <!-- Name + description -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold leading-snug" style="color: var(--text-primary);">
                {{ getShortName(tool.name) }}
              </p>
              <p
                v-if="tool.description"
                class="text-xs mt-0.5 line-clamp-2 leading-relaxed"
                style="color: var(--text-secondary);"
              >{{ cleanDescription(tool.description, getNamespace(tool.name)) }}</p>
            </div>
            <!-- Right side: param count + chevron -->
            <div class="shrink-0 flex items-center gap-2 mt-0.5">
              <span
                v-if="getParams(tool).length"
                class="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                style="background: var(--bg-muted); color: var(--text-tertiary);"
              >{{ getParams(tool).length }} param{{ getParams(tool).length !== 1 ? 's' : '' }}</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                class="transition-transform duration-200"
                :style="expandedTool === tool.name ? 'transform: rotate(180deg); color: var(--color-primary, #6366f1);' : 'color: var(--text-tertiary);'"
              ><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </button>

          <!-- Expanded detail panel -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out overflow-hidden"
            leave-active-class="transition-all duration-150 ease-in overflow-hidden"
            enter-from-class="max-h-0 opacity-0"
            enter-to-class="max-h-[600px] opacity-100"
            leave-from-class="max-h-[600px] opacity-100"
            leave-to-class="max-h-0 opacity-0"
          >
            <div
              v-if="expandedTool === tool.name"
              class="border-t"
              style="border-color: var(--border-default);"
            >
              <!-- Full technical name -->
              <div class="px-5 pt-3.5 pb-1 flex items-center gap-2">
                <span class="text-[10px] uppercase tracking-wide font-semibold" style="color: var(--text-tertiary);">Full name</span>
                <code class="text-xs font-mono" style="color: var(--text-accent, #6366f1);">{{ tool.name }}</code>
              </div>

              <!-- Full description -->
              <div v-if="tool.description" class="px-5 pb-3">
                <p class="text-xs leading-relaxed" style="color: var(--text-secondary);">
                  {{ cleanDescription(tool.description, getNamespace(tool.name)) }}
                </p>
              </div>

              <!-- Parameters table -->
              <div v-if="getParams(tool).length" class="px-5 pb-4">
                <p class="text-[10px] uppercase tracking-wide font-semibold mb-2" style="color: var(--text-tertiary);">Parameters</p>
                <div
                  class="rounded-lg overflow-hidden border text-xs"
                  style="border-color: var(--border-default);"
                >
                  <!-- Table header -->
                  <div
                    class="grid grid-cols-[minmax(100px,1fr)_80px_52px_minmax(120px,2fr)] gap-x-4 px-4 py-2 font-semibold uppercase tracking-wide text-[10px]"
                    style="background: var(--bg-muted); color: var(--text-tertiary); border-bottom: 1px solid var(--border-default);"
                  >
                    <span>Name</span>
                    <span>Type</span>
                    <span>Req.</span>
                    <span>Description</span>
                  </div>
                  <!-- Table rows -->
                  <div
                    v-for="(param, idx) in getParams(tool)"
                    :key="param.name"
                    class="grid grid-cols-[minmax(100px,1fr)_80px_52px_minmax(120px,2fr)] gap-x-4 px-4 py-2.5 items-start"
                    :style="idx < getParams(tool).length - 1 ? 'border-bottom: 1px solid var(--border-default);' : ''"
                    style="background: var(--bg-card);"
                  >
                    <code class="font-mono font-semibold text-[11px] break-all" style="color: var(--text-primary);">{{ param.name }}</code>
                    <span
                      class="font-mono text-[11px] px-1.5 py-0.5 rounded self-start"
                      style="background: var(--bg-muted); color: var(--text-secondary);"
                    >{{ param.type }}</span>
                    <span class="text-center self-start">
                      <span
                        v-if="param.required"
                        class="inline-block w-4 h-4 rounded-full text-[10px] font-bold leading-4 text-center"
                        style="background: rgba(239,68,68,.12); color: #ef4444;"
                      >✓</span>
                      <span v-else class="text-[11px]" style="color: var(--text-tertiary);">–</span>
                    </span>
                    <span style="color: var(--text-secondary);" class="text-[11px] leading-relaxed">
                      {{ param.description || '—' }}
                      <span v-if="param.enumValues?.length" class="block mt-1">
                        <span
                          v-for="v in param.enumValues"
                          :key="String(v)"
                          class="inline-block mr-1 mb-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded"
                          style="background: var(--bg-muted); color: var(--text-tertiary);"
                        >{{ v }}</span>
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- No params hint -->
              <div v-else class="px-5 pb-4">
                <p class="text-xs italic" style="color: var(--text-tertiary);">No parameters.</p>
              </div>
            </div>
          </Transition>
        </div>
      </div>

    </div>
  </AppLayout>
</template>
