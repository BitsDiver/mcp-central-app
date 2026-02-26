<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import AppLayout from '@/components/layout/AppLayout.vue';
  import AppButton from '@/components/ui/AppButton.vue';
  import AppModal from '@/components/ui/AppModal.vue';
  import AppInput from '@/components/ui/AppInput.vue';
  import AppAlert from '@/components/ui/AppAlert.vue';
  import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
  import ServerCard from '@/components/registry/ServerCard.vue';
  import type { RegistryServer } from '@/data/mcpRegistry';
  import { useRegistry } from '@/composables/useRegistry';
  import { useEndpointStore } from '@/stores/endpoints';
  import { useAgentStore } from '@/stores/agents';
  import { useError } from '@/composables/useError';

  const endpointStore = useEndpointStore();
  const agentStore = useAgentStore();
  const { resolveMessage } = useError();
  const { servers, categories, isLoading } = useRegistry();

  onMounted(async () => {
    if (agentStore.agents.length === 0) await agentStore.load();
  });

  const search = ref('');
  const activeCategory = ref('All');
  const addingId = ref<string | null>(null);
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
    const q = search.value.toLowerCase().trim();
    return servers.value.filter((s) => {
      const matchesCategory = activeCategory.value === 'All' || s.category === activeCategory.value;
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.tags ?? []).some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  });

  const groupedByCategory = computed(() => {
    if (activeCategory.value !== 'All' || search.value.trim()) return null;
    const groups: Record<string, RegistryServer[]> = {};
    for (const server of filtered.value) {
      if (!groups[server.category]) groups[server.category] = [];
      groups[server.category].push(server);
    }
    return groups;
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
        payload.headers = {};
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
      <div class="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 class="text-xl font-semibold" style="color: var(--text-primary);">MCP Registry</h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            Discover and add MCP servers from the official registry and community
          </p>
        </div>
        <!-- Search -->
        <div class="relative shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style="color: var(--text-tertiary);">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input v-model="search" type="search" placeholder="Search servers…"
            class="pl-8 pr-3 py-2 text-sm rounded-lg border outline-none transition-colors"
            style="min-width: 220px; background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);" />
        </div>
      </div>

      <div v-if="errorMessage" class="mb-4">
        <AppAlert :message="errorMessage" type="error" />
      </div>

      <!-- Category filter chips -->
      <div class="flex gap-1.5 flex-wrap mb-5">
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

      <!-- Loading skeletons -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
          <p class="text-sm" style="color: var(--text-tertiary);">No servers match your search.</p>
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
        <!-- Agent select for stdio servers -->
        <div v-if="configServer.transport === 'stdio' && agentStore.agents.length > 0">
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">Deploy on agent</label>
          <select v-model="configAgentId" class="w-full px-3 py-2 text-sm rounded-lg border outline-none"
            style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);">
            <option value="">None (direct connection)</option>
            <option v-for="agent in agentStore.agents" :key="agent.id" :value="agent.id">
              {{ agent.name }}{{ agent.isConnected ? ' ●' : ' ○' }}
            </option>
          </select>
          <p v-if="!configAgentId" class="text-xs mt-1" style="color: #ca8a04;">
            stdio servers require a local agent to run. Select one above.
          </p>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" :disabled="configSubmitting" @click="configServer = null">Cancel</AppButton>
        <AppButton :loading="configSubmitting" @click="submitConfig">Add Endpoint</AppButton>
      </template>
    </AppModal>
  </AppLayout>
</template>
