<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import AppLayout from '@/components/layout/AppLayout.vue';
  import AppButton from '@/components/ui/AppButton.vue';
  import StatusBadge from '@/components/ui/StatusBadge.vue';
  import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
  import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
  import AppToggle from '@/components/ui/AppToggle.vue';
  import { useEndpointStore } from '@/stores/endpoints';
  import { useStatusStore } from '@/stores/status';
  import { emitTools } from '@/api/socket';
  import type { EndpointStatus, Tool } from '@/types';

  const route = useRoute();
  const router = useRouter();
  const endpointStore = useEndpointStore();
  const statusStore = useStatusStore();

  const endpointId = route.params.id as string;
  const tools = ref<Tool[]>([]);
  const loadingTools = ref(false);
  const toolsError = ref<string | null>(null);
  const showDeleteDialog = ref(false);
  const deleting = ref(false);

  const endpoint = computed(() =>
    endpointStore.endpoints.find((e) => e.id === endpointId) ?? null
  );

  const status = computed(() =>
    (statusStore.upstreams.find((u) => u.endpointId === endpointId)?.status ?? 'disconnected') as EndpointStatus
  );

  onMounted(async () => {
    if (!endpoint.value) await endpointStore.load();
    loadingTools.value = true;
    toolsError.value = null;
    try {
      const res = await emitTools<{ tools: Tool[]; count: number; }>('getEndpointTools', { endpointId });
      if (res.status === 'error') {
        toolsError.value = res.message ?? res.code ?? 'Could not load tools';
      } else {
        tools.value = res.data!.tools;
      }
    } catch (e) {
      toolsError.value = e instanceof Error ? e.message : String(e);
    } finally {
      loadingTools.value = false;
    }
  });

  async function handleToggle() {
    if (!endpoint.value) return;
    await endpointStore.toggle(endpoint.value.id, !endpoint.value.isEnabled);
  }

  async function confirmDelete() {
    if (!endpoint.value) return;
    deleting.value = true;
    try {
      await endpointStore.remove(endpoint.value.id);
      await router.push('/endpoints');
    } finally {
      deleting.value = false;
    }
  }

  function formatDate(d: string | null): string {
    if (!d) return '—';
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
  }

  const toolSearch = ref('');
  const filteredTools = computed(() => {
    const q = toolSearch.value.toLowerCase().trim();
    if (!q) return tools.value;
    return tools.value.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  });

  const expandedTool = ref<string | null>(null);

  function getNamespace(name: string): string {
    const idx = name.indexOf('__');
    return idx > -1 ? name.slice(0, idx) : '';
  }

  function getShortName(name: string): string {
    const idx = name.indexOf('__');
    return idx > -1 ? name.slice(idx + 2) : name;
  }

  function nsHue(ns: string): number {
    let h = 0;
    for (let i = 0; i < ns.length; i++) h = (h * 31 + ns.charCodeAt(i)) & 0xffff;
    return h % 360;
  }

  function cleanDescription(desc: string, ns: string): string {
    if (!desc) return '';
    const prefix = `[${ns}] `;
    return desc.startsWith(prefix) ? desc.slice(prefix.length) : desc;
  }

  interface Param {
    name: string;
    type: string;
    required: boolean;
    description: string;
    enumValues?: unknown[];
  }

  function getParams(tool: Tool): Param[] {
    const schema = tool.inputSchema as {
      properties?: Record<string, { type?: string; description?: string; enum?: unknown[]; }>;
      required?: string[];
    };
    if (!schema?.properties) return [];
    const required: string[] = schema.required ?? [];
    return Object.entries(schema.properties).map(([key, prop]) => ({
      name: key,
      type: prop.type ?? 'any',
      required: required.includes(key),
      description: prop.description ?? '',
      enumValues: prop.enum,
    }));
  }

  function toggleTool(name: string) {
    expandedTool.value = expandedTool.value === name ? null : name;
  }
</script>

<template>
  <AppLayout>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
      <div class="flex items-center gap-2 mb-6">
        <router-link to="/endpoints" class="text-sm hover:underline"
          style="color: var(--text-secondary);">Endpoints</router-link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          style="color: var(--text-tertiary);">
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span class="text-sm font-medium" style="color: var(--text-primary);">{{ endpoint?.name ?? 'Loading…' }}</span>
      </div>

      <div v-if="!endpoint" class="flex items-center gap-3 py-12 justify-center">
        <span class="animate-spin-smooth w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
        <span class="text-sm" style="color: var(--text-secondary);">Loading endpoint…</span>
      </div>

      <template v-else>
        <!-- Endpoint detail card -->
        <div class="card overflow-hidden mb-6">
          <!-- Header: name, tags, actions -->
          <div class="px-6 py-5 flex flex-col sm:flex-row sm:items-start gap-4">
            <div class="flex-1 min-w-0">
              <h1 class="text-xl font-semibold mb-2.5" style="color: var(--text-primary);">{{ endpoint.name }}</h1>
              <div class="flex items-center gap-2 flex-wrap">
                <code class="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md"
                  style="background: var(--bg-muted); color: var(--text-secondary);">{{ endpoint.namespace }}</code>
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-md"
                  style="background: var(--bg-muted); color: var(--text-secondary);">{{ endpoint.transport }}</span>
                <StatusBadge :status="status" />
              </div>
              <!-- Connection target -->
              <div v-if="endpoint.url" class="mt-3.5">
                <p class="text-[10px] uppercase tracking-wide font-semibold mb-1" style="color: var(--text-tertiary);">
                  URL</p>
                <code class="text-xs font-mono break-all leading-relaxed"
                  style="color: var(--text-secondary);">{{ endpoint.url }}</code>
              </div>
              <div v-if="endpoint.command" class="mt-3.5">
                <p class="text-[10px] uppercase tracking-wide font-semibold mb-1" style="color: var(--text-tertiary);">
                  Command</p>
                <code class="text-xs font-mono"
                  style="color: var(--text-secondary);">{{ endpoint.command }}{{ endpoint.args?.length ? ' ' + endpoint.args.join(' ') : '' }}</code>
              </div>
            </div>
            <!-- Actions -->
            <div class="flex items-center gap-2 shrink-0 pt-0.5">
              <AppToggle :model-value="endpoint.isEnabled" @update:model-value="handleToggle"
                :label="endpoint.isEnabled ? 'Enabled' : 'Disabled'" />
              <AppButton variant="danger" size="sm" @click="showDeleteDialog = true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                </svg>
                Remove
              </AppButton>
            </div>
          </div>
          <!-- Meta strip -->
          <div class="px-6 py-3 border-t flex flex-wrap gap-x-8 gap-y-2"
            style="background: var(--bg-muted); border-color: var(--border-default);">
            <div>
              <p class="text-[10px] uppercase tracking-wide font-semibold" style="color: var(--text-tertiary);">Last
                connected</p>
              <p class="text-sm mt-0.5" style="color: var(--text-primary);">{{ formatDate(endpoint.lastConnectedAt) }}
              </p>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wide font-semibold" style="color: var(--text-tertiary);">Created
              </p>
              <p class="text-sm mt-0.5" style="color: var(--text-primary);">{{ formatDate(endpoint.createdAt) }}</p>
            </div>
          </div>
        </div>

        <!-- Tools section header -->
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold" style="color: var(--text-primary);">Tools <span
              class="badge badge-neutral ml-1">{{ tools.length }}</span></h2>
          <div class="relative">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style="color: var(--text-tertiary);">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input v-model="toolSearch" type="search" placeholder="Search tools…"
              class="pl-8 pr-3 py-1.5 text-sm rounded-lg border outline-none transition-colors w-48"
              style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);" />
          </div>
        </div>

        <!-- Loading skeletons -->
        <div v-if="loadingTools" class="flex flex-col gap-2">
          <div v-for="i in 5" :key="i" class="rounded-xl border px-5 py-4 flex flex-col gap-2"
            style="background: var(--bg-card); border-color: var(--border-default);">
            <SkeletonBlock height="0.875rem" width="35%" />
            <SkeletonBlock height="0.75rem" width="65%" />
          </div>
        </div>

        <!-- Error state -->
        <div v-else-if="toolsError" class="py-10 text-center">
          <p class="text-sm font-medium mb-1" style="color: var(--color-danger, #ef4444);">Failed to load tools</p>
          <p class="text-xs" style="color: var(--text-tertiary);">{{ toolsError }}</p>
        </div>

        <!-- Empty state -->
        <div v-else-if="filteredTools.length === 0" class="py-10 text-center">
          <p class="text-sm" style="color: var(--text-tertiary);">No tools found.</p>
        </div>

        <!-- Tool cards -->
        <div v-else class="flex flex-col gap-2">
          <div v-for="tool in filteredTools" :key="tool.name"
            class="rounded-xl border overflow-hidden transition-shadow"
            :style="`background: var(--bg-card); border-color: ${expandedTool === tool.name ? 'var(--color-primary, #6366f1)' : 'var(--border-default)'};`">
            <!-- Card header -->
            <button type="button"
              class="w-full flex items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--bg-hover)]"
              @click="toggleTool(tool.name)">
              <span v-if="getNamespace(tool.name)"
                class="mt-0.5 shrink-0 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md leading-5"
                :style="`background: hsl(${nsHue(getNamespace(tool.name))} 70% 93%); color: hsl(${nsHue(getNamespace(tool.name))} 55% 38%);`">{{
                  getNamespace(tool.name) }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold leading-snug" style="color: var(--text-primary);">
                  {{ getShortName(tool.name) }}
                </p>
                <p v-if="tool.description" class="text-xs mt-0.5 line-clamp-2 leading-relaxed"
                  style="color: var(--text-secondary);">{{ cleanDescription(tool.description, getNamespace(tool.name))
                  }}</p>
              </div>
              <div class="shrink-0 flex items-center gap-2 mt-0.5">
                <span v-if="getParams(tool).length" class="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                  style="background: var(--bg-muted); color: var(--text-tertiary);">{{ getParams(tool).length }} param{{
                    getParams(tool).length !== 1 ? 's' : '' }}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                  class="transition-transform duration-200"
                  :style="expandedTool === tool.name ? 'transform: rotate(180deg); color: var(--color-primary, #6366f1);' : 'color: var(--text-tertiary);'">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </button>

            <!-- Expanded detail -->
            <Transition enter-active-class="transition-all duration-200 ease-out overflow-hidden"
              leave-active-class="transition-all duration-150 ease-in overflow-hidden"
              enter-from-class="max-h-0 opacity-0" enter-to-class="max-h-[600px] opacity-100"
              leave-from-class="max-h-[600px] opacity-100" leave-to-class="max-h-0 opacity-0">
              <div v-if="expandedTool === tool.name" class="border-t" style="border-color: var(--border-default);">
                <div class="px-5 pt-3.5 pb-1 flex items-center gap-2">
                  <span class="text-[10px] uppercase tracking-wide font-semibold"
                    style="color: var(--text-tertiary);">Full name</span>
                  <code class="text-xs font-mono" style="color: var(--text-accent, #6366f1);">{{ tool.name }}</code>
                </div>
                <div v-if="tool.description" class="px-5 pb-3">
                  <p class="text-xs leading-relaxed" style="color: var(--text-secondary);">
                    {{ cleanDescription(tool.description, getNamespace(tool.name)) }}
                  </p>
                </div>
                <div v-if="getParams(tool).length" class="px-5 pb-4">
                  <p class="text-[10px] uppercase tracking-wide font-semibold mb-2"
                    style="color: var(--text-tertiary);">Parameters</p>
                  <div class="rounded-lg overflow-hidden border text-xs" style="border-color: var(--border-default);">
                    <div
                      class="grid grid-cols-[minmax(100px,1fr)_80px_52px_minmax(120px,2fr)] gap-x-4 px-4 py-2 font-semibold uppercase tracking-wide text-[10px]"
                      style="background: var(--bg-muted); color: var(--text-tertiary); border-bottom: 1px solid var(--border-default);">
                      <span>Name</span><span>Type</span><span>Req.</span><span>Description</span>
                    </div>
                    <div v-for="(param, idx) in getParams(tool)" :key="param.name"
                      class="grid grid-cols-[minmax(100px,1fr)_80px_52px_minmax(120px,2fr)] gap-x-4 px-4 py-2.5 items-start"
                      :style="idx < getParams(tool).length - 1 ? 'border-bottom: 1px solid var(--border-default);' : ''"
                      style="background: var(--bg-card);">
                      <code class="font-mono font-semibold text-[11px] break-all"
                        style="color: var(--text-primary);">{{ param.name }}</code>
                      <span class="font-mono text-[11px] px-1.5 py-0.5 rounded self-start"
                        style="background: var(--bg-muted); color: var(--text-secondary);">{{ param.type }}</span>
                      <span class="text-center self-start">
                        <span v-if="param.required"
                          class="inline-block w-4 h-4 rounded-full text-[10px] font-bold leading-4 text-center"
                          style="background: rgba(239,68,68,.12); color: #ef4444;">✓</span>
                        <span v-else class="text-[11px]" style="color: var(--text-tertiary);">–</span>
                      </span>
                      <span style="color: var(--text-secondary);" class="text-[11px] leading-relaxed">
                        {{ param.description || '—' }}
                        <span v-if="param.enumValues?.length" class="block mt-1">
                          <span v-for="v in param.enumValues" :key="String(v)"
                            class="inline-block mr-1 mb-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded"
                            style="background: var(--bg-muted); color: var(--text-tertiary);">{{ v }}</span>
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                <div v-else class="px-5 pb-4">
                  <p class="text-xs italic" style="color: var(--text-tertiary);">No parameters.</p>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </template>
    </div>

    <ConfirmDialog :open="showDeleteDialog" title="Remove Endpoint"
      :message="`Remove '${endpoint?.name}'? This action cannot be undone.`" confirm-label="Remove" :loading="deleting"
      @confirm="confirmDelete" @cancel="showDeleteDialog = false" />
  </AppLayout>
</template>
