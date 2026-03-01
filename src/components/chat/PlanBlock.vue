<script setup lang="ts">
    import { ref, computed } from 'vue';
    import { useAgentPlanningStore } from '@/stores/agentPlanning';
    import type { AgentPlan, AgentTask, AgentTaskStatus } from '@/types';

    const props = defineProps<{ plan: AgentPlan; }>();

    const planningStore = useAgentPlanningStore();

    /** Live version with real-time status updates from the store */
    const livePlan = computed(
        () => planningStore.pendingPlan?.id === props.plan.id
            ? planningStore.pendingPlan
            : props.plan,
    );

    const isPending = computed(() => livePlan.value.status === 'pending');
    const isRunning = computed(() => livePlan.value.status === 'running');


    // ── Inline editing ────────────────────────────────────────────────────────
    const editingTaskId = ref<string | null>(null);
    const editName = ref('');
    const editDesc = ref('');

    function startEdit(task: AgentTask) {
        if (!isPending.value) return;
        editingTaskId.value = task.id;
        editName.value = task.name;
        editDesc.value = task.description;
    }

    function commitEdit(planId: string, taskId: string) {
        planningStore.editTask(planId, taskId, editName.value.trim(), editDesc.value.trim());
        editingTaskId.value = null;
    }

    function cancelEdit() {
        editingTaskId.value = null;
    }

    // ── Expandable results ────────────────────────────────────────────────────
    const expandedTaskIds = ref<Set<string>>(new Set());

    function toggleExpand(taskId: string) {
        if (expandedTaskIds.value.has(taskId))
            expandedTaskIds.value.delete(taskId);
        else
            expandedTaskIds.value.add(taskId);
    }

    // ── Status helpers ────────────────────────────────────────────────────────
    const STATUS_ICONS: Record<AgentTaskStatus, string> = {
        pending: '○',
        running: '◌',
        success: '✓',
        error: '✕',
        skipped: '–',
    };

    const STATUS_CLASSES: Record<AgentTaskStatus, string> = {
        pending: 'status--pending',
        running: 'status--running',
        success: 'status--success',
        error: 'status--error',
        skipped: 'status--skipped',
    };

    function taskStatus(task: AgentTask): AgentTaskStatus {
        if (!livePlan.value) return task.status;
        for (const g of livePlan.value.parallelGroups) {
            const live = g.find(t => t.id === task.id);
            if (live) return live.status;
        }
        return task.status;
    }

    function taskResult(task: AgentTask): string | undefined {
        if (!livePlan.value) return task.result;
        for (const g of livePlan.value.parallelGroups) {
            const live = g.find(t => t.id === task.id);
            if (live) return live.result;
        }
        return task.result;
    }
</script>

<template>
    <div class="plan-block">
        <!-- Header -->
        <div class="plan-header">
            <span class="plan-icon">⚡</span>
            <span class="plan-title">{{ livePlan.title }}</span>
            <span :class="['plan-status-badge', `badge--${livePlan.status}`]">
                {{ livePlan.status }}
            </span>
        </div>

        <!-- Parallel groups -->
        <div class="groups-list">
            <div v-for="(group, gi) in livePlan.parallelGroups" :key="gi" class="task-group">
                <div v-if="livePlan.parallelGroups.length > 1" class="group-label">
                    Group {{ gi + 1 }}
                    <span v-if="group.length > 1" class="parallel-hint">(parallel)</span>
                </div>

                <div v-for="task in group" :key="task.id" class="task-row">
                    <!-- Status icon -->
                    <span :class="['task-status', STATUS_CLASSES[taskStatus(task)]]">
                        {{ STATUS_ICONS[taskStatus(task)] }}
                    </span>

                    <!-- Task content -->
                    <div class="task-body">
                        <!-- Edit mode -->
                        <template v-if="editingTaskId === task.id">
                            <input v-model="editName" class="edit-input edit-name" placeholder="Task name"
                                @keydown.enter="commitEdit(livePlan.id, task.id)" @keydown.escape="cancelEdit" />
                            <textarea v-model="editDesc" class="edit-input edit-desc" rows="3"
                                placeholder="Task description" />
                            <div class="edit-actions">
                                <button class="btn-small btn-primary"
                                    @click="commitEdit(livePlan.id, task.id)">Save</button>
                                <button class="btn-small btn-ghost" @click="cancelEdit">Cancel</button>
                            </div>
                        </template>

                        <!-- View mode -->
                        <template v-else>
                            <p class="task-name" :class="{ 'task-name--editable': isPending }" @click="startEdit(task)">
                                {{ task.name }}
                                <svg v-if="isPending" width="10" height="10" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" stroke-width="2" class="edit-hint">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                                        stroke-linecap="round" />
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                                        stroke-linecap="round" />
                                </svg>
                            </p>
                            <p class="task-desc">{{ task.description }}</p>

                            <!-- Result (when available) -->
                            <div v-if="taskResult(task)" class="task-result-area">
                                <button class="result-toggle" @click="toggleExpand(task.id)">
                                    <svg :class="['chevron', { 'chevron--open': expandedTaskIds.has(task.id) }]"
                                        width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2.5">
                                        <polyline points="6 9 12 15 18 9" stroke-linecap="round" />
                                    </svg>
                                    {{ expandedTaskIds.has(task.id) ? 'Hide result' : 'Show result' }}
                                </button>
                                <div v-if="expandedTaskIds.has(task.id)" class="task-result">
                                    <span v-if="taskStatus(task) === 'running'" class="streaming-cursor" />
                                    {{ taskResult(task) }}
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <!-- Approve / Reject footer (only when pending) -->
        <div v-if="isPending" class="plan-actions">
            <button class="btn-approve" @click="planningStore.approvePlan(livePlan.id)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12" stroke-linecap="round" />
                </svg>
                Approve &amp; Run
            </button>
            <button class="btn-reject" @click="planningStore.rejectPlan(livePlan.id)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
                </svg>
                Reject
            </button>
        </div>

        <!-- Running indicator -->
        <p v-else-if="isRunning" class="running-hint">
            <span class="spinner" /> Executing tasks…
        </p>
    </div>
</template>

<style scoped>
    .plan-block {
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        background: var(--bg-surface);
        overflow: hidden;
        font-size: 13px;
        max-width: min(640px, 100%);
    }

    /* Header */
    .plan-header {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 10px 14px 8px;
        border-bottom: 1px solid var(--border-default);
        background: var(--bg-muted);
    }

    .plan-icon {
        font-size: 13px;
        flex-shrink: 0;
    }

    .plan-title {
        flex: 1;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .plan-status-badge {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 1px 7px;
        border-radius: var(--radius-full);
        flex-shrink: 0;
    }

    .badge--pending {
        background: var(--color-warning-50);
        color: var(--color-warning-700);
        border: 1px solid var(--color-warning-200);
    }

    .badge--approved {
        background: var(--color-primary-50);
        color: var(--color-primary-700);
        border: 1px solid var(--color-primary-200);
    }

    .badge--running {
        background: var(--color-primary-50);
        color: var(--color-primary-600);
        border: 1px solid var(--color-primary-200);
    }

    .badge--completed {
        background: var(--color-success-50, #f0fdf4);
        color: var(--color-success-700, #15803d);
        border: 1px solid var(--color-success-200, #bbf7d0);
    }

    .badge--rejected {
        background: var(--color-danger-50);
        color: var(--color-danger-700);
        border: 1px solid var(--color-danger-200);
    }

    [data-theme="dark"] .badge--pending {
        background: rgba(245, 158, 11, 0.08);
        color: var(--color-warning-400);
        border-color: rgba(245, 158, 11, 0.2);
    }

    [data-theme="dark"] .badge--approved,
    [data-theme="dark"] .badge--running {
        background: rgba(59, 130, 246, 0.08);
        color: var(--color-primary-400);
        border-color: rgba(59, 130, 246, 0.2);
    }

    [data-theme="dark"] .badge--completed {
        background: rgba(34, 197, 94, 0.08);
        color: #4ade80;
        border-color: rgba(34, 197, 94, 0.2);
    }

    [data-theme="dark"] .badge--rejected {
        background: rgba(239, 68, 68, 0.08);
        color: var(--color-danger-400);
        border-color: rgba(239, 68, 68, 0.2);
    }

    /* Groups */
    .groups-list {
        padding: 10px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .task-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .group-label {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-tertiary);
    }

    .parallel-hint {
        font-weight: 400;
        text-transform: none;
        margin-left: 4px;
    }

    /* Tasks */
    .task-row {
        display: flex;
        gap: 8px;
        align-items: flex-start;
    }

    .task-status {
        font-size: 13px;
        line-height: 1.6;
        flex-shrink: 0;
        width: 16px;
        text-align: center;
    }

    .status--pending {
        color: var(--text-tertiary);
    }

    .status--running {
        color: var(--color-primary-500);
        animation: spin-pulse 1s ease-in-out infinite;
    }

    .status--success {
        color: var(--color-success-600, #16a34a);
    }

    .status--error {
        color: var(--color-danger-500);
    }

    .status--skipped {
        color: var(--text-tertiary);
        opacity: 0.5;
    }

    @keyframes spin-pulse {

        0%,
        100% {
            opacity: 1;
        }

        50% {
            opacity: 0.35;
        }
    }

    .task-body {
        flex: 1;
        min-width: 0;
    }

    .task-name {
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }

    .task-name--editable {
        cursor: pointer;
    }

    .task-name--editable:hover .edit-hint {
        opacity: 1;
    }

    .edit-hint {
        opacity: 0;
        transition: opacity 0.12s ease;
        flex-shrink: 0;
    }

    .task-desc {
        font-size: 12px;
        color: var(--text-secondary);
        margin: 2px 0 0;
        line-height: 1.5;
    }

    /* Inline editing */
    .edit-input {
        width: 100%;
        border: 1px solid var(--border-focus);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        color: var(--text-primary);
        padding: 4px 8px;
        font-size: 13px;
        outline: none;
        box-sizing: border-box;
        margin-bottom: 4px;
        font-family: inherit;
    }

    .edit-desc {
        resize: vertical;
    }

    .edit-actions {
        display: flex;
        gap: 6px;
        margin-top: 4px;
    }

    /* Result */
    .task-result-area {
        margin-top: 5px;
    }

    .result-toggle {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: var(--text-tertiary);
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
    }

    .result-toggle:hover {
        color: var(--text-secondary);
    }

    .chevron {
        transition: transform 0.15s ease;
    }

    .chevron--open {
        transform: rotate(180deg);
    }

    .task-result {
        margin-top: 5px;
        font-size: 12px;
        color: var(--text-secondary);
        background: var(--bg-muted);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-sm);
        padding: 6px 9px;
        white-space: pre-wrap;
        max-height: 200px;
        overflow-y: auto;
    }

    .streaming-cursor {
        display: inline-block;
        width: 2px;
        height: 12px;
        background: currentColor;
        margin-right: 3px;
        vertical-align: text-bottom;
        animation: blink 1s step-end infinite;
    }

    @keyframes blink {

        0%,
        100% {
            opacity: 1;
        }

        50% {
            opacity: 0;
        }
    }

    /* Actions */
    .plan-actions {
        display: flex;
        gap: 8px;
        padding: 10px 14px;
        border-top: 1px solid var(--border-default);
        background: var(--bg-muted);
    }

    .btn-approve,
    .btn-reject {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 12px;
        font-size: 12px;
        font-weight: 600;
        border-radius: var(--radius-md);
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.12s ease;
    }

    .btn-approve {
        background: var(--color-primary-500);
        color: #fff;
        border-color: var(--color-primary-600);
    }

    .btn-approve:hover {
        background: var(--color-primary-600);
    }

    .btn-reject {
        background: transparent;
        color: var(--text-secondary);
        border-color: var(--border-default);
    }

    .btn-reject:hover {
        border-color: var(--color-danger-400);
        color: var(--color-danger-500);
        background: color-mix(in srgb, var(--color-danger-500) 6%, transparent);
    }

    /* Small buttons for inline edit */
    .btn-small {
        padding: 3px 9px;
        font-size: 11px;
        font-weight: 500;
        border-radius: var(--radius-sm);
        border: 1px solid transparent;
        cursor: pointer;
    }

    .btn-primary {
        background: var(--color-primary-500);
        color: #fff;
        border-color: var(--color-primary-600);
    }

    .btn-ghost {
        background: transparent;
        color: var(--text-secondary);
        border-color: var(--border-default);
    }

    /* Running hint */
    .running-hint {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 8px 14px;
        font-size: 12px;
        color: var(--text-tertiary);
        border-top: 1px solid var(--border-default);
        background: var(--bg-muted);
        margin: 0;
    }

    .spinner {
        display: inline-block;
        width: 10px;
        height: 10px;
        border: 1.5px solid var(--border-default);
        border-top-color: var(--color-primary-500);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
