<script setup lang="ts">
    import { computed } from 'vue';
    import type { AgentTask, AgentTaskStatus } from '@/types';

    const props = defineProps<{ task: AgentTask; }>();

    const STATUS_ICONS: Record<AgentTaskStatus, string> = {
        pending: '○',
        running: '◌',
        success: '✓',
        error: '✕',
        skipped: '–',
    };

    const statusClass = computed(() => {
        const map: Record<AgentTaskStatus, string> = {
            pending: 'agent-block--pending',
            running: 'agent-block--running',
            success: 'agent-block--success',
            error: 'agent-block--error',
            skipped: 'agent-block--skipped',
        };
        return map[props.task.status];
    });

    const hasResult = computed(() => !!props.task.result);
</script>

<template>
    <div :class="['agent-block', statusClass]">
        <span class="agent-status-icon">{{ STATUS_ICONS[task.status] }}</span>
        <div class="agent-body">
            <p class="agent-name">{{ task.name }}</p>
            <p v-if="task.error" class="agent-error">{{ task.error }}</p>
            <p v-else-if="hasResult" class="agent-result">
                {{ task.result }}
                <span v-if="task.status === 'running'" class="streaming-cursor" />
            </p>
        </div>
    </div>
</template>

<style scoped>
    .agent-block {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 7px 11px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-default);
        background: var(--bg-muted);
        font-size: 12px;
        max-width: min(560px, 100%);
    }

    .agent-status-icon {
        flex-shrink: 0;
        font-size: 13px;
        line-height: 1.6;
        width: 14px;
        text-align: center;
    }

    .agent-body {
        flex: 1;
        min-width: 0;
    }

    .agent-name {
        margin: 0;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.5;
    }

    .agent-result {
        margin: 3px 0 0;
        color: var(--text-secondary);
        line-height: 1.5;
        white-space: pre-wrap;
        max-height: 160px;
        overflow-y: auto;
    }

    .agent-error {
        margin: 3px 0 0;
        color: var(--color-danger-500);
        font-size: 11px;
    }

    /* Status variants */
    .agent-block--running {
        border-color: var(--color-primary-300, #93c5fd);
        background: color-mix(in srgb, var(--color-primary-500) 5%, var(--bg-muted));
    }

    .agent-block--success {
        border-color: var(--color-success-300, #86efac);
        background: color-mix(in srgb, var(--color-success-500, #22c55e) 5%, var(--bg-muted));
    }

    .agent-block--error {
        border-color: var(--color-danger-300, #fca5a5);
        background: color-mix(in srgb, var(--color-danger-500) 5%, var(--bg-muted));
    }

    .agent-block--running .agent-status-icon {
        color: var(--color-primary-500);
        animation: pulse 1s ease-in-out infinite;
    }

    .agent-block--success .agent-status-icon {
        color: var(--color-success-600, #16a34a);
    }

    .agent-block--error .agent-status-icon {
        color: var(--color-danger-500);
    }

    @keyframes pulse {

        0%,
        100% {
            opacity: 1;
        }

        50% {
            opacity: 0.3;
        }
    }

    .streaming-cursor {
        display: inline-block;
        width: 2px;
        height: 11px;
        background: currentColor;
        margin-left: 2px;
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
</style>
