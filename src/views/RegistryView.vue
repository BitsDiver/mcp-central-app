<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import AppLayout from '@/components/layout/AppLayout.vue';
  import AppButton from '@/components/ui/AppButton.vue';
  import AppModal from '@/components/ui/AppModal.vue';
  import AppInput from '@/components/ui/AppInput.vue';
  import AppAlert from '@/components/ui/AppAlert.vue';
  import AppListbox from '@/components/ui/AppListbox.vue';
  import RegistryBrowser from '@/components/registry/RegistryBrowser.vue';
  import type { RegistryServer } from '@/data/mcpRegistry';
  import type { ListboxOption } from '@/types';
  import { useEndpointStore } from '@/stores/endpoints';
  import { useAgentStore } from '@/stores/agents';
  import { useError } from '@/composables/useError';
  import { Notebook } from 'lucide-vue-next';

  const endpointStore = useEndpointStore();
  const agentStore = useAgentStore();
  const { resolveMessage } = useError();

  onMounted(async () => {
    if (agentStore.agents.length === 0) await agentStore.load();
  });

  const successId = ref<string | null>(null);

  const configServer = ref<RegistryServer | null>(null);
  const configEnvValues = ref<Record<string, string>>({});
  const configAgentId = ref<string>('');
  const configSubmitting = ref(false);
  const configError = ref<string | null>(null);

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
      <div class="mb-6">
        <h1 class="text-xl font-semibold flex items-center gap-2" style="color: var(--text-primary);">
          <Notebook :size="20" :stroke-width="2" />
          MCP Registry
        </h1>
        <p class="text-sm mt-1" style="color: var(--text-secondary);">
          Discover and add MCP servers from the official registry and community
        </p>
      </div>

      <RegistryBrowser mode="browse" :success-id="successId" @configure="openConfig" />
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
