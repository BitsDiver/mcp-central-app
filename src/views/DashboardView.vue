<script setup lang="ts">
  import { computed, onMounted, ref, markRaw, type Component } from 'vue';
  import AppLayout from '@/components/layout/AppLayout.vue';
  import ArchitectureDiagram from '@/components/dashboard/ArchitectureDiagram.vue';
  import AIClientInstallButton from '@/components/dashboard/AIClientInstallButton.vue';
  import { useStatusStore } from '@/stores/status';
  import { useToolStore } from '@/stores/tools';
  import { useTenantStore } from '@/stores/tenant';
  import { useEndpointStore } from '@/stores/endpoints';
  import { useAgentStore } from '@/stores/agents';
  import { useRegistry } from '@/composables/useRegistry';
  import StatusBadge from '@/components/ui/StatusBadge.vue';
  import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
  import type { EndpointStatus, UpstreamStatus } from '@/types';
  import { FlaskConical, ArrowRight, Server, Link, Router, Home } from 'lucide-vue-next';

  const statusStore = useStatusStore();
  const toolStore = useToolStore();
  const tenantStore = useTenantStore();
  const endpointStore = useEndpointStore();
  const agentStore = useAgentStore();
  const { namespaceMap } = useRegistry();

  onMounted(async () => {
    if (statusStore.upstreams.length === 0) await statusStore.load();
    if (toolStore.tools.length === 0) await toolStore.load();
    if (endpointStore.endpoints.length === 0) await endpointStore.load();
    if (agentStore.agents.length === 0) await agentStore.load();
  });

  // ── Error tooltip (Teleported to escape overflow contexts) ──
  const errorTipEndpoint = ref<UpstreamStatus | null>(null);
  const errorTipPos = ref({ x: 0, y: 0 });

  function showErrorTip(e: MouseEvent, upstream: UpstreamStatus) {
    errorTipEndpoint.value = upstream;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    errorTipPos.value = { x: rect.right, y: rect.top + rect.height / 2 };
  }

  function hideErrorTip() {
    errorTipEndpoint.value = null;
  }

  /** Returns the agent that owns the given endpoint, if any */
  function getAgentForEndpoint(endpointId: string) {
    const ep = endpointStore.endpoints.find((e) => e.id === endpointId);
    if (!ep?.agentId) return null;
    return agentStore.agents.find((a) => a.id === ep.agentId) ?? null;
  }

  const stats = computed(() => [
    {
      label: 'Active Tools',
      value: `${toolStore.tools.filter(t => !t.isDisabled).length} / ${toolStore.count}`,
      icon: markRaw(FlaskConical) as Component,
      color: 'text-blue-500',
      darkBg: 'rgba(59,130,246,0.12)',
    },
    {
      label: 'Connected MCP Servers',
      value: statusStore.connectedCount,
      icon: markRaw(ArrowRight) as Component,
      color: 'text-green-500',
      darkBg: 'rgba(34,197,94,0.12)',
    },
    {
      label: 'Total MCP Servers',
      value: statusStore.upstreams.length,
      icon: markRaw(Server) as Component,
      color: 'text-amber-500',
      darkBg: 'rgba(245,158,11,0.12)',
    },
    {
      label: 'Local Agents',
      value: agentStore.agents.length,
      icon: markRaw(Router) as Component,
      color: 'text-purple-500',
      darkBg: 'rgba(139,92,246,0.12)',
    },
  ]);

  const isLoading = computed(() => statusStore.isLoading || toolStore.isLoading);
</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 class="text-xl font-semibold flex items-center gap-2" style="color: var(--text-primary);">
            <Home :size="20" :stroke-width="2" />
            Dashboard
          </h1>
          <p class="text-sm mt-1" style="color: var(--text-secondary);">
            {{ tenantStore.selectedTenant?.name ?? 'No tenant selected' }}
          </p>
        </div>
        <AIClientInstallButton />
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <template v-if="isLoading">
          <div v-for="i in 4" :key="i" class="card p-5">
            <SkeletonBlock height="1rem" width="60%" />
            <SkeletonBlock height="2rem" width="40%" class="mt-3" />
          </div>
        </template>
        <template v-else>
          <div v-for="stat in stats" :key="stat.label" class="card p-5 flex items-start gap-4">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              :style="`background: ${stat.darkBg}`">
              <component :is="stat.icon" :size="20" :stroke-width="1.75" :class="stat.color" />
            </div>
            <div>
              <p class="text-xs font-medium" style="color: var(--text-tertiary);">{{ stat.label }}</p>
              <p class="text-2xl font-bold mt-0.5" style="color: var(--text-primary);">{{ stat.value }}</p>
            </div>
          </div>
        </template>
      </div>

      <div class="mb-6">
        <ArchitectureDiagram />
      </div>

      <div class="card overflow-hidden">
        <div class="px-5 py-4 border-b flex items-center justify-between" style="border-color: var(--border-default);">
          <h2 class="text-sm font-semibold" style="color: var(--text-primary);">MCP Servers Status</h2>
          <span class="badge badge-neutral text-xs">{{ statusStore.upstreams.length }} servers</span>
        </div>

        <div v-if="isLoading" class="p-5 flex flex-col gap-3">
          <div v-for="i in 3" :key="i" class="flex items-center gap-4">
            <SkeletonBlock height="1rem" width="30%" />
            <SkeletonBlock height="1rem" width="20%" />
            <SkeletonBlock height="1rem" width="15%" />
          </div>
        </div>

        <div v-else-if="statusStore.upstreams.length === 0" class="py-12 text-center">
          <p class="text-sm" style="color: var(--text-tertiary);">No MCP servers configured.</p>
          <router-link to="/registry" class="text-sm text-blue-500 hover:underline mt-1 inline-block">Browse the
            registry to
            add servers →</router-link>
        </div>

        <div v-else class="divide-y" style="border-color: var(--border-default);">
          <div v-for="upstream in statusStore.upstreams" :key="upstream.endpointId"
            class="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[var(--bg-hover)]">
            <!-- Server icon: registry icon letters or generic plug -->
            <div class="shrink-0">
              <div v-if="namespaceMap[upstream.namespace]"
                class="w-7 h-7 rounded-md text-[10px] font-bold text-white flex items-center justify-center"
                :style="`background: ${namespaceMap[upstream.namespace].color}`">
                {{ namespaceMap[upstream.namespace].iconLetters }}
              </div>
              <div v-else class="w-7 h-7 rounded-md flex items-center justify-center"
                style="background: var(--bg-muted); border: 1px solid var(--border-default);">
                <Link :size="14" :stroke-width="1.75" style="color: var(--text-tertiary);" />
              </div>
            </div>
            <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
              <p class="text-sm font-medium truncate" style="color: var(--text-primary);">{{ upstream.namespace }}</p>
              <span v-if="getAgentForEndpoint(upstream.endpointId)"
                class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                style="background: rgba(139,92,246,0.12); color: #7c3aed; border: 1px solid rgba(139,92,246,0.25);">
                <Monitor :size="9" :stroke-width="2" />
                {{ getAgentForEndpoint(upstream.endpointId)!.name }}
              </span>
            </div>
            <div v-if="upstream.status === 'error' && upstream.lastError" class="relative"
              @mouseenter="showErrorTip($event, upstream)" @mouseleave="hideErrorTip">
              <StatusBadge :status="(upstream.status as EndpointStatus)" />
            </div>
            <StatusBadge v-else :status="(upstream.status as EndpointStatus)" />
            <div class="text-right shrink-0">
              <p class="text-sm font-medium" style="color: var(--text-primary);">{{
                toolStore.getActiveCountForEndpoint(upstream.endpointId) }}/{{
                  toolStore.getTotalCountForEndpoint(upstream.endpointId) }}</p>
              <p class="text-xs" style="color: var(--text-tertiary);">tools</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>

  <!-- ── Error tooltip: Teleported so it escapes all overflow/stacking contexts ── -->
  <Teleport to="body">
    <Transition name="errtip-fade">
      <div v-if="errorTipEndpoint" class="errtip-float"
        :style="{ left: (errorTipPos.x + 10) + 'px', top: errorTipPos.y + 'px' }">
        <span class="block font-semibold mb-1" style="color: var(--text-primary);">Error details</span>
        {{ errorTipEndpoint.lastError }}
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .errtip-float {
    position: fixed;
    transform: translateY(-50%);
    z-index: 9999;
    min-width: 260px;
    max-width: min(480px, 90vw);
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-default);
    background: var(--bg-overlay);
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
    pointer-events: none;
  }

  .errtip-fade-enter-active,
  .errtip-fade-leave-active {
    transition: opacity 0.12s ease;
  }

  .errtip-fade-enter-from,
  .errtip-fade-leave-to {
    opacity: 0;
  }
</style>
