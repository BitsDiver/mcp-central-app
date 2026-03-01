<script setup lang="ts">
    import { computed } from 'vue';
    import AppModal from '@/components/ui/AppModal.vue';
    import AppButton from '@/components/ui/AppButton.vue';
    import AppToggle from '@/components/ui/AppToggle.vue';
    import { useToolStore } from '@/stores/tools';
    import { useEndpointStore } from '@/stores/endpoints';

    defineProps<{ open: boolean; }>();
    defineEmits<{ close: []; }>();

    const toolStore = useToolStore();
    const endpointStore = useEndpointStore();

    /** Map of endpointId → endpoint metadata. */
    const endpointMap = computed(() => {
        const map = new Map<string, { name: string; namespace: string; status?: string; }>();
        for (const ep of endpointStore.endpoints) {
            map.set(ep.id, {
                name: ep.name,
                namespace: ep.namespace,
                status: ep.connectionStatus,
            });
        }
        return map;
    });

    /** Grouped tools: endpoint sections + an "Other" bucket for orphan tools. */
    interface ToolGroup {
        endpointId: string | null;
        label: string;
        namespace: string;
        status?: string;
        tools: Array<{ name: string; originalName?: string; description: string; }>;
    }

    const groups = computed<ToolGroup[]>(() => {
        const byEp = new Map<string, ToolGroup>();
        const other: ToolGroup = {
            endpointId: null,
            label: 'Other tools',
            namespace: '',
            tools: [],
        };

        for (const t of toolStore.tools) {
            const epId = t.endpointId;
            if (!epId) {
                other.tools.push(t);
                continue;
            }
            let group = byEp.get(epId);
            if (!group) {
                const ep = endpointMap.value.get(epId);
                group = {
                    endpointId: epId,
                    label: ep?.name ?? epId,
                    namespace: ep?.namespace ?? '',
                    status: ep?.status,
                    tools: [],
                };
                byEp.set(epId, group);
            }
            group.tools.push(t);
        }

        const result = [...byEp.values()].sort((a, b) => a.label.localeCompare(b.label));
        if (other.tools.length > 0) result.push(other);
        return result;
    });

    function isEndpointEnabled(epId: string | null): boolean {
        if (!epId) return true;
        return toolStore.isEndpointFullyEnabled(epId);
    }

    function onToggleEndpoint(epId: string | null) {
        if (!epId) return;
        toolStore.toggleEndpoint(epId);
    }

    function activeInGroup(group: ToolGroup): number {
        return group.tools.filter((t) => toolStore.isToolEnabled(t.name)).length;
    }

    /** Status dot colour. */
    function statusColor(status?: string): string {
        if (status === 'connected') return 'var(--color-success-500)';
        if (status === 'connecting') return 'var(--color-warning-500)';
        return 'var(--text-tertiary)';
    }
</script>

<template>
    <AppModal :open="open" title="Tool Manager" size="lg" @close="$emit('close')">
        <div class="tm-summary">
            <span class="tm-count">{{ toolStore.activeCount }}</span>
            <span class="tm-total">/ {{ toolStore.tools.length }} tools active</span>
        </div>

        <div v-if="groups.length === 0" class="tm-empty">
            No tools detected. Connect an MCP endpoint to get started.
        </div>

        <div v-for="group in groups" :key="group.endpointId ?? '__other'" class="tm-group">
            <!-- Group header -->
            <div class="tm-group-header">
                <div class="tm-group-info">
                    <span v-if="group.status" class="tm-status-dot"
                        :style="{ background: statusColor(group.status) }" />
                    <span class="tm-group-name">{{ group.label }}</span>
                    <span v-if="group.namespace" class="tm-group-ns">{{ group.namespace }}</span>
                    <span class="tm-group-count">{{ activeInGroup(group) }}/{{ group.tools.length }}</span>
                </div>
                <AppToggle v-if="group.endpointId" :model-value="isEndpointEnabled(group.endpointId)"
                    @update:model-value="onToggleEndpoint(group.endpointId)" />
            </div>

            <!-- Tool list -->
            <div class="tm-tool-list">
                <label v-for="tool in group.tools" :key="tool.name" class="tm-tool"
                    :class="{ 'tm-tool--disabled': !toolStore.isToolEnabled(tool.name) }">
                    <div class="tm-tool-info">
                        <span class="tm-tool-name">{{ tool.originalName ?? tool.name }}</span>
                        <span v-if="tool.description" class="tm-tool-desc">{{ tool.description }}</span>
                    </div>
                    <AppToggle :model-value="toolStore.isToolEnabled(tool.name)"
                        @update:model-value="toolStore.toggleTool(tool.name)" />
                </label>
            </div>
        </div>
        <template #footer>
            <AppButton variant="secondary" @click="$emit('close')">Done</AppButton>
        </template>
    </AppModal>
</template>

<style scoped>

    /* ── Summary bar ─────────────────────────────────────── */
    .tm-summary {
        display: flex;
        align-items: baseline;
        gap: 5px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border-default);
    }

    .tm-count {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-primary-500);
        font-variant-numeric: tabular-nums;
    }

    .tm-total {
        font-size: 13px;
        color: var(--text-secondary);
    }

    .tm-empty {
        text-align: center;
        padding: 32px 0;
        font-size: 13px;
        color: var(--text-tertiary);
    }

    /* ── Group ───────────────────────────────────────────── */
    .tm-group {
        margin-bottom: 14px;
    }

    .tm-group-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 10px;
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--bg-muted) 60%, transparent);
    }

    .tm-group-info {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
    }

    .tm-status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .tm-group-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .tm-group-ns {
        font-size: 11px;
        font-weight: 500;
        color: var(--text-tertiary);
        padding: 1px 6px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--text-tertiary) 10%, transparent);
        white-space: nowrap;
    }

    .tm-group-count {
        font-size: 11px;
        font-weight: 500;
        color: var(--text-tertiary);
        margin-left: auto;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
    }

    /* ── Tool list ───────────────────────────────────────── */
    .tm-tool-list {
        display: flex;
        flex-direction: column;
    }

    .tm-tool {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 10px 6px 26px;
        cursor: pointer;
        border-radius: var(--radius-sm);
        transition: background 0.1s;
    }

    .tm-tool:hover {
        background: var(--bg-hover);
    }

    .tm-tool--disabled {
        opacity: 0.5;
    }

    .tm-tool-info {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 1px;
    }

    .tm-tool-name {
        font-size: 12px;
        font-weight: 500;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .tm-tool-desc {
        font-size: 11px;
        color: var(--text-tertiary);
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>
