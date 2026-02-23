<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import AppToggle from '@/components/ui/AppToggle.vue'
import { useEndpointStore } from '@/stores/endpoints'
import { useStatusStore } from '@/stores/status'
import { api } from '@/api/client'
import type { EndpointStatus, Tool } from '@/types'

const route = useRoute()
const router = useRouter()
const endpointStore = useEndpointStore()
const statusStore = useStatusStore()

const endpointId = route.params.id as string
const tools = ref<Tool[]>([])
const loadingTools = ref(false)
const showDeleteDialog = ref(false)
const deleting = ref(false)

const endpoint = computed(() =>
  endpointStore.endpoints.find((e) => e.id === endpointId) ?? null
)

const status = computed(() =>
  (statusStore.upstreams.find((u) => u.endpointId === endpointId)?.status ?? 'disconnected') as EndpointStatus
)

onMounted(async () => {
  if (!endpoint.value) await endpointStore.load()
  loadingTools.value = true
  try {
    const data = await api.getTools() as { tools: Tool[] }
    const prefix = endpoint.value?.namespace
    tools.value = prefix
      ? data.tools.filter((t) => t.name.startsWith(prefix + '__'))
      : data.tools
  } finally {
    loadingTools.value = false
  }
})

async function handleToggle() {
  if (!endpoint.value) return
  await endpointStore.toggle(endpoint.value.id, !endpoint.value.isEnabled)
}

async function confirmDelete() {
  if (!endpoint.value) return
  deleting.value = true
  try {
    await endpointStore.remove(endpoint.value.id)
    await router.push('/endpoints')
  } finally {
    deleting.value = false
  }
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d))
}

const toolSearch = ref('')
const filteredTools = computed(() => {
  const q = toolSearch.value.toLowerCase().trim()
  if (!q) return tools.value
  return tools.value.filter(
    (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
  )
})
</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
      <div class="flex items-center gap-2 mb-6">
        <router-link to="/endpoints" class="text-sm hover:underline" style="color: var(--text-secondary);">Endpoints</router-link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-tertiary);"><path d="M9 18l6-6-6-6"/></svg>
        <span class="text-sm font-medium" style="color: var(--text-primary);">{{ endpoint?.name ?? 'Loading…' }}</span>
      </div>

      <div v-if="!endpoint" class="flex items-center gap-3 py-12 justify-center">
        <span class="animate-spin-smooth w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
        <span class="text-sm" style="color: var(--text-secondary);">Loading endpoint…</span>
      </div>

      <template v-else>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 class="text-xl font-semibold" style="color: var(--text-primary);">{{ endpoint.name }}</h1>
            <div class="flex items-center gap-2 mt-1">
              <code class="text-xs px-1.5 py-0.5 rounded font-mono" style="background: var(--bg-muted); color: var(--text-secondary);">{{ endpoint.namespace }}</code>
              <StatusBadge :status="status" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <AppToggle :model-value="endpoint.isEnabled" @update:model-value="handleToggle" :label="endpoint.isEnabled ? 'Enabled' : 'Disabled'" />
            <AppButton variant="danger" size="sm" @click="showDeleteDialog = true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              Remove
            </AppButton>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="card p-5">
            <h2 class="text-xs font-semibold uppercase tracking-wider mb-3" style="color: var(--text-tertiary);">Connection</h2>
            <dl class="flex flex-col gap-2.5">
              <div class="flex justify-between text-sm">
                <dt style="color: var(--text-secondary);">Transport</dt>
                <dd class="font-medium" style="color: var(--text-primary);">{{ endpoint.transport }}</dd>
              </div>
              <div v-if="endpoint.url" class="flex justify-between text-sm gap-4">
                <dt style="color: var(--text-secondary);">URL</dt>
                <dd class="font-medium truncate font-mono text-xs" style="color: var(--text-primary);">{{ endpoint.url }}</dd>
              </div>
              <div v-if="endpoint.command" class="flex justify-between text-sm">
                <dt style="color: var(--text-secondary);">Command</dt>
                <dd class="font-medium font-mono text-xs" style="color: var(--text-primary);">{{ endpoint.command }}</dd>
              </div>
              <div v-if="endpoint.args?.length" class="flex justify-between text-sm">
                <dt style="color: var(--text-secondary);">Args</dt>
                <dd class="font-mono text-xs" style="color: var(--text-primary);">{{ endpoint.args.join(' ') }}</dd>
              </div>
            </dl>
          </div>

          <div class="card p-5">
            <h2 class="text-xs font-semibold uppercase tracking-wider mb-3" style="color: var(--text-tertiary);">Metadata</h2>
            <dl class="flex flex-col gap-2.5">
              <div class="flex justify-between text-sm">
                <dt style="color: var(--text-secondary);">Status</dt>
                <dd><StatusBadge :status="status" /></dd>
              </div>
              <div class="flex justify-between text-sm">
                <dt style="color: var(--text-secondary);">Tool count</dt>
                <dd class="font-medium" style="color: var(--text-primary);">{{ endpoint.toolCount }}</dd>
              </div>
              <div class="flex justify-between text-sm">
                <dt style="color: var(--text-secondary);">Last connected</dt>
                <dd class="font-medium" style="color: var(--text-primary);">{{ formatDate(endpoint.lastConnectedAt) }}</dd>
              </div>
              <div class="flex justify-between text-sm">
                <dt style="color: var(--text-secondary);">Created</dt>
                <dd style="color: var(--text-primary);">{{ formatDate(endpoint.createdAt) }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div class="card overflow-hidden">
          <div class="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center gap-3" style="border-color: var(--border-default);">
            <h2 class="text-sm font-semibold flex-1" style="color: var(--text-primary);">Tools <span class="badge badge-neutral ml-1">{{ tools.length }}</span></h2>
            <input
              v-model="toolSearch"
              type="search"
              placeholder="Search tools…"
              class="px-3 py-1.5 text-sm rounded-lg border outline-none transition-colors w-full sm:w-48"
              style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);"
            />
          </div>

          <div v-if="loadingTools" class="p-5 flex flex-col gap-3">
            <SkeletonBlock v-for="i in 5" :key="i" height="1rem" />
          </div>

          <div v-else-if="filteredTools.length === 0" class="py-10 text-center">
            <p class="text-sm" style="color: var(--text-tertiary);">No tools found.</p>
          </div>

          <div v-else class="divide-y" style="border-color: var(--border-default);">
            <details
              v-for="tool in filteredTools"
              :key="tool.name"
              class="group"
            >
              <summary class="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors list-none">
                <div class="min-w-0">
                  <code class="text-xs font-mono font-medium" style="color: var(--text-accent);">{{ tool.name }}</code>
                  <p v-if="tool.description" class="text-xs mt-0.5 truncate" style="color: var(--text-secondary);">{{ tool.description }}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="shrink-0 transition-transform group-open:rotate-180" style="color: var(--text-tertiary);"><path d="M6 9l6 6 6-6"/></svg>
              </summary>
              <div class="px-5 pb-4 pt-1">
                <pre class="text-xs rounded-lg p-3 overflow-x-auto font-mono leading-relaxed" style="background: var(--bg-muted); color: var(--text-secondary);">{{ JSON.stringify(tool.inputSchema, null, 2) }}</pre>
              </div>
            </details>
          </div>
        </div>
      </template>
    </div>

    <ConfirmDialog
      :open="showDeleteDialog"
      title="Remove Endpoint"
      :message="`Remove '${endpoint?.name}'? This action cannot be undone.`"
      confirm-label="Remove"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="showDeleteDialog = false"
    />
  </AppLayout>
</template>
