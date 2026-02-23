<script setup lang="ts">
import { ref, computed } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import ServerCard from '@/components/registry/ServerCard.vue'
import { MCP_REGISTRY, REGISTRY_CATEGORIES, type RegistryServer } from '@/data/mcpRegistry'
import { useEndpointStore } from '@/stores/endpoints'
import { useError } from '@/composables/useError'

const endpointStore = useEndpointStore()
const { resolveMessage } = useError()

const search = ref('')
const activeCategory = ref('All')
const addingId = ref<string | null>(null)
const successId = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

const configServer = ref<RegistryServer | null>(null)
const configEnvValues = ref<Record<string, string>>({})
const configSubmitting = ref(false)
const configError = ref<string | null>(null)

const isAdded = (server: RegistryServer) =>
  endpointStore.endpoints.some(
    (e) => e.namespace === server.namespace || e.name.toLowerCase() === server.name.toLowerCase()
  )

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return MCP_REGISTRY.filter((s) => {
    const matchesCategory = activeCategory.value === 'All' || s.category === activeCategory.value
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      (s.tags ?? []).some((t) => t.toLowerCase().includes(q))
    return matchesCategory && matchesSearch
  })
})

const groupedByCategory = computed(() => {
  if (activeCategory.value !== 'All' || search.value.trim()) return null
  const groups: Record<string, RegistryServer[]> = {}
  for (const server of filtered.value) {
    if (!groups[server.category]) groups[server.category] = []
    groups[server.category].push(server)
  }
  return groups
})

function openConfig(server: RegistryServer) {
  configServer.value = server
  configEnvValues.value = {}
  if (server.envVars) {
    for (const v of server.envVars) {
      configEnvValues.value[v.key] = ''
    }
  }
  configError.value = null
}

async function quickAdd(server: RegistryServer) {
  if (server.envVars && server.envVars.some((v) => v.required)) {
    openConfig(server)
    return
  }
  addingId.value = server.id
  errorMessage.value = null
  try {
    const payload: Record<string, unknown> = {
      name: server.name,
      namespace: server.namespace,
      transport: server.transport,
      isEnabled: true,
    }
    if (server.transport === 'stdio') {
      payload.command = server.command
      payload.args = server.args ?? []
      payload.env = {}
    } else {
      payload.url = server.url
      payload.headers = {}
    }
    await endpointStore.create(payload)
    successId.value = server.id
    setTimeout(() => (successId.value = null), 3000)
  } catch (err) {
    errorMessage.value = resolveMessage(err)
  } finally {
    addingId.value = null
  }
}

async function submitConfig() {
  if (!configServer.value) return
  configSubmitting.value = true
  configError.value = null
  try {
    const server = configServer.value
    const payload: Record<string, unknown> = {
      name: server.name,
      namespace: server.namespace,
      transport: server.transport,
      isEnabled: true,
    }
    if (server.transport === 'stdio') {
      payload.command = server.command
      payload.args = server.args ?? []
      payload.env = { ...configEnvValues.value }
    } else {
      payload.url = server.url
      payload.headers = {}
    }
    await endpointStore.create(payload)
    successId.value = server.id
    setTimeout(() => (successId.value = null), 3000)
    configServer.value = null
  } catch (err) {
    configError.value = resolveMessage(err)
  } finally {
    configSubmitting.value = false
  }
}

const addedCount = computed(() => MCP_REGISTRY.filter((s) => isAdded(s)).length)
</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <div class="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 class="text-xl font-semibold" style="color: var(--text-primary);">MCP Registry</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            Discover and add MCP servers from the official registry and community
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <div class="text-right hidden sm:block">
            <p class="text-xs" style="color: var(--text-tertiary);">{{ addedCount }} of {{ MCP_REGISTRY.length }} added</p>
            <div class="w-24 h-1.5 rounded-full mt-1" style="background: var(--bg-muted);">
              <div
                class="h-full rounded-full bg-blue-500 transition-all"
                :style="`width: ${MCP_REGISTRY.length ? (addedCount / MCP_REGISTRY.length) * 100 : 0}%`"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="mb-4">
        <AppAlert :message="errorMessage" type="error" />
      </div>

      <div class="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          v-model="search"
          type="search"
          placeholder="Search servers…"
          class="flex-1 max-w-xs px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
          style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);"
        />
        <div class="flex gap-1.5 flex-wrap">
          <button
            v-for="cat in REGISTRY_CATEGORIES"
            :key="cat"
            @click="activeCategory = cat"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
              activeCategory === cat
                ? 'bg-blue-500 text-white'
                : 'border hover:bg-[var(--bg-hover)]'
            ]"
            style="border-color: var(--border-default);"
            :style="activeCategory !== cat ? 'color: var(--text-secondary)' : ''"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <template v-if="groupedByCategory">
        <div v-for="(servers, category) in groupedByCategory" :key="category" class="mb-8">
          <h2 class="text-sm font-semibold mb-3" style="color: var(--text-primary);">{{ category }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <ServerCard
              v-for="server in servers"
              :key="server.id"
              :server="server"
              :added="isAdded(server)"
              :adding="addingId === server.id"
              :success="successId === server.id"
              @add="quickAdd(server)"
            />
          </div>
        </div>
      </template>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ServerCard
          v-for="server in filtered"
          :key="server.id"
          :server="server"
          :added="isAdded(server)"
          :adding="addingId === server.id"
          :success="successId === server.id"
          @add="quickAdd(server)"
        />
        <div v-if="filtered.length === 0" class="col-span-3 py-16 text-center">
          <p class="text-sm" style="color: var(--text-tertiary);">No servers match your search.</p>
        </div>
      </div>
    </div>

    <AppModal
      :open="!!configServer"
      :title="`Configure ${configServer?.name}`"
      size="md"
      :closable="!configSubmitting"
      @close="configServer = null"
    >
      <div v-if="configServer" class="flex flex-col gap-4">
        <AppAlert v-if="configError" :message="configError" type="error" />
        <p class="text-sm" style="color: var(--text-secondary);">
          {{ configServer.description }}
        </p>
        <div class="flex flex-col gap-3">
          <div v-for="envVar in configServer.envVars" :key="envVar.key">
            <AppInput
              v-model="configEnvValues[envVar.key]"
              :label="`${envVar.key}${envVar.required ? '' : ' (optional)'}`"
              :placeholder="envVar.placeholder ?? ''"
              :id="`env-${envVar.key}`"
            />
            <p v-if="envVar.description" class="text-xs mt-1" style="color: var(--text-tertiary);">{{ envVar.description }}</p>
          </div>
        </div>
        <div class="rounded-lg p-3 text-xs border" style="background: var(--bg-muted); border-color: var(--border-default); color: var(--text-secondary);">
          This will create an endpoint with namespace <code class="font-mono px-1 rounded" style="background: var(--bg-surface);">{{ configServer.namespace }}</code>. You can modify it later from the Endpoints page.
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" :disabled="configSubmitting" @click="configServer = null">Cancel</AppButton>
        <AppButton :loading="configSubmitting" @click="submitConfig">Add Endpoint</AppButton>
      </template>
    </AppModal>
  </AppLayout>
</template>
