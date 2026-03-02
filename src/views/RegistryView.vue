<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue';
  import AppLayout from '@/components/layout/AppLayout.vue';
  import AppButton from '@/components/ui/AppButton.vue';
  import AppModal from '@/components/ui/AppModal.vue';
  import AppInput from '@/components/ui/AppInput.vue';
  import AppAlert from '@/components/ui/AppAlert.vue';
  import AppListbox from '@/components/ui/AppListbox.vue';
  import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
  import ServerCard from '@/components/registry/ServerCard.vue';
  import type { RegistryServer } from '@/data/mcpRegistry';
  import type { ListboxOption } from '@/types';
  import { useRegistry } from '@/composables/useRegistry';
  import { useEndpointStore } from '@/stores/endpoints';
  import { useAgentStore } from '@/stores/agents';
  import { useError } from '@/composables/useError';

  const endpointStore = useEndpointStore();
  const agentStore = useAgentStore();
  const { resolveMessage } = useError();
  const { servers, categories, isLoading, searchResults, searchLoading, searchServers } = useRegistry();

  const TRANSPORT_OPTIONS: ListboxOption[] = [
    {
      value: 'all',
      label: 'All transports',
      description: 'Show all servers regardless of transport',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    },
    {
      value: 'streamable-http',
      label: 'HTTP',
      description: 'Remote server — no local agent required',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    },
    {
      value: 'stdio',
      label: 'stdio',
      description: 'Local process — requires an agent',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    },
    {
      value: 'sse',
      label: 'SSE',
      description: 'Server-Sent Events — remote stream',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg>`,
    },
  ];

  onMounted(async () => {
    if (agentStore.agents.length === 0) await agentStore.load();
  });

  const search = ref('');
  const activeCategory = ref('All');
  const activeTransport = ref<string>('all');
  const addingId = ref<string | null>(null);

  function clearSearch() {
    search.value = '';
    searchServers('');
  }

  const isSearching = computed(() => !!search.value.trim());
  const successId = ref<string | null>(null);
  const errorMessage = ref<string | null>(null);

  const configServer = ref<RegistryServer | null>(null);
  const configEnvValues = ref<Record<string, string>>({});
  const configAgentId = ref<string>('');
  const configSubmitting = ref(false);
  const configError = ref<string | null>(null);

  const isAdded = (server: RegistryServer) =>
    endpointStore.endpoints.some(
      (e) => e.namespace === server.namespace || e.name.toLowerCase() === server.name.toLowerCase()
    );

  const filtered = computed(() => {
    if (isSearching.value) {
      // Live search results — only post-filter by transport (backend already text-filtered)
      return activeTransport.value === 'all'
        ? searchResults.value
        : searchResults.value.filter((s) => s.transport === activeTransport.value);
    }
    // Curated list — filter by category + transport
    return servers.value.filter((s) => {
      const matchesCategory = activeCategory.value === 'All' || s.category === activeCategory.value;
      const matchesTransport = activeTransport.value === 'all' || s.transport === activeTransport.value;
      return matchesCategory && matchesTransport;
    });
  });

  const groupedByCategory = computed(() => {
    if (isSearching.value || activeCategory.value !== 'All' || activeTransport.value !== 'all') return null;
    const groups: Record<string, RegistryServer[]> = {};
    for (const server of filtered.value) {
      if (!groups[server.category]) groups[server.category] = [];
      groups[server.category].push(server);
    }
    return groups;
  });

  // Debounced live search watcher
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  watch(search, (q) => {
    if (searchTimer) clearTimeout(searchTimer);
    if (!q.trim()) { searchServers(''); return; }
    searchTimer = setTimeout(() => searchServers(q, activeTransport.value !== 'all' ? activeTransport.value : undefined), 300);
  });
  watch(activeTransport, (t) => {
    if (isSearching.value) searchServers(search.value, t !== 'all' ? t : undefined);
  });

  function openConfig(server: RegistryServer) {
    configServer.value = server;
    configEnvValues.value = {};
    configAgentId.value = '';
    if (server.envVars) {
      for (const v of server.envVars) {
        configEnvValues.value[v.key] = '';
      }
    }
    configError.value = null;
  }

  const isConfigValid = computed(() => {
    if (!configServer.value) return false;
    const envOk = (configServer.value.envVars ?? [])
      .filter((e) => e.required)
      .every((e) => configEnvValues.value[e.key]?.trim());
    // stdio must be assigned to an agent — prevents running processes directly on mcp-central.
    // Offline agents are accepted; the endpoint will activate when the agent reconnects.
    if (configServer.value.transport === 'stdio' && !configAgentId.value) return false;
    return envOk;
  });

  async function submitConfig() {
    if (!configServer.value) return;
    configSubmitting.value = true;
    configError.value = null;
    try {
      const server = configServer.value;
      const payload: Record<string, unknown> = {
        name: server.name,
        namespace: server.namespace,
        transport: server.transport,
        isEnabled: true,
      };
      if (server.transport === 'stdio') {
        payload.command = server.command;
        payload.args = server.args ?? [];
        payload.env = { ...configEnvValues.value };
      } else {
        payload.url = server.url;
        // For HTTP/SSE servers, envVars are passed as request headers (e.g. Authorization, x-api-key)
        const headers: Record<string, string> = {};
        if (server.envVars) {
          for (const v of server.envVars) {
            const val = configEnvValues.value[v.key];
            if (val?.trim()) headers[v.key] = val.trim();
          }
        }
        payload.headers = headers;
      }
      if (configAgentId.value) payload.agentId = configAgentId.value;
      await endpointStore.create(payload);
      successId.value = server.id;
      setTimeout(() => (successId.value = null), 3000);
      configServer.value = null;
    } catch (err) {
      configError.value = resolveMessage(err);
    } finally {
      configSubmitting.value = false;
    }
  }


</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 class="text-xl font-semibold" style="color: var(--text-primary);">MCP Registry</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            Discover and add MCP servers from the official registry and community
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <!-- Transport filter -->
          <AppListbox v-model="activeTransport" :options="TRANSPORT_OPTIONS" size="sm" placement="bottom" />
          <!-- Search with clear button -->
          <div class="relative">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style="color: var(--text-tertiary);">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input v-model="search" type="text" placeholder="Search servers…"
              class="pl-8 py-2 text-sm rounded-lg border outline-none transition-colors"
              :class="search ? 'pr-8' : 'pr-3'"
              style="min-width: 220px; background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);" />
            <button v-if="search" @click="clearSearch"
              class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors hover:bg-[var(--bg-hover)]"
              style="color: var(--text-tertiary);" title="Clear search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="mb-4">
        <AppAlert :message="errorMessage" type="error" />
      </div>

      <!-- Category filter chips (hidden while searching) -->
      <div v-if="!isSearching" class="flex gap-1.5 flex-wrap mb-5">
        <button v-for="cat in categories" :key="cat" @click="activeCategory = cat" :class="[
          'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
          activeCategory === cat
            ? 'bg-blue-500 text-white'
            : 'border hover:bg-[var(--bg-hover)]'
        ]" style="border-color: var(--border-default);"
          :style="activeCategory !== cat ? 'color: var(--text-secondary)' : ''">
          {{ cat }}
        </button>
      </div>

      <!-- Loading skeletons (curated) -->
      <div v-if="isLoading && !isSearching" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div v-for="i in 9" :key="i" class="rounded-xl border px-5 py-4 flex flex-col gap-3"
          style="background: var(--bg-card); border-color: var(--border-default);">
          <div class="flex items-center gap-3">
            <SkeletonBlock height="2rem" width="2rem" class="rounded-lg shrink-0" />
            <SkeletonBlock height="1rem" width="50%" />
          </div>
          <SkeletonBlock height="0.75rem" width="80%" />
          <SkeletonBlock height="0.75rem" width="60%" />
        </div>
      </div>

      <!-- Live search loading -->
      <div v-else-if="searchLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div v-for="i in 6" :key="i" class="rounded-xl border px-5 py-4 flex flex-col gap-3"
          style="background: var(--bg-card); border-color: var(--border-default);">
          <div class="flex items-center gap-3">
            <SkeletonBlock height="2rem" width="2rem" class="rounded-lg shrink-0" />
            <SkeletonBlock height="1rem" width="50%" />
          </div>
          <SkeletonBlock height="0.75rem" width="80%" />
          <SkeletonBlock height="0.75rem" width="60%" />
        </div>
      </div>

      <template v-else-if="groupedByCategory">
        <div v-for="(groupServers, category) in groupedByCategory" :key="category" class="mb-8">
          <h2 class="text-sm font-semibold mb-3" style="color: var(--text-primary);">{{ category }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <ServerCard v-for="server in groupServers" :key="server.id" :server="server" :added="isAdded(server)"
              :adding="addingId === server.id" :success="successId === server.id" @add="openConfig(server)" />
          </div>
        </div>
      </template>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ServerCard v-for="server in filtered" :key="server.id" :server="server" :added="isAdded(server)"
          :adding="addingId === server.id" :success="successId === server.id" @add="openConfig(server)" />
        <div v-if="filtered.length === 0" class="col-span-3 py-16 text-center">
          <p class="text-sm" style="color: var(--text-tertiary);">
            {{ isSearching ? 'No servers found for this search.' : 'No servers match your filters.' }}
          </p>
        </div>
      </div>
    </div>

    <AppModal :open="!!configServer" :title="`Configure ${configServer?.name}`" size="md" :closable="!configSubmitting"
      @close="configServer = null">
      <div v-if="configServer" class="flex flex-col gap-4">
        <AppAlert v-if="configError" :message="configError" type="error" />
        <p class="text-sm" style="color: var(--text-secondary);">
          {{ configServer.description }}
        </p>
        <div class="flex flex-col gap-3">
          <div v-for="envVar in configServer.envVars" :key="envVar.key">
            <AppInput v-model="configEnvValues[envVar.key]"
              :label="`${envVar.key}${envVar.required ? '' : ' (optional)'}`" :placeholder="envVar.placeholder ?? ''"
              :id="`env-${envVar.key}`" />
            <p v-if="envVar.description" class="text-xs mt-1" style="color: var(--text-tertiary);">{{ envVar.description
            }}
            </p>
          </div>
        </div>
        <div class="rounded-lg p-3 text-xs border"
          style="background: var(--bg-muted); border-color: var(--border-default); color: var(--text-secondary);">
          This will create an endpoint with namespace <code class="font-mono px-1 rounded"
            style="background: var(--bg-surface);">{{ configServer.namespace }}</code>. You can modify it later from the
          Endpoints page.
        </div>
        <!-- Agent select for stdio servers (required — prevents running processes directly on mcp-central) -->
        <div v-if="configServer.transport === 'stdio'">
          <template v-if="agentStore.agents.length > 0">
            <AppListbox v-model="configAgentId" label="Deploy on agent (required)" placeholder="Select an agent…"
              :options="agentStore.agents.map((a): ListboxOption => ({
                value: a.id,
                label: a.name,
                description: a.isConnected ? 'Connected' : 'Offline',
                icon: `<svg width='10' height='10' viewBox='0 0 10 10'><circle cx='5' cy='5' r='5' fill='${a.isConnected ? '#22c55e' : '#9ca3af'}'/></svg>`,
              }))" />
            <p v-if="!configAgentId" class="text-xs mt-1" style="color: #ca8a04;">
              Select an agent to run this server (offline agents are accepted).
            </p>
          </template>
          <div v-else class="rounded-lg p-3 text-xs border"
            style="border-color: #ca8a04; color: #ca8a04; background: rgba(202,138,4,.06);">
            No agents available. Install and connect a local agent first — stdio servers cannot run directly on MCP
            Central.
          </div>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" :disabled="configSubmitting" @click="configServer = null">Cancel</AppButton>
        <AppButton :loading="configSubmitting" :disabled="configSubmitting || !isConfigValid" @click="submitConfig">Add
          Endpoint</AppButton>
      </template>
    </AppModal>
  </AppLayout>
</template>
