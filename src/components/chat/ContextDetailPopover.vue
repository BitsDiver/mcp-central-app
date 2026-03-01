<script setup lang="ts">
    import { computed } from 'vue';
    import { useChatStore } from '@/stores/chat';
    import { useChatSettingsStore } from '@/stores/chatSettings';
    import { useToolStore } from '@/stores/tools';

    const props = defineProps<{
        usedTokens: number;
        contextSize: number;
        /** 0–1 ratio */
        usage: number;
    }>();

    defineEmits<{ close: []; }>();

    const chatStore = useChatStore();
    const settingsStore = useChatSettingsStore();
    const toolStore = useToolStore();

    // ── Helpers ──────────────────────────────────────────────────

    /** Rough token estimate (~4 chars / token) */
    function est(text: string): number {
        return Math.ceil(text.length / 4);
    }

    function fmtTokens(n: number): string {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
        return String(n);
    }

    // ── Token breakdown ────────────────────────────────────────
    // System Instructions & Tool Definitions are always estimable from local data.
    // Messages & Tool Results are scaled proportionally when real usage is available.

    const systemPrompt = computed(() => {
        const session = chatStore.activeSession;
        return session?.systemPrompt || settingsStore.settings.systemPrompt || '';
    });

    const breakdown = computed(() => {
        const tools = toolStore.tools;
        const messages = chatStore.activeSession?.messages ?? [];

        // Raw estimates (≈ 4 chars / token)
        const rawSystem = est(systemPrompt.value);
        const rawToolDefs =
            tools.length > 0
                ? est(
                    JSON.stringify(
                        tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
                    ),
                )
                : 0;
        const rawMessages = messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .reduce((sum, m) => sum + est(m.content), 0);
        const rawToolResults = messages
            .filter((m) => m.role === 'tool')
            .reduce((sum, m) => sum + est(JSON.stringify(m.toolCalls ?? [])), 0);

        if (props.usedTokens === 0) {
            return { system: 0, toolDefs: 0, messages: 0, toolResults: 0 };
        }

        // System parts always use raw estimate
        const system = rawSystem;
        const toolDefs = rawToolDefs;

        // Scale conversation parts so system + toolDefs + msgs + results ≈ usedTokens
        const conversationBudget = Math.max(0, props.usedTokens - system - toolDefs);
        const rawConversation = rawMessages + rawToolResults;
        if (rawConversation > 0) {
            const s = conversationBudget / rawConversation;
            return { system, toolDefs, messages: Math.round(rawMessages * s), toolResults: Math.round(rawToolResults * s) };
        }
        return { system, toolDefs, messages: 0, toolResults: 0 };
    });

    /** Best-available total token count */
    const totalTokens = computed(() => props.usedTokens);

    const effectiveUsage = computed(() => props.usage);

    const pct = computed(() => Math.round(effectiveUsage.value * 100));

    const level = computed(() => {
        const u = effectiveUsage.value;
        if (u >= 0.90) return 'full';
        if (u >= 0.80) return 'high';
        if (u >= 0.60) return 'mid';
        return 'low';
    });

    const barColor = computed(() => {
        const m: Record<string, string> = {
            low: '#22c55e',
            mid: '#f59e0b',
            high: '#f97316',
            full: '#ef4444',
        };
        return m[level.value];
    });

    /** Category rows grouped by section */
    const sections = computed(() => {
        const b = breakdown.value;
        const ctx = props.contextSize || 1;
        const result: { title: string; rows: { label: string; pct: string; }[]; }[] = [];

        const systemRows: { label: string; pct: string; }[] = [];
        if (b.system > 0) systemRows.push({ label: 'System Instructions', pct: ((b.system / ctx) * 100).toFixed(1) });
        if (b.toolDefs > 0) systemRows.push({ label: 'Tool Definitions', pct: ((b.toolDefs / ctx) * 100).toFixed(1) });
        if (systemRows.length) result.push({ title: 'System', rows: systemRows });

        const userRows: { label: string; pct: string; }[] = [];
        if (b.messages > 0) userRows.push({ label: 'Messages', pct: ((b.messages / ctx) * 100).toFixed(1) });
        if (b.toolResults > 0) userRows.push({ label: 'Tool Results', pct: ((b.toolResults / ctx) * 100).toFixed(1) });
        if (userRows.length) result.push({ title: 'User Context', rows: userRows });

        return result;
    });
</script>

<template>
    <!-- Backdrop -->
    <div class="popover-backdrop" @click.self="$emit('close')">
        <div class="popover-card">
            <!-- Header -->
            <div class="popover-header">
                <span class="popover-title">Context Window</span>
                <button type="button" class="popover-close" @click="$emit('close')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5">
                        <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
                    </svg>
                </button>
            </div>

            <!-- Usage summary -->
            <div class="usage-summary">
                <span class="usage-text">{{ fmtTokens(totalTokens) }} / {{ fmtTokens(contextSize) }} tokens</span>
                <span class="usage-pct" :style="{ color: barColor }">{{ pct }}%</span>
            </div>

            <!-- Progress bar -->
            <div class="progress-track">
                <div class="progress-fill" :style="{ width: `${Math.min(pct, 100)}%`, background: barColor }" />
            </div>

            <!-- Breakdown sections -->
            <template v-if="sections.length > 0">
                <div v-for="sec in sections" :key="sec.title" class="section">
                    <div class="section-title">{{ sec.title }}</div>
                    <div v-for="row in sec.rows" :key="row.label" class="row">
                        <span class="row-label">{{ row.label }}</span>
                        <span class="row-pct">{{ row.pct }}%</span>
                    </div>
                </div>
            </template>
            <div v-else class="no-data">No usage data yet</div>
        </div>
    </div>
</template>

<style scoped>
    .popover-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        /* transparent backdrop to catch clicks outside */
    }

    .popover-card {
        position: absolute;
        bottom: 68px;
        right: 16px;
        width: 280px;
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        padding: 14px 16px;
        z-index: 101;
        font-family: var(--font-sans);
    }

    [data-theme='dark'] .popover-card {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    }

    .popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
    }

    .popover-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-primary);
        letter-spacing: 0.01em;
    }

    .popover-close {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: none;
        color: var(--text-tertiary);
        cursor: pointer;
        border-radius: var(--radius-sm);
        transition: color 0.12s, background 0.12s;
    }

    .popover-close:hover {
        color: var(--text-primary);
        background: var(--bg-hover);
    }

    /* ── Usage summary ───────────────────────────────── */
    .usage-summary {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 6px;
    }

    .usage-text {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
    }

    .usage-pct {
        font-size: 13px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }

    /* ── Progress bar ────────────────────────────────── */
    .progress-track {
        height: 4px;
        border-radius: 2px;
        background: var(--border-default);
        overflow: hidden;
        margin-bottom: 14px;
    }

    .progress-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.4s ease, background 0.3s ease;
    }

    /* ── Sections ────────────────────────────────────── */
    .section {
        margin-bottom: 10px;
    }

    .section:last-child {
        margin-bottom: 0;
    }

    .section-title {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 4px;
    }

    .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 2px 0;
    }

    .row-label {
        font-size: 12px;
        color: var(--text-secondary);
    }

    .row-pct {
        font-size: 12px;
        font-weight: 500;
        color: var(--text-tertiary);
        font-variant-numeric: tabular-nums;
    }

    .no-data {
        font-size: 12px;
        color: var(--text-tertiary);
        text-align: center;
        padding: 4px 0;
    }
</style>
