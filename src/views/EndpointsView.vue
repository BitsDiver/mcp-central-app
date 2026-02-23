<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppToggle from '@/components/ui/AppToggle.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import RegistryPickerModal from '@/components/endpoints/RegistryPickerModal.vue'
import { useEndpointStore } from '@/stores/endpoints'
import { useStatusStore } from '@/stores/status'
import { useError } from '@/composables/useError'
import type { Endpoint, EndpointStatus } from '@/types'
import type { RegistryServer } from '@/data/mcpRegistry'

const endpointStore = useEndpointStore()
const statusStore = useStatusStore()
const { resolveMessage, useFormErrors } = useError()

onMounted(async () => {
  if (endpointStore.endpoints.length === 0) await endpointStore.load()
  if (statusStore.upstreams.length === 0) await statusStore.load()
})

const search = ref('')
const showModal = ref(false)
const showRegistryModal = ref(false)
const editingEndpoint = ref<Endpoint | null>(null)
const submitting = ref(false)
const { errors, setFromApiError, clearErrors } = useFormErrors()
const globalError = computed(() => errors.value['_global'])

const deleteTarget = ref<Endpoint | null>(null)
const deleting = ref(false)

const form = ref({
  name: '',
  namespace: '',
  transport: 'streamable-http' as 'streamable-http' | 'stdio',
  url: '',
  command: '',
  args: '',
  headers: '',
  env: '',
  isEnabled: true,
})

const transportOptions = [
  { value: 'streamable-http', label: 'Streamable HTTP' },
  { value: 'stdio', label: 'stdio (local process)' },
]

function getUpstreamStatus(endpointId: string): EndpointStatus {
  return (statusStore.upstreams.find((u) => u.endpointId === endpointId)?.status ?? 'disconnected') as EndpointStatus
}

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return endpointStore.endpoints
  return endpointStore.endpoints.filter(
    (e) => e.name.toLowerCase().includes(q) || e.namespace.toLowerCase().includes(q)
  )
})

function openAdd() {
  editingEndpoint.value = null
  form.value = { name: '', namespace: '', transport: 'streamable-http', url: '', command: '', args: '', headers: '', env: '', isEnabled: true }
  clearErrors()
  showModal.value = true
}

function openFromRegistry(server: RegistryServer) {
  editingEndpoint.value = null
  form.value = {
    name: server.name,
    namespace: server.namespace,
    transport: server.transport,
    url: server.url ?? '',
    command: server.command ?? '',
    args: (server.args ?? []).join('\n'),
    headers: '',
    env: '',
    isEnabled: true,
  }
  clearErrors()
  showModal.value = true
}

function openEdit(ep: Endpoint) {
  editingEndpoint.value = ep
  form.value = {
    name: ep.name,
    namespace: ep.namespace,
    transport: ep.transport,
    url: ep.url ?? '',
    command: ep.command ?? '',
    args: ep.args.join('\n'),
    headers: Object.entries(ep.headers).map(([k, v]) => `${k}: ${v}`).join('\n'),
    env: Object.entries(ep.env).map(([k, v]) => `${k}=${v}`).join('\n'),
    isEnabled: ep.isEnabled,
  }
  clearErrors()
  showModal.value = true
}

function parseKVLines(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const sep = trimmed.indexOf(':')
    if (sep > 0) {
      result[trimmed.slice(0, sep).trim()] = trimmed.slice(sep + 1).trim()
    }
  }
  return result
}

function parseEnvLines(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq > 0) {
      result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1)
    }
  }
  return result
}

async function submit() {
  clearErrors()
  if (!form.value.name.trim()) {
    errors.value['name'] = 'Name is required.'
    return
  }
  if (!form.value.namespace.trim()) {
    errors.value['namespace'] = 'Namespace is required.'
    return
  }
  submitting.value = true
  try {
    const payload: Record<string, unknown> = {
      name: form.value.name.trim(),
      namespace: form.value.namespace.trim(),
      transport: form.value.transport,
      isEnabled: form.value.isEnabled,
    }
    if (form.value.transport === 'streamable-http') {
      payload.url = form.value.url.trim() || undefined
      payload.headers = parseKVLines(form.value.headers)
    } else {
      payload.command = form.value.command.trim() || undefined
      payload.args = form.value.args.split('\n').map((a) => a.trim()).filter(Boolean)
      payload.env = parseEnvLines(form.value.env)
    }
    await endpointStore.create(payload)
    showModal.value = false
  } catch (err) {
    setFromApiError(err)
  } finally {
    submitting.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await endpointStore.remove(deleteTarget.value.id)
    deleteTarget.value = null
  } catch (err) {
    const toast = (await import('@/stores/toast')).useToastStore()
    toast.error(resolveMessage(err))
  } finally {
    deleting.value = false
  }
}

async function toggle(ep: Endpoint) {
  try {
    await endpointStore.toggle(ep.id, !ep.isEnabled)
  } catch (err) {
    const toast = (await import('@/stores/toast')).useToastStore()
    toast.error(resolveMessage(err))
  }
}
</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold" style="color: var(--text-primary);">MCP Endpoints</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">Manage your upstream MCP servers</p>
        </div>
        <div class="flex items-center gap-2">
          <AppButton variant="secondary" @click="showRegistryModal = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Browse Registry
          </AppButton>
          <AppButton @click="openAdd">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Add Endpoint
          </AppButton>
        </div>
      </div>

      <div class="mb-4">
        <input
          v-model="search"
          type="search"
          placeholder="Search endpoints…"
          class="w-full max-w-xs px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
          style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);"
          :onfocus="(e: FocusEvent) => (e.target as HTMLElement).style.borderColor = 'var(--border-focus)'"
          :onblur="(e: FocusEvent) => (e.target as HTMLElement).style.borderColor = 'var(--border-default)'"
        />
      </div>

      <div v-if="endpointStore.isLoading" class="card overflow-hidden">
        <div v-for="i in 4" :key="i" class="flex items-center gap-4 px-5 py-4 border-b" style="border-color: var(--border-default);">
          <SkeletonBlock height="1rem" width="25%" />
          <SkeletonBlock height="1rem" width="15%" />
          <SkeletonBlock height="1.5rem" width="80px" />
        </div>
      </div>

      <EmptyState
        v-else-if="filtered.length === 0"
        title="No endpoints found"
        :description="search ? 'Try a different search term.' : 'Add your first MCP server to get started.'"
      >
        <template #icon>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-tertiary);">
            <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </template>
        <div v-if="!search" class="flex items-center gap-2">
          <AppButton size="sm" variant="secondary" @click="showRegistryModal = true">Browse Registry</AppButton>
          <AppButton size="sm" @click="openAdd">Add Endpoint</AppButton>
        </div>
      </EmptyState>

      <div v-else class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b" style="border-color: var(--border-default);">
                <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-tertiary);">Name</th>
                <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style="color: var(--text-tertiary);">Namespace</th>
                <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style="color: var(--text-tertiary);">Transport</th>
                <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-tertiary);">Status</th>
                <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style="color: var(--text-tertiary);">Tools</th>
                <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-tertiary);">Enabled</th>
                <th class="px-5 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y" style="border-color: var(--border-default);">
              <tr
                v-for="ep in filtered"
                :key="ep.id"
                class="transition-colors hover:bg-[var(--bg-hover)]"
              >
                <td class="px-5 py-3">
                  <router-link :to="`/endpoints/${ep.id}`" class="font-medium text-blue-500 hover:underline">{{ ep.name }}</router-link>
                </td>
                <td class="px-5 py-3 hidden sm:table-cell">
                  <code class="text-xs px-1.5 py-0.5 rounded font-mono" style="background: var(--bg-muted); color: var(--text-secondary);">{{ ep.namespace }}</code>
                </td>
                <td class="px-5 py-3 hidden md:table-cell" style="color: var(--text-secondary);">{{ ep.transport }}</td>
                <td class="px-5 py-3">
                  <StatusBadge :status="getUpstreamStatus(ep.id)" />
                </td>
                <td class="px-5 py-3 hidden lg:table-cell" style="color: var(--text-primary);">{{ ep.toolCount }}</td>
                <td class="px-5 py-3">
                  <AppToggle :model-value="ep.isEnabled" @update:model-value="toggle(ep)" />
                </td>
                <td class="px-5 py-3">
                  <div class="flex items-center gap-1 justify-end">
                    <AppButton variant="ghost" size="sm" @click="openEdit(ep)">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </AppButton>
                    <AppButton variant="ghost" size="sm" @click="deleteTarget = ep">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-red-500"><path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    </AppButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <AppModal
      :open="showModal"
      :title="editingEndpoint ? 'Edit Endpoint' : 'Add Endpoint'"
      size="lg"
      :closable="!submitting"
      @close="showModal = false"
    >
      <form @submit.prevent="submit" class="flex flex-col gap-4">
        <AppAlert v-if="globalError" :message="globalError" type="error" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput v-model="form.name" label="Name" placeholder="GitHub MCP" :error="errors['name']" required id="ep-name" />
          <AppInput v-model="form.namespace" label="Namespace" placeholder="github" :error="errors['namespace']" required id="ep-namespace" />
        </div>
        <AppSelect v-model="form.transport" label="Transport" :options="transportOptions" id="ep-transport" />

        <template v-if="form.transport === 'streamable-http'">
          <AppInput v-model="form.url" label="URL" placeholder="https://mcp.example.com" :error="errors['url']" id="ep-url" />
          <AppTextarea v-model="form.headers" label="Upstream server auth headers (key: value, one per line)" placeholder="Authorization: Bearer ghp_..." id="ep-headers" :rows="3" hint="Sent by central-MCP to authenticate with this upstream server. One header per line in 'Key: Value' format." />
        </template>

        <template v-else>
          <AppInput v-model="form.command" label="Command" placeholder="npx" :error="errors['command']" id="ep-command" />
          <AppTextarea v-model="form.args" label="Arguments (one per line)" placeholder="-y&#10;@modelcontextprotocol/server-github" id="ep-args" :rows="3" />
          <AppTextarea v-model="form.env" label="Upstream server credentials (KEY=value, one per line)" placeholder="GITHUB_TOKEN=ghp_..." id="ep-env" :rows="3" hint="Environment variables injected into the upstream process. Used to authenticate with external services." />
        </template>

        <div class="flex items-center gap-2 pt-1">
          <AppToggle v-model="form.isEnabled" label="Enable immediately after creation" />
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="submitting" @click="showModal = false">Cancel</AppButton>
        <AppButton :loading="submitting" @click="submit">{{ editingEndpoint ? 'Save Changes' : 'Add Endpoint' }}</AppButton>
      </template>
    </AppModal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Remove Endpoint"
      :message="`Remove '${deleteTarget?.name}'? This will disconnect the upstream server.`"
      confirm-label="Remove"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />

    <RegistryPickerModal
      :open="showRegistryModal"
      @close="showRegistryModal = false"
      @select="openFromRegistry"
    />
  </AppLayout>
</template>
