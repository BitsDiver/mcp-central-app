<script setup lang="ts">
    import { ref, computed, nextTick } from 'vue';
    import { Zap, SquarePen, ChevronUp, ChevronDown, Trash2, Plus, Check, X } from 'lucide-vue-next';
    import { useAgentPlanningStore } from '@/stores/agentPlanning';
    import { renderMarkdown } from '@/composables/useMarkdown';
    import ToolCallBlock from '@/components/chat/ToolCallBlock.vue';
    import type { AgentPlan, AgentTask, AgentTaskStatus, ChatToolCall } from '@/types';

    const props = defineProps<{ plan: AgentPlan; isStreaming?: boolean; }>();

    const planningStore = useAgentPlanningStore();

    /** Live version with real-time status updates from the store */
    const livePlan = computed(
        () => planningStore.pendingPlan?.id === props.plan.id
            ? planningStore.pendingPlan
            : props.plan,
    );

    const isPending = computed(() => livePlan.value.status === 'pending' && !props.isStreaming);
    const isRunning = computed(() => livePlan.value.status === 'running');

    /** Last task card currently being written during streaming */
    const lastStreamingTask = computed<AgentTask | null>(() => {
        if (!props.isStreaming) return null;
        const groups = livePlan.value.parallelGroups;
        if (!groups.length) return null;
        const lastGroup = groups[groups.length - 1];
        return lastGroup.length ? lastGroup[lastGroup.length - 1] : null;
    });

    // ── Inline editing ───────────────────────────────────────────
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

    function cancelEdit() { editingTaskId.value = null; }

    // ── Title editing ─────────────────────────────────────────
    const editingTitle = ref(false);
    const editTitleText = ref('');

    function startTitleEdit() {
        if (!isPending.value) return;
        editTitleText.value = livePlan.value.title;
        editingTitle.value = true;
    }

    function commitTitleEdit() {
        const trimmed = editTitleText.value.trim();
        if (trimmed) planningStore.editTitle(livePlan.value.id, trimmed);
        editingTitle.value = false;
    }

    function cancelTitleEdit() { editingTitle.value = false; }

    // ── Task add / remove / reorder ───────────────────────────
    function groupIndexOf(taskId: string): number {
        return livePlan.value.parallelGroups.findIndex(g => g.some(t => t.id === taskId));
    }

    function handleAddTask() {
        const newId = planningStore.addTask(livePlan.value.id);
        if (!newId) return;
        nextTick(() => {
            const newTask = livePlan.value.parallelGroups.flat().find(t => t.id === newId);
            if (newTask) startEdit(newTask);
        });
    }

    function handleRemoveTask(taskId: string) {
        planningStore.removeTask(livePlan.value.id, taskId);
        if (editingTaskId.value === taskId) editingTaskId.value = null;
    }

    function handleMoveUp(taskId: string) {
        const gi = groupIndexOf(taskId);
        if (gi > 0) planningStore.moveGroup(livePlan.value.id, gi, 'up');
    }

    function handleMoveDown(taskId: string) {
        const gi = groupIndexOf(taskId);
        if (gi >= 0 && gi < livePlan.value.parallelGroups.length - 1)
            planningStore.moveGroup(livePlan.value.id, gi, 'down');
    }

    // ── Expandable results ───────────────────────────────────────
    const expandedTaskIds = ref<Set<string>>(new Set());

    function toggleExpand(taskId: string) {
        if (expandedTaskIds.value.has(taskId)) expandedTaskIds.value.delete(taskId);
        else expandedTaskIds.value.add(taskId);
    }

    // ── Status helpers ───────────────────────────────────────────
    const STATUS_LABELS: Record<AgentTaskStatus, string> = {
        pending: 'Pending',
        running: 'Running',
        success: 'Done',
        error: 'Error',
        skipped: 'Skipped',
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

    // ── Expandable tool calls per task ───────────────────────
    const expandedToolsIds = ref<Set<string>>(new Set());

    function toggleToolsExpand(taskId: string) {
        if (expandedToolsIds.value.has(taskId)) expandedToolsIds.value.delete(taskId);
        else expandedToolsIds.value.add(taskId);
    }

    function taskToolCalls(task: AgentTask): ChatToolCall[] {
        if (!livePlan.value) return task.toolCalls ?? [];
        for (const g of livePlan.value.parallelGroups) {
            const live = g.find(t => t.id === task.id);
            if (live) return live.toolCalls ?? [];
        }
        return task.toolCalls ?? [];
    }
</script>

<template>
    <div class="plan-block">
        <!-- Header ──────────────────────────────────────────────── -->
        <div class="plan-header">
            <Zap :size="13" :stroke-width="2" class="plan-icon" aria-hidden="true" />
            <!-- Editable title (pending only) -->
            <input v-if="editingTitle" ref="titleInput" v-model="editTitleText" class="plan-title-input"
                @blur="commitTitleEdit" @keydown.enter="commitTitleEdit" @keydown.escape="cancelTitleEdit" />
            <span v-else class="plan-title" :class="{ 'plan-title--editable': isPending }" @click="startTitleEdit">{{
                livePlan.title }}</span>
            <span
                :class="['plan-badge', props.isStreaming ? 'plan-badge--generating' : `plan-badge--${livePlan.status}`]">
                {{ props.isStreaming ? 'generating' : livePlan.status }}
            </span>
        </div>

        <!-- Task groups ─────────────────────────────────────────── -->
        <div class="groups-area">
            <div v-for="(group, gi) in livePlan.parallelGroups" :key="gi" class="task-group">
                <!-- Group divider (only when multiple groups) -->
                <div v-if="livePlan.parallelGroups.length > 1" class="group-divider">
                    <hr class="group-hr" />
                    <span class="group-label">
                        Group {{ gi + 1 }}
                        <span v-if="group.length > 1">&nbsp;· parallel</span>
                    </span>
                    <hr class="group-hr" />
                </div>

                <!-- Task cards -->
                <div v-for="task in group" :key="task.id"
                    :class="['task-card', `task-card--${taskStatus(task)}`,
                        { 'task-card--shimmer': taskStatus(task) === 'running' || (props.isStreaming && task.id === lastStreamingTask?.id) }]">
                    <!-- Status dot + label row -->
                    <div class="task-meta">
                        <span :class="['status-dot', `dot--${taskStatus(task)}`]">
                            <span v-if="taskStatus(task) === 'running'" class="dot-ring" />
                        </span>
                        <span :class="['status-chip', `chip--${taskStatus(task)}`]">
                            {{ STATUS_LABELS[taskStatus(task)] }}
                        </span>

                        <!-- Edit pencil (pending only) -->
                        <button v-if="isPending && editingTaskId !== task.id" type="button" class="meta-btn"
                            title="Edit task" @click="startEdit(task)">
                            <SquarePen :size="10" :stroke-width="2" />
                        </button>
                        <!-- Move up -->
                        <button v-if="isPending" type="button" class="meta-btn" :disabled="groupIndexOf(task.id) === 0"
                            title="Move up" @click="handleMoveUp(task.id)">
                            <ChevronUp :size="10" :stroke-width="2.5" />
                        </button>
                        <!-- Move down -->
                        <button v-if="isPending" type="button" class="meta-btn"
                            :disabled="groupIndexOf(task.id) === livePlan.parallelGroups.length - 1" title="Move down"
                            @click="handleMoveDown(task.id)">
                            <ChevronDown :size="10" :stroke-width="2.5" />
                        </button>
                        <!-- Delete task -->
                        <button v-if="isPending" type="button" class="meta-btn meta-btn--danger" title="Remove task"
                            @click="handleRemoveTask(task.id)">
                            <Trash2 :size="10" :stroke-width="2" />
                        </button>
                    </div>

                    <!-- Edit mode ───────────────────────────────── -->
                    <template v-if="editingTaskId === task.id">
                        <input v-model="editName" class="edit-input edit-name" placeholder="Task name"
                            @keydown.enter="commitEdit(livePlan.id, task.id)" @keydown.escape="cancelEdit" />
                        <textarea v-model="editDesc" class="edit-input edit-desc" rows="3"
                            placeholder="Task description" />
                        <div class="edit-actions">
                            <button type="button" class="btn-sm btn-primary"
                                @click="commitEdit(livePlan.id, task.id)">Save</button>
                            <button type="button" class="btn-sm btn-ghost" @click="cancelEdit">Cancel</button>
                        </div>
                    </template>

                    <!-- View mode ───────────────────────────────── -->
                    <template v-else>
                        <p class="task-name">
                            {{ task.name }}<span
                                v-if="props.isStreaming && task.id === lastStreamingTask?.id && !task.description"
                                class="stream-cursor" />
                        </p>
                        <p v-if="task.description" class="task-desc markdown-body"
                            v-html="renderMarkdown(task.description)" />

                        <!-- Result toggleable area -->
                        <div v-if="taskResult(task)" class="task-result-area">
                            <button type="button" class="result-toggle" @click="toggleExpand(task.id)">
                                <ChevronDown :size="10" :stroke-width="2.5"
                                    :class="['toggle-chevron', { 'toggle-chevron--open': expandedTaskIds.has(task.id) }]" />
                                {{ expandedTaskIds.has(task.id) ? 'Hide result' : 'Show result' }}
                            </button>
                            <div v-if="expandedTaskIds.has(task.id)" class="task-result markdown-body"
                                v-html="renderMarkdown(taskResult(task) ?? '')" />
                        </div>

                        <!-- Tool calls made during this task -->
                        <div v-if="taskToolCalls(task).length" class="task-tools-area">
                            <button type="button" class="result-toggle" @click="toggleToolsExpand(task.id)">
                                <ChevronDown :size="10" :stroke-width="2.5"
                                    :class="['toggle-chevron', { 'toggle-chevron--open': expandedToolsIds.has(task.id) }]" />
                                {{ taskToolCalls(task).length }}
                                tool{{ taskToolCalls(task).length !== 1 ? 's' : '' }} used
                            </button>
                            <div v-if="expandedToolsIds.has(task.id)" class="task-tools-list">
                                <ToolCallBlock v-for="tc in taskToolCalls(task)" :key="tc.id" :tool-call="tc" />
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <!-- Add task button (pending only) ───────────────────── -->
        <div v-if="isPending" class="add-task-row">
            <button type="button" class="btn-add-task" @click="handleAddTask">
                <Plus :size="11" :stroke-width="2.5" />
                Add task
            </button>
        </div>

        <!-- Approve / Reject footer ─────────────────────────────── -->
        <div v-if="isPending" class="plan-footer">
            <button type="button" class="btn-approve" @click="planningStore.approvePlan(livePlan.id)">
                <Check :size="12" :stroke-width="2.5" />
                Approve &amp; Run
            </button>
            <button type="button" class="btn-reject" @click="planningStore.rejectPlan(livePlan.id)">
                <X :size="12" :stroke-width="2" />
                Reject
            </button>
        </div>

        <!-- Generating footer ───────────────────────────────────── -->
        <p v-else-if="props.isStreaming" class="running-hint">
            <span class="mini-spinner" />
            Generating plan…
        </p>

        <!-- Running hint ─────────────────────────────────────────── -->
        <p v-else-if="isRunning" class="running-hint">
            <span class="mini-spinner" />
            Executing tasks…
        </p>
    </div>
</template>

<style scoped>

    /* ── Block container ────────────────────────────────────── */
    .plan-block {
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        background: var(--bg-surface);
        overflow: hidden;
        font-size: 13px;
        max-width: min(640px, 100%);
    }

    /* ── Header ─────────────────────────────────────────────── */
    .plan-header {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 10px 14px;
        border-bottom: 1px solid var(--border-default);
        background: var(--bg-muted);
    }

    .plan-icon {
        color: var(--color-primary-400);
        flex-shrink: 0;
    }

    .plan-title {
        flex: 1;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.4;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .plan-title--editable {
        cursor: pointer;
        border-radius: var(--radius-sm);
        padding: 1px 4px;
        margin: -1px -4px;
        transition: background 0.1s;
    }

    .plan-title--editable:hover {
        background: var(--bg-hover);
    }

    .plan-title-input {
        flex: 1;
        font-weight: 600;
        font-size: 13px;
        color: var(--text-primary);
        background: var(--bg-input);
        border: 1px solid var(--border-focus);
        border-radius: var(--radius-sm);
        padding: 2px 6px;
        outline: none;
        font-family: inherit;
        min-width: 0;
    }

    .plan-badge {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 2px 7px;
        border-radius: var(--radius-full);
        flex-shrink: 0;
    }

    .plan-badge--pending {
        background: var(--bg-hover);
        color: var(--text-tertiary);
    }

    .plan-badge--generating {
        background: color-mix(in srgb, var(--color-primary-500) 12%, transparent);
        color: var(--color-primary-500);
    }

    .plan-badge--running {
        background: color-mix(in srgb, var(--color-primary-500) 12%, transparent);
        color: var(--color-primary-500);
    }

    .plan-badge--success {
        background: color-mix(in srgb, var(--color-success-500, #22c55e) 12%, transparent);
        color: var(--color-success-600, #16a34a);
    }

    .plan-badge--error {
        background: color-mix(in srgb, var(--color-danger-500) 12%, transparent);
        color: var(--color-danger-500);
    }

    /* ── Groups area ─────────────────────────────────────────── */
    .groups-area {
        display: flex;
        flex-direction: column;
        gap: 0;
        padding: 12px;
    }

    .task-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    /* Group divider */
    .group-divider {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 4px 0 8px;
    }

    .group-hr {
        flex: 1;
        border: none;
        border-top: 1px solid var(--border-default);
        margin: 0;
    }

    .group-label {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-tertiary);
        white-space: nowrap;
        flex-shrink: 0;
    }

    /* ── Task card ───────────────────────────────────────────── */
    .task-card {
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 9px 11px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-default);
        border-left-width: 3px;
        background: var(--bg-base);
        transition: border-color 0.2s ease, background 0.2s ease;
    }

    .task-card--pending {
        border-left-color: var(--border-default);
    }

    .task-card--running {
        border-left-color: var(--color-primary-400);
    }

    .task-card--success {
        border-left-color: var(--color-success-500, #22c55e);
    }

    .task-card--error {
        border-left-color: var(--color-danger-500);
    }

    .task-card--skipped {
        border-left-color: var(--border-default);
        opacity: 0.5;
    }

    /* Shimmer while running */
    .task-card--shimmer {
        background: linear-gradient(90deg,
                var(--bg-base) 0%,
                color-mix(in srgb, var(--color-primary-500) 5%, var(--bg-base)) 50%,
                var(--bg-base) 100%);
        background-size: 200% 100%;
        animation: shimmer 2s linear infinite;
    }

    @keyframes shimmer {
        from {
            background-position: 200% 0;
        }

        to {
            background-position: -200% 0;
        }
    }

    /* Task meta row (status dot + chip + action btns) */
    .task-meta {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    /* Status dot */
    .status-dot {
        position: relative;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .dot--pending {
        background: var(--text-tertiary);
        opacity: 0.35;
    }

    .dot--running {
        background: var(--color-primary-400);
    }

    .dot--success {
        background: var(--color-success-500, #22c55e);
    }

    .dot--error {
        background: var(--color-danger-500);
    }

    .dot--skipped {
        background: var(--text-tertiary);
        opacity: 0.25;
    }

    .dot-ring {
        position: absolute;
        inset: -3px;
        border-radius: 50%;
        border: 1.5px solid var(--color-primary-400);
        animation: ring-pulse 1.2s ease-out infinite;
    }

    @keyframes ring-pulse {
        0% {
            transform: scale(0.7);
            opacity: 0.8;
        }

        100% {
            transform: scale(2);
            opacity: 0;
        }
    }

    /* Status chip */
    .status-chip {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .chip--pending {
        color: var(--text-tertiary);
    }

    .chip--running {
        color: var(--color-primary-500);
    }

    .chip--success {
        color: var(--color-success-600, #16a34a);
    }

    .chip--error {
        color: var(--color-danger-500);
    }

    .chip--skipped {
        color: var(--text-tertiary);
    }

    /* Task action buttons (edit, move, delete) */
    .meta-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px;
        border-radius: 3px;
        color: var(--text-tertiary);
        transition: color 0.1s, background 0.1s;
    }

    .meta-btn:first-of-type {
        margin-left: auto;
    }

    .meta-btn:hover:not(:disabled) {
        color: var(--text-primary);
        background: var(--bg-hover);
    }

    .meta-btn:disabled {
        opacity: 0.25;
        cursor: default;
    }

    .meta-btn--danger:hover:not(:disabled) {
        color: var(--color-danger-500);
        background: color-mix(in srgb, var(--color-danger-500) 8%, transparent);
    }

    /* Task name + description */
    .task-name {
        margin: 0;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.4;
        font-size: 13px;
    }

    .task-desc {
        margin: 0;
        font-size: 12px;
        color: var(--text-secondary);
        line-height: 1.5;
    }

    .task-desc :deep(p) {
        margin: 0 0 4px;
    }

    .task-desc :deep(p:last-child) {
        margin-bottom: 0;
    }

    .task-desc :deep(ul),
    .task-desc :deep(ol) {
        margin: 2px 0;
        padding-left: 18px;
    }

    .task-desc :deep(code) {
        font-size: 11px;
    }

    /* Inline edit inputs */
    .edit-input {
        width: 100%;
        background: var(--bg-input);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-sm);
        padding: 5px 8px;
        font-size: 12px;
        color: var(--text-primary);
        outline: none;
        font-family: inherit;
        resize: vertical;
        transition: border-color 0.12s;
        box-sizing: border-box;
    }

    .edit-input:focus {
        border-color: var(--border-focus);
    }

    .edit-name {
        font-weight: 600;
    }

    .edit-actions {
        display: flex;
        gap: 6px;
        justify-content: flex-end;
    }

    /* Tiny buttons */
    .btn-sm {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 9px;
        border-radius: var(--radius-sm);
        border: 1px solid transparent;
        cursor: pointer;
        transition: background 0.1s, opacity 0.1s;
    }

    .btn-primary {
        background: var(--color-primary-600);
        color: #fff;
        border-color: var(--color-primary-600);
    }

    .btn-primary:hover {
        background: var(--color-primary-700, var(--color-primary-600));
    }

    .btn-ghost {
        background: none;
        color: var(--text-secondary);
        border-color: var(--border-default);
    }

    .btn-ghost:hover {
        background: var(--bg-hover);
    }

    /* Result area */
    .task-result-area {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    /* Tool calls area inside task cards */
    .task-tools-area {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
    }

    .task-tools-list {
        display: flex;
        flex-direction: column;
        gap: 0;
        margin-top: 2px;
    }

    .result-toggle {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 11px;
        color: var(--text-tertiary);
        padding: 0;
        transition: color 0.1s;
    }

    .result-toggle:hover {
        color: var(--text-secondary);
    }

    .toggle-chevron {
        transition: transform 0.15s ease;
    }

    .toggle-chevron--open {
        transform: rotate(180deg);
    }

    .task-result {
        font-size: 11px;
        color: var(--text-secondary);
        background: var(--bg-muted);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-sm);
        padding: 6px 8px;
        max-height: 200px;
        overflow-y: auto;
        word-break: break-word;
    }

    .task-result :deep(p) {
        margin: 0 0 4px;
    }

    .task-result :deep(p:last-child) {
        margin-bottom: 0;
    }

    .task-result :deep(pre) {
        margin: 4px 0;
        font-size: 11px;
    }

    .task-result :deep(code) {
        font-size: 11px;
    }

    /* Streaming cursor */
    .stream-cursor {
        display: inline-block;
        width: 2px;
        height: 11px;
        background: currentColor;
        margin-left: 1px;
        vertical-align: text-bottom;
        border-radius: 1px;
        animation: cur-blink 1s step-end infinite;
    }

    @keyframes cur-blink {

        0%,
        100% {
            opacity: 1;
        }

        50% {
            opacity: 0;
        }
    }

    /* ── Footer (Approve / Reject) ───────────────────────────── */
    .add-task-row {
        padding: 0 12px 10px;
    }

    .btn-add-task {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        width: 100%;
        justify-content: center;
        padding: 6px 0;
        background: none;
        border: 1.5px dashed var(--border-default);
        border-radius: var(--radius-md);
        color: var(--text-tertiary);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: border-color 0.12s, color 0.12s, background 0.12s;
    }

    .btn-add-task:hover {
        border-color: var(--color-primary-400);
        color: var(--color-primary-500);
        background: color-mix(in srgb, var(--color-primary-500) 5%, transparent);
    }

    .plan-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-top: 1px solid var(--border-default);
        background: var(--bg-muted);
    }

    .btn-approve {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: var(--color-success-600, #16a34a);
        color: #fff;
        border: none;
        border-radius: var(--radius-lg);
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.12s;
    }

    .btn-approve:hover {
        opacity: 0.88;
    }

    .btn-reject {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: none;
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        color: var(--text-secondary);
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.1s, border-color 0.1s, color 0.1s;
    }

    .btn-reject:hover {
        border-color: var(--color-danger-500);
        color: var(--color-danger-500);
        background: color-mix(in srgb, var(--color-danger-500) 6%, transparent);
    }

    /* ── Running hint ────────────────────────────────────────── */
    .running-hint {
        display: flex;
        align-items: center;
        gap: 7px;
        margin: 0;
        padding: 8px 14px;
        border-top: 1px solid var(--border-default);
        font-size: 12px;
        color: var(--text-tertiary);
        font-style: italic;
    }

    .mini-spinner {
        display: inline-block;
        width: 11px;
        height: 11px;
        border: 1.5px solid var(--border-strong);
        border-top-color: var(--color-primary-400);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        flex-shrink: 0;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
