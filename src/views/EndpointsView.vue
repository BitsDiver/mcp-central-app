<script setup lang="ts">
  import { ref, computed, onMounted, markRaw } from 'vue';
  import AppLayout from '@/components/layout/AppLayout.vue';
  import AppButton from '@/components/ui/AppButton.vue';
  import AppModal from '@/components/ui/AppModal.vue';
  import AppInput from '@/components/ui/AppInput.vue';
  import AppListbox from '@/components/ui/AppListbox.vue';
  import AppTextarea from '@/components/ui/AppTextarea.vue';
  import AppAlert from '@/components/ui/AppAlert.vue';
  import AppToggle from '@/components/ui/AppToggle.vue';
  import StatusBadge from '@/components/ui/StatusBadge.vue';
  import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
  import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
  import EmptyState from '@/components/ui/EmptyState.vue';
  import RegistryPickerModal from '@/components/endpoints/RegistryPickerModal.vue';
  import AddAgentModal from '@/components/endpoints/AddAgentModal.vue';
  import EditAgentModal from '@/components/endpoints/EditAgentModal.vue';
  import { useEndpointStore } from '@/stores/endpoints';
  import { useAgentStore } from '@/stores/agents';
  import { useStatusStore } from '@/stores/status';
  import { useToolStore } from '@/stores/tools';
  import { useError } from '@/composables/useError';
  import type { Endpoint, EndpointStatus, AgentWithStatus } from '@/types';
  import type { RegistryServer } from '@/data/mcpRegistry';
  import { Globe, Terminal, Users, Activity, LayoutGrid, Router, Plus, ArrowRight, ChevronDown, RefreshCw, SquarePen, Trash2, Link, DatabaseZap } from 'lucide-vue-next';


  const endpointStore = useEndpointStore();
  const agentStore = useAgentStore();
  const statusStore = useStatusStore();
  const toolStore = useToolStore();
  const { resolveMessage, useFormErrors } = useError();

  onMounted(async () => {
    if (endpointStore.endpoints.length === 0) await endpointStore.load();
    if (statusStore.upstreams.length === 0) await statusStore.load();
    if (agentStore.agents.length === 0) await agentStore.load();
    agentStore.setupSocketListeners();
  });

  const search = ref('');
  const showModal = ref(false);
  const showRegistryModal = ref(false);
  const pendingRegistryIcon = ref<{ iconLetters?: string; iconUrl?: string; iconColor?: string; } | null>(null);
  const showAgentModal = ref(false);
  const editingEndpoint = ref<Endpoint | null>(null);
  const submitting = ref(false);
  const { errors, setFromApiError, clearErrors } = useFormErrors();
  const globalError = computed(() => errors.value['_global']);

  const deleteTarget = ref<Endpoint | null>(null);
  const deleting = ref(false);
  const refreshing = ref<string | null>(null);

  // Agent edit / delete state
  const editingAgent = ref<AgentWithStatus | null>(null);
  const agentDeleteTarget = ref<AgentWithStatus | null>(null);
  const agentDeleting = ref(false);

  // Collapsed state for agent cards (agentId → boolean)
  const collapsedAgents = ref<Set<string>>(new Set());

  function toggleAgentCollapse(agentId: string) {
    if (collapsedAgents.value.has(agentId)) {
      collapsedAgents.value.delete(agentId);
    } else {
      collapsedAgents.value.add(agentId);
    }
  }

  const form = ref({
    name: '',
    namespace: '',
    transport: 'streamable-http' as 'streamable-http' | 'stdio' | 'sse' | 'a2a',
    url: '',
    command: '',
    args: '',
    headers: '',
    env: '',
    a2aApiKey: '',
    isEnabled: true,
    agentId: '',
  });

  const transportOptions = [
    {
      value: 'streamable-http',
      label: 'Streamable HTTP',
      description: 'Connect to a remote MCP server via HTTP',
      icon: markRaw(Globe),
    },
    {
      value: 'stdio',
      label: 'stdio (via local agent)',
      description: 'Run a local process through a tunnel agent',
      icon: markRaw(Terminal),
    },
    {
      value: 'a2a',
      label: 'A2A Agent (HTTP+JSON)',
      description: 'Connect to an external A2A v1.0 agent',
      icon: markRaw(Users),
    },
  ];

  const agentOptions = computed(() => [
    {
      value: '',
      label: 'None (direct server connection)',
      icon: markRaw(Activity),
    },
    ...agentStore.agents.map((a) => ({
      value: a.id,
      label: a.name,
      description: a.isConnected ? 'Connected' : 'Offline',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" fill="${a.isConnected ? '#22c55e' : '#9ca3af'}" stroke="none"/></svg>`,
    })),
  ]);

  /** Endpoints not managed by any agent (shown in main table) */
  const directEndpoints = computed(() =>
    endpointStore.endpoints.filter((e) => !e.agentId),
  );

  const isFormValid = computed(() => {
    const f = form.value;
    if (!f.name.trim() || !f.namespace.trim()) return false;
    if (f.transport === 'streamable-http' || f.transport === 'a2a') return !!f.url.trim();
    // stdio must be assigned to an agent — prevents running processes directly on mcp-central.
    // Offline agents are accepted; the endpoint will activate when the agent reconnects.
    if (f.transport === 'stdio') return !!f.command.trim() && !!f.agentId;
    return true;
  });

  /** Endpoints managed by a specific agent */
  function agentEndpoints(agentId: string): Endpoint[] {
    return endpointStore.endpoints.filter((e) => e.agentId === agentId);
  }

  function getUpstreamStatus(endpointId: string): EndpointStatus {
    // Prefer the connectionStatus field on the endpoint itself (populated by listEndpoints
    // and kept current via connection_status socket events patched into the store).
    // Fall back to statusStore for any endpoint not yet in the endpoint list.
    const ep = endpointStore.endpoints.find((e) => e.id === endpointId);
    if (ep?.connectionStatus) return ep.connectionStatus;
    return (statusStore.upstreams.find((u) => u.endpointId === endpointId)?.status ?? 'disconnected') as EndpointStatus;
  }

  const filtered = computed(() => {
    const q = search.value.toLowerCase().trim();
    if (!q) return directEndpoints.value;
    return directEndpoints.value.filter(
      (e) => e.name.toLowerCase().includes(q) || e.namespace.toLowerCase().includes(q)
    );
  });

  function openAdd() {
    editingEndpoint.value = null;
    pendingRegistryIcon.value = null;
    form.value = { name: '', namespace: '', transport: 'streamable-http', url: '', command: '', args: '', headers: '', env: '', a2aApiKey: '', isEnabled: true, agentId: '' };
    clearErrors();
    showModal.value = true;
  }

  function openFromRegistry(server: RegistryServer) {
    editingEndpoint.value = null;
    pendingRegistryIcon.value = {
      iconLetters: server.iconLetters,
      iconUrl: server.iconUrl,
      iconColor: server.color,
    };
    form.value = {
      name: server.name,
      namespace: server.namespace,
      transport: server.transport,
      url: server.url ?? '',
      command: server.command ?? '',
      args: (server.args ?? []).join('\n'),
      headers: '',
      env: '',
      a2aApiKey: '',
      isEnabled: true,
      agentId: '',
    };
    clearErrors();
    showModal.value = true;
  }

  function openEdit(ep: Endpoint) {
    editingEndpoint.value = ep;
    const isA2a = ep.transport === 'a2a';
    form.value = {
      name: ep.name,
      namespace: ep.namespace,
      transport: ep.transport === 'agent-tunnel' ? 'streamable-http' : ep.transport,
      url: ep.url ?? '',
      command: ep.command ?? '',
      args: ep.args.join('\n'),
      headers: isA2a ? '' : Object.entries(ep.headers).map(([k, v]) => `${k}: ${v}`).join('\n'),
      env: Object.entries(ep.env).map(([k, v]) => `${k}=${v}`).join('\n'),
      a2aApiKey: isA2a ? ((ep.headers as Record<string, string>)?.apiKey ?? '') : '',
      isEnabled: ep.isEnabled,
      agentId: ep.agentId ?? '',
    };
    clearErrors();
    showModal.value = true;
  }

  function parseKVLines(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const sep = trimmed.indexOf(':');
      if (sep > 0) {
        result[trimmed.slice(0, sep).trim()] = trimmed.slice(sep + 1).trim();
      }
    }
    return result;
  }

  function parseEnvLines(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1);
      }
    }
    return result;
  }

  async function submit() {
    clearErrors();
    if (!form.value.name.trim()) {
      errors.value['name'] = 'Name is required.';
      return;
    }
    if (!form.value.namespace.trim()) {
      errors.value['namespace'] = 'Namespace is required.';
      return;
    }
    submitting.value = true;
    try {
      const payload: Record<string, unknown> = {
        name: form.value.name.trim(),
        namespace: form.value.namespace.trim(),
        transport: form.value.transport,
        isEnabled: form.value.isEnabled,
      };
      if (form.value.transport === 'streamable-http') {
        payload.url = form.value.url.trim() || undefined;
        payload.headers = parseKVLines(form.value.headers);
      } else if (form.value.transport === 'a2a') {
        payload.url = form.value.url.trim() || undefined;
        if (form.value.a2aApiKey.trim()) {
          payload.headers = { apiKey: form.value.a2aApiKey.trim() };
        }
      } else {
        payload.command = form.value.command.trim() || undefined;
        payload.args = form.value.args.split('\n').map((a) => a.trim()).filter(Boolean);
        payload.env = parseEnvLines(form.value.env);
      }
      if (form.value.agentId) payload.agentId = form.value.agentId;
      if (!editingEndpoint.value && pendingRegistryIcon.value) {
        const icon = pendingRegistryIcon.value;
        if (icon.iconLetters) payload.iconLetters = icon.iconLetters;
        if (icon.iconUrl) payload.iconUrl = icon.iconUrl;
        if (icon.iconColor) payload.iconColor = icon.iconColor;
      }
      if (editingEndpoint.value) {
        await endpointStore.update(editingEndpoint.value.id, payload);
      } else {
        await endpointStore.create(payload);
      }
      pendingRegistryIcon.value = null;
      showModal.value = false;
    } catch (err) {
      setFromApiError(err);
    } finally {
      submitting.value = false;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget.value) return;
    deleting.value = true;
    try {
      await endpointStore.remove(deleteTarget.value.id);
      deleteTarget.value = null;
    } catch (err) {
      const toast = (await import('@/stores/toast')).useToastStore();
      toast.error(resolveMessage(err));
    } finally {
      deleting.value = false;
    }
  }

  async function confirmDeleteAgent() {
    if (!agentDeleteTarget.value) return;
    agentDeleting.value = true;
    try {
      await agentStore.remove(agentDeleteTarget.value.id);
      agentDeleteTarget.value = null;
    } catch (err) {
      const toast = (await import('@/stores/toast')).useToastStore();
      toast.error(resolveMessage(err));
    } finally {
      agentDeleting.value = false;
    }
  }

  async function toggle(ep: Endpoint) {
    try {
      await endpointStore.toggle(ep.id, !ep.isEnabled);
    } catch (err) {
      const toast = (await import('@/stores/toast')).useToastStore();
      toast.error(resolveMessage(err));
    }
  }

  async function refresh(ep: Endpoint) {
    if (refreshing.value) return;
    refreshing.value = ep.id;
    try {
      await endpointStore.refresh(ep.id);
    } catch (err) {
      const toast = (await import('@/stores/toast')).useToastStore();
      toast.error(resolveMessage(err));
    } finally {
      refreshing.value = null;
    }
  }
</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold flex items-center gap-2" style="color: var(--text-primary);">
            <DatabaseZap :size="20" :stroke-width="2" />
            MCP Servers
          </h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">Manage your upstream MCP servers</p>
        </div>
        <div class="flex items-center gap-2">
          <AppButton variant="secondary" @click="showRegistryModal = true">
            <LayoutGrid :size="16" :stroke-width="2" />
            Browse Registry
          </AppButton>
          <AppButton variant="secondary" @click="showAgentModal = true">
            <Router :size="16" :stroke-width="2" />
            Add Local Agent
          </AppButton>
          <AppButton @click="openAdd">
            <Plus :size="16" :stroke-width="2.5" />
            Add MCP Server
          </AppButton>
        </div>
      </div>

      <div class="mb-4">
        <input v-model="search" type="search" placeholder="Search MCP servers…"
          class="w-full max-w-xs px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
          style="color: var(--text-primary); border-color: var(--border-default);"
          :onfocus="(e: FocusEvent) => (e.target as HTMLElement).style.borderColor = 'var(--border-focus)'"
          :onblur="(e: FocusEvent) => (e.target as HTMLElement).style.borderColor = 'var(--border-default)'" />
      </div>

      <!-- Direct endpoints (MCP Central) -->
      <div class="mb-6">
        <h2 class="text-sm font-semibold mb-3" style="color: var(--text-primary);">
          MCP Central
          <span class="ml-2 text-xs font-normal" style="color: var(--text-tertiary);">{{ filtered.length }}
            server{{ filtered.length !== 1 ? 's' : '' }}</span>
        </h2>

        <div v-if="endpointStore.isLoading" class="card overflow-hidden">
          <div v-for="i in 4" :key="i" class="flex items-center gap-4 px-5 py-4 border-b"
            style="border-color: var(--border-default);">
            <SkeletonBlock height="1rem" width="25%" />
            <SkeletonBlock height="1rem" width="15%" />
            <SkeletonBlock height="1.5rem" width="80px" />
          </div>
        </div>

        <EmptyState v-else-if="filtered.length === 0" title="No endpoints found"
          :description="search ? 'Try a different search term.' : 'Add your first MCP server to get started.'">
          <template #icon>
            <ArrowRight :size="24" :stroke-width="1.5" style="color: var(--text-tertiary);" />
          </template>
          <div v-if="!search" class="flex items-center gap-2">
            <AppButton size="sm" variant="secondary" @click="showRegistryModal = true">Browse Registry</AppButton>
            <AppButton size="sm" @click="openAdd">Add MCP Server</AppButton>
          </div>
        </EmptyState>

        <div v-else class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b" style="border-color: var(--border-default);">
                  <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                    style="color: var(--text-tertiary);">Name</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell"
                    style="color: var(--text-tertiary);">Namespace</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell"
                    style="color: var(--text-tertiary);">Transport</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                    style="color: var(--text-tertiary);">Status</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell"
                    style="color: var(--text-tertiary);">Tools</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                    style="color: var(--text-tertiary);">Enabled</th>
                  <th class="px-5 py-3" />
                </tr>
              </thead>
              <tbody class="divide-y" style="border-color: var(--border-default);">
                <tr v-for="ep in filtered" :key="ep.id" class="transition-colors hover:bg-[var(--bg-hover)]">
                  <td class="px-5 py-3">
                    <div class="flex items-center gap-2">
                      <!-- Registry icon: colored chip with letters or image -->
                      <span v-if="ep.iconLetters || ep.iconUrl"
                        class="w-6 h-6 rounded flex items-center justify-center shrink-0 text-[9px] font-bold overflow-hidden"
                        :style="`background: ${ep.iconColor ?? '#6366f1'}`">
                        <img v-if="ep.iconUrl" :src="ep.iconUrl" class="w-full h-full object-cover"
                          :alt="ep.iconLetters || 'MCP Server Icon'" />
                        <span v-else style="color: white;">{{ ep.iconLetters }}</span>
                      </span>
                      <!-- Fallback: muted chip with link icon -->
                      <span v-else class="w-6 h-6 rounded flex items-center justify-center shrink-0"
                        style="background: var(--bg-muted); border: 1px solid var(--border-default);">
                        <Link :size="12" :stroke-width="1.75" style="color: var(--text-tertiary);" />
                      </span>
                      <router-link :to="`/endpoints/${ep.id}`" class="font-medium text-blue-500 hover:underline">{{
                        ep.name
                      }}</router-link>
                    </div>
                  </td>
                  <td class="px-5 py-3 hidden sm:table-cell">
                    <code class="text-xs px-1.5 py-0.5 rounded font-mono"
                      style="background: var(--bg-muted); color: var(--text-secondary);">{{ ep.namespace }}</code>
                  </td>
                  <td class="px-5 py-3 hidden md:table-cell" style="color: var(--text-secondary);">{{ ep.transport }}
                  </td>
                  <td class="px-5 py-3">
                    <StatusBadge :status="getUpstreamStatus(ep.id)" />
                  </td>
                  <td class="px-5 py-3 hidden lg:table-cell" style="color: var(--text-primary);">{{
                    toolStore.getActiveCountForEndpoint(ep.id) }}/{{ toolStore.getTotalCountForEndpoint(ep.id) }}</td>
                  <td class="px-5 py-3">
                    <AppToggle :model-value="ep.isEnabled" @update:model-value="toggle(ep)" />
                  </td>
                  <td class="px-5 py-3">
                    <div class="flex items-center gap-1 justify-end">
                      <AppButton variant="ghost" size="sm" :loading="refreshing === ep.id"
                        :title="ep.connectionStatus === 'connected' ? 'Re-list tools' : 'Reconnect'"
                        @click="refresh(ep)">
                        <RefreshCw v-if="refreshing !== ep.id" :size="15" :stroke-width="2" />
                      </AppButton>
                      <AppButton variant="ghost" size="sm" @click="openEdit(ep)">
                        <SquarePen :size="15" :stroke-width="2" />
                      </AppButton>
                      <AppButton variant="ghost" size="sm" @click="deleteTarget = ep">
                        <Trash2 :size="15" :stroke-width="2" class="text-red-500" />
                      </AppButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Separator between direct endpoints and agents -->
      <hr v-if="agentStore.agents.length > 0" class="my-6" style="border-color: var(--border-default);" />

      <!-- Local agents section -->
      <div v-if="agentStore.agents.length > 0" class="mb-6">
        <h2 class="text-sm font-semibold mb-3" style="color: var(--text-primary);">
          Local Agents
          <span class="ml-2 text-xs font-normal" style="color: var(--text-tertiary);">{{ agentStore.agents.length }}
            agent{{ agentStore.agents.length !== 1 ? 's' : '' }}</span>
        </h2>
        <div class="flex flex-col gap-3">
          <div v-for="agent in agentStore.agents" :key="agent.id" class="card overflow-hidden">
            <!-- Agent header row -->
            <div class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
              @click="toggleAgentCollapse(agent.id)">
              <ChevronDown :size="14" :stroke-width="2"
                class="transition-transform shrink-0" style="color: var(--text-tertiary);"
                :style="collapsedAgents.has(agent.id) ? 'transform:rotate(-90deg)' : ''" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm" style="color: var(--text-primary);">{{ agent.name }}</span>
                  <code class="text-[11px] px-1.5 py-0.5 rounded font-mono"
                    style="background: var(--bg-muted); color: var(--text-secondary);">{{ agent.namespace }}</code>
                  <span class="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    :style="agent.isConnected ? 'background:rgba(34,197,94,.12);color:#16a34a' : 'background:var(--bg-muted);color:var(--text-tertiary);'">
                    {{ agent.isConnected ? '● Online' : '○ Offline' }}
                  </span>
                  <span v-if="agent.version" class="text-[10px] px-1.5 py-0.5 rounded font-mono"
                    style="background: var(--bg-muted); color: var(--text-tertiary);">v{{ agent.version }}</span>
                  <span v-if="agent.connectedIp" class="text-xs" style="color: var(--text-tertiary);">— {{
                    agent.connectedIp }}</span>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0" @click.stop>
                <span class="text-xs" style="color: var(--text-tertiary);">{{ agentEndpoints(agent.id).length }}
                  MCP server{{ agentEndpoints(agent.id).length > 1 ? 's' : '' }}</span>
                <AppButton variant="ghost" size="sm" title="Edit agent" @click="editingAgent = agent">
                  <SquarePen :size="14" :stroke-width="2" />
                </AppButton>
                <AppButton variant="ghost" size="sm" title="Remove agent" @click="agentDeleteTarget = agent">
                  <Trash2 :size="14" :stroke-width="2" class="text-red-500" />
                </AppButton>
              </div>
            </div>
            <!-- Agent endpoints list -->
            <div v-if="!collapsedAgents.has(agent.id)" class="border-t" style="border-color: var(--border-default);">
              <div v-if="agentEndpoints(agent.id).length === 0" class="px-4 py-3 text-sm"
                style="color: var(--text-tertiary);">
                No MCP server assigned to this agent yet. Add an MCP server and select this agent as the tunnel.
              </div>
              <div v-for="ep in agentEndpoints(agent.id)" :key="ep.id"
                class="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors"
                style="border-color: var(--border-default);">
                <div class="flex-1 min-w-0 flex items-center gap-2">
                  <!-- Registry icon: colored chip -->
                  <span v-if="ep.iconLetters || ep.iconUrl"
                    class="w-5 h-5 rounded flex items-center justify-center shrink-0 text-[8px] font-bold overflow-hidden">
                    <img v-if="ep.iconUrl" :src="ep.iconUrl" class="w-full h-full object-cover"
                      :alt="ep.iconLetters ?? ''" />
                    <span v-else style="color: white;">{{ ep.iconLetters }}</span>
                  </span>
                  <!-- Fallback: muted chip with link icon -->
                  <span v-else class="w-5 h-5 rounded flex items-center justify-center shrink-0"
                    style="background: var(--bg-muted); border: 1px solid var(--border-default);">
                    <Link :size="10" :stroke-width="1.75" style="color: var(--text-tertiary);" />
                  </span>
                  <router-link :to="`/endpoints/${ep.id}`" class="font-medium text-sm text-blue-500 hover:underline">{{
                    ep.name }}</router-link>
                  <code class="ml-1 text-[11px] px-1 py-0.5 rounded font-mono"
                    style="background: var(--bg-muted); color: var(--text-secondary);">{{ ep.namespace }}</code>
                </div>
                <StatusBadge :status="getUpstreamStatus(ep.id)" />
                <span class="text-xs hidden sm:inline" style="color: var(--text-tertiary);">
                  {{ toolStore.getActiveCountForEndpoint(ep.id) }}/{{ toolStore.getTotalCountForEndpoint(ep.id) }}
                  tools</span>
                <AppToggle :model-value="ep.isEnabled" @update:model-value="toggle(ep)" />
                <div class="flex items-center gap-1">
                  <AppButton variant="ghost" size="sm" :loading="refreshing === ep.id" @click="refresh(ep)">
                    <RefreshCw v-if="refreshing !== ep.id" :size="14" :stroke-width="2" />
                  </AppButton>
                  <AppButton variant="ghost" size="sm" @click="openEdit(ep)">
                    <SquarePen :size="14" :stroke-width="2" />
                  </AppButton>
                  <AppButton variant="ghost" size="sm" @click="deleteTarget = ep">
                    <Trash2 :size="14" :stroke-width="2" class="text-red-500" />
                  </AppButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <AppModal :open="showModal" :title="editingEndpoint ? 'Edit MCP Server' : 'Add MCP Server'" size="lg"
      :closable="!submitting" @close="showModal = false">
      <form @submit.prevent="submit" class="flex flex-col gap-4">
        <AppAlert v-if="globalError" :message="globalError" type="error" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput v-model="form.name" label="Name" placeholder="GitHub MCP" :error="errors['name']" required
            id="ep-name" />
          <AppInput v-model="form.namespace" label="Namespace" placeholder="github" :error="errors['namespace']"
            required id="ep-namespace" />
        </div>
        <AppListbox v-model="form.transport" label="Transport" :options="transportOptions" id="ep-transport" />

        <template v-if="form.transport === 'streamable-http'">
          <AppInput v-model="form.url" label="URL" placeholder="https://mcp.example.com" :error="errors['url']"
            id="ep-url" />
          <AppTextarea v-model="form.headers" label="Upstream server auth headers (key: value, one per line)"
            placeholder="Authorization: Bearer ghp_..." id="ep-headers" :rows="3"
            hint="Sent by central-MCP to authenticate with this upstream server. One header per line in 'Key: Value' format." />
        </template>

        <template v-else-if="form.transport === 'a2a'">
          <AppInput v-model="form.url" label="Agent Base URL" placeholder="https://agent.example.com"
            :error="errors['url']" id="ep-url"
            hint="The base URL of the remote A2A agent. The card will be fetched from {url}/.well-known/agent-card.json." />
          <AppInput v-model="form.a2aApiKey" label="API Key (optional)" placeholder="sk-..." id="ep-a2a-apikey"
            hint="Sent as X-API-Key header when calling the remote A2A agent." />
        </template>

        <template v-else>
          <AppInput v-model="form.command" label="Command" placeholder="npx" :error="errors['command']"
            id="ep-command" />
          <AppTextarea v-model="form.args" label="Arguments (one per line)"
            placeholder="-y&#10;@modelcontextprotocol/server-github" id="ep-args" :rows="3" />
          <AppTextarea v-model="form.env" label="Upstream server credentials (KEY=value, one per line)"
            placeholder="GITHUB_TOKEN=ghp_..." id="ep-env" :rows="3"
            hint="Environment variables injected into the upstream process. Used to authenticate with external services." />
        </template>

        <div class="flex items-center gap-2 pt-1">
          <AppToggle v-model="form.isEnabled" label="Enable immediately after creation" />
        </div>
        <AppListbox v-model="form.agentId" label="Execute via local agent (optional)" :options="agentOptions"
          id="ep-agent" />
        <p v-if="form.transport === 'stdio' && !form.agentId" class="text-xs -mt-2" style="color: #ca8a04;">
          stdio servers must run via a local agent — select one above (offline agents are accepted).
        </p>
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="submitting" @click="showModal = false">Cancel</AppButton>
        <AppButton :loading="submitting" :disabled="submitting || !isFormValid" @click="submit">{{ editingEndpoint ?
          'Save Changes' : 'Add MCP Server' }}
        </AppButton>
      </template>
    </AppModal>

    <ConfirmDialog :open="!!deleteTarget" title="Remove MCP Server"
      :message="`Remove '${deleteTarget?.name}'? This will disconnect the upstream server.`" confirm-label="Remove"
      :loading="deleting" @confirm="confirmDelete" @cancel="deleteTarget = null" />

    <RegistryPickerModal :open="showRegistryModal" @close="showRegistryModal = false" @select="openFromRegistry" />
    <AddAgentModal :open="showAgentModal" @close="showAgentModal = false" />
    <EditAgentModal :open="!!editingAgent" :agent="editingAgent" @close="editingAgent = null" />

    <ConfirmDialog :open="!!agentDeleteTarget" title="Remove Agent"
      :message="`Remove agent '${agentDeleteTarget?.name}'? This will permanently delete the agent and all MCP Servers assigned to it.`"
      confirm-label="Remove Agent" :loading="agentDeleting" @confirm="confirmDeleteAgent"
      @cancel="agentDeleteTarget = null" />
  </AppLayout>
</template>
