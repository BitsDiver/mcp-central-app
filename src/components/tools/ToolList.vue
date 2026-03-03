<script setup lang="ts">
    import { ref, computed, watch } from 'vue';
    import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
    import EmptyState from '@/components/ui/EmptyState.vue';
    import AppToggle from '@/components/ui/AppToggle.vue';
    import { useToolStore } from '@/stores/tools';
    import { emitTools } from '@/api/socket';
    import type { Tool } from '@/types';
    import { Search, Settings, ChevronDown } from 'lucide-vue-next';

    const props = withDefaults(defineProps<{
        /** If supplied, fetches only this endpoint's tools and enables per-tool toggles. */
        endpointId?: string;
        /** Pre-loaded tool array (skips fetch; used by arch diagram popup). */
        tools?: Tool[];
        /** Compact layout — hides the global page header chrome. */
        compact?: boolean;
    }>(), {
        endpointId: undefined,
        tools: undefined,
        compact: false,
    });

    const toolStore = useToolStore();

    // ── State ──────────────────────────────────────────────────
    const localTools = ref<Tool[]>([]);
    const loading = ref(false);
    const loadError = ref<string | null>(null);
    const search = ref('');
    const selectedNamespace = ref('');
    const expandedTool = ref<string | null>(null);
    const togglingTool = ref<string | null>(null);

    // ── Source resolution ──────────────────────────────────────
    // Priority: props.tools > endpointId fetch > store global list
    const sourcedTools = computed<Tool[]>(() => {
        if (props.tools !== undefined) return props.tools;
        if (props.endpointId !== undefined) return localTools.value;
        return toolStore.tools;
    });

    const isLoading = computed(() =>
        props.tools !== undefined ? false
            : props.endpointId !== undefined ? loading.value
                : toolStore.isLoading,
    );

    // ── Load per-endpoint tools ────────────────────────────────
    async function loadEndpointTools(endpointId: string) {
        loading.value = true;
        loadError.value = null;
        try {
            const res = await emitTools<{ tools: Tool[]; count: number; }>('getEndpointTools', { endpointId });
            if (res.status === 'error') {
                loadError.value = res.message ?? res.code ?? 'Could not load tools';
            } else {
                localTools.value = res.data!.tools;
            }
        } catch (e) {
            loadError.value = e instanceof Error ? e.message : String(e);
        } finally {
            loading.value = false;
        }
    }

    watch(() => props.endpointId, (id) => {
        if (id) loadEndpointTools(id);
    }, { immediate: true });

    // ── Filtering ──────────────────────────────────────────────
    const namespaces = computed(() => {
        const set = new Set<string>();
        for (const t of sourcedTools.value) {
            const parts = t.name.split('__');
            if (parts.length > 1) set.add(parts[0]);
        }
        return Array.from(set).sort();
    });

    const filtered = computed(() => {
        let list = sourcedTools.value;
        if (selectedNamespace.value) {
            list = list.filter((t) => t.name.startsWith(selectedNamespace.value + '__'));
        }
        const q = search.value.toLowerCase().trim();
        if (q) {
            list = list.filter(
                (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
            );
        }
        return list;
    });

    const activeCount = computed(() => sourcedTools.value.filter((t) => !t.isDisabled).length);
    const totalCount = computed(() => sourcedTools.value.length);

    // ── Helpers ────────────────────────────────────────────────
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

    function toggleExpand(name: string) {
        expandedTool.value = expandedTool.value === name ? null : name;
    }

    // ── Tool toggle ────────────────────────────────────────────
    // Route: use endpointId prop or fall back to tool.endpointId
    async function toggleToolEnabled(tool: Tool) {
        if (togglingTool.value) return;
        togglingTool.value = tool.name;
        try {
            const event = tool.isDisabled ? 'enableTool' : 'disableTool';
            const res = await emitTools<{ namespacedName: string; isDisabled: boolean; }>(event, {
                namespacedName: tool.name,
            });
            if (res.status === 'success') {
                tool.isDisabled = res.data!.isDisabled;
                // Also update the global store tool if present
                const storeTool = toolStore.tools.find((t) => t.name === tool.name);
                if (storeTool) storeTool.isDisabled = res.data!.isDisabled;
            }
        } finally {
            togglingTool.value = null;
        }
    }
</script>

<template>
    <div>
        <!-- Header (hidden in compact mode) -->
        <div v-if="!compact" class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <span class="text-sm font-semibold" style="color: var(--text-primary);">
                    Tools
                </span>
                <!-- active / total badge -->
                <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                    :style="activeCount < totalCount
                        ? 'background: rgba(245,158,11,.12); color: #d97706;'
                        : 'background: var(--color-primary-subtle, rgba(99,102,241,.12)); color: var(--color-primary, #6366f1);'">
                    {{ activeCount }} / {{ totalCount }} active
                </span>
            </div>
        </div>

        <!-- Search + namespace filters -->
        <div class="flex flex-col sm:flex-row gap-3 mb-4">
            <div class="relative flex-1 max-w-sm">
                <Search :size="14" :stroke-width="2"
                    class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style="color: var(--text-tertiary);" />
                <input v-model="search" type="search" placeholder="Search tools…"
                    class="w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none transition-colors"
                    style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);" />
            </div>
            <div v-if="namespaces.length > 1" class="flex gap-2 flex-wrap items-center">
                <button @click="selectedNamespace = ''"
                    class="text-xs font-medium px-3 py-1.5 rounded-full border-0 transition-colors cursor-pointer"
                    :style="!selectedNamespace
                        ? 'background: var(--color-primary-subtle, rgba(99,102,241,.12)); color: var(--color-primary, #6366f1);'
                        : 'background: var(--bg-muted); color: var(--text-secondary);'">
                    All
                </button>
                <button v-for="ns in namespaces" :key="ns"
                    @click="selectedNamespace = ns === selectedNamespace ? '' : ns"
                    class="text-xs font-mono font-medium px-3 py-1.5 rounded-full border-0 transition-colors cursor-pointer"
                    :style="selectedNamespace === ns
                        ? `background: hsl(${nsHue(ns)} 70% 94%); color: hsl(${nsHue(ns)} 55% 38%);`
                        : 'background: var(--bg-muted); color: var(--text-secondary);'">
                    {{ ns }}
                </button>
            </div>
        </div>

        <!-- Loading skeletons -->
        <div v-if="isLoading" class="flex flex-col gap-2">
            <div v-for="i in compact ? 3 : 6" :key="i" class="rounded-xl border px-5 py-4 flex flex-col gap-2"
                style="background: var(--bg-card); border-color: var(--border-default);">
                <SkeletonBlock height="0.875rem" width="35%" />
                <SkeletonBlock height="0.75rem" width="65%" />
            </div>
        </div>

        <!-- Error -->
        <div v-else-if="loadError" class="py-10 text-center">
            <p class="text-sm font-medium mb-1" style="color: var(--color-danger, #ef4444);">Failed to load tools</p>
            <p class="text-xs" style="color: var(--text-tertiary);">{{ loadError }}</p>
        </div>

        <!-- Empty state -->
        <EmptyState v-else-if="filtered.length === 0" title="No tools found"
            :description="search || selectedNamespace ? 'Try adjusting your filters.' : 'Connect MCP endpoints to see tools here.'">
            <template #icon>
                <Settings :size="24" :stroke-width="1.5" style="color: var(--text-tertiary);" />
            </template>
        </EmptyState>

        <!-- Tool cards -->
        <div v-else class="flex flex-col gap-2">
            <div v-for="tool in filtered" :key="tool.name" class="rounded-xl border overflow-hidden transition-shadow"
                :style="`background: var(--bg-card); border-color: ${expandedTool === tool.name ? 'var(--color-primary, #6366f1)' : 'var(--border-default)'};`">

                <!-- Card header (clickable row) -->
                <button type="button"
                    class="w-full flex items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--bg-hover)]"
                    @click="toggleExpand(tool.name)">
                    <!-- Namespace badge -->
                    <span v-if="getNamespace(tool.name)"
                        class="mt-0.5 shrink-0 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md leading-5"
                        :style="`background: hsl(${nsHue(getNamespace(tool.name))} 70% 93%); color: hsl(${nsHue(getNamespace(tool.name))} 55% 38%);`">
                        {{ getNamespace(tool.name) }}
                    </span>
                    <!-- Name + description -->
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold leading-snug"
                            :style="tool.isDisabled ? 'color: var(--text-tertiary); text-decoration: line-through;' : 'color: var(--text-primary);'">
                            {{ getShortName(tool.name) }}
                        </p>
                        <p v-if="tool.description" class="text-xs mt-0.5 line-clamp-2 leading-relaxed"
                            style="color: var(--text-secondary);">
                            {{ cleanDescription(tool.description, getNamespace(tool.name)) }}
                        </p>
                    </div>
                    <!-- Right side: disabled badge, params, toggle, chevron -->
                    <div class="shrink-0 flex items-center gap-2 mt-0.5">
                        <span v-if="tool.isDisabled" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                            style="background: rgba(239,68,68,.1); color: #ef4444;">disabled</span>
                        <span v-if="getParams(tool).length" class="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                            style="background: var(--bg-muted); color: var(--text-tertiary);">
                            {{ getParams(tool).length }} param{{ getParams(tool).length !== 1 ? 's' : '' }}
                        </span>
                        <!-- Toggle: always shown, routing key = endpointId prop OR tool.endpointId -->
                        <AppToggle v-if="endpointId || tool.endpointId" :model-value="!tool.isDisabled"
                            :disabled="togglingTool === tool.name" @update:model-value="toggleToolEnabled(tool)"
                            @click.stop />
                        <ChevronDown :size="14" :stroke-width="2.5" class="transition-transform duration-200" :style="expandedTool === tool.name
                            ? 'transform: rotate(180deg); color: var(--color-primary, #6366f1);'
                            : 'color: var(--text-tertiary);'" />
                    </div>
                </button>

                <!-- Expanded detail panel -->
                <Transition enter-active-class="transition-all duration-200 ease-out overflow-hidden"
                    leave-active-class="transition-all duration-150 ease-in overflow-hidden"
                    enter-from-class="max-h-0 opacity-0" enter-to-class="max-h-[600px] opacity-100"
                    leave-from-class="max-h-[600px] opacity-100" leave-to-class="max-h-0 opacity-0">
                    <div v-if="expandedTool === tool.name" class="border-t"
                        style="border-color: var(--border-default);">
                        <div class="px-5 pt-3.5 pb-1 flex items-center gap-2">
                            <span class="text-[10px] uppercase tracking-wide font-semibold"
                                style="color: var(--text-tertiary);">Full name</span>
                            <code class="text-xs font-mono"
                                style="color: var(--text-accent, #6366f1);">{{ tool.name }}</code>
                        </div>
                        <div v-if="tool.description" class="px-5 pb-3">
                            <p class="text-xs leading-relaxed" style="color: var(--text-secondary);">
                                {{ cleanDescription(tool.description, getNamespace(tool.name)) }}
                            </p>
                        </div>
                        <div v-if="getParams(tool).length" class="px-5 pb-4">
                            <p class="text-[10px] uppercase tracking-wide font-semibold mb-2"
                                style="color: var(--text-tertiary);">
                                Parameters</p>
                            <div class="rounded-lg overflow-hidden border text-xs"
                                style="border-color: var(--border-default);">
                                <div class="grid grid-cols-[minmax(100px,1fr)_80px_52px_minmax(120px,2fr)] gap-x-4 px-4 py-2 font-semibold uppercase tracking-wide text-[10px]"
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
                                        style="background: var(--bg-muted); color: var(--text-secondary);">{{ param.type
                                        }}</span>
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
                                                style="background: var(--bg-muted); color: var(--text-tertiary);">{{ v
                                                }}</span>
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
    </div>
</template>
