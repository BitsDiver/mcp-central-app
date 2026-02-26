<script setup lang="ts">
    import { ref, computed, watch } from 'vue';
    import AppModal from '@/components/ui/AppModal.vue';
    import AppButton from '@/components/ui/AppButton.vue';
    import AppInput from '@/components/ui/AppInput.vue';
    import AppAlert from '@/components/ui/AppAlert.vue';
    import CopyField from '@/components/ui/CopyField.vue';
    import { useAgentStore } from '@/stores/agents';
    import type { AgentWithStatus, AgentCreateResponse } from '@/types';

    const props = defineProps<{ open: boolean; agent: AgentWithStatus | null; }>();
    const emit = defineEmits<{ close: []; }>();

    const agentStore = useAgentStore();

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    // ── Form state ───────────────────────────────────────────────────────────
    const step = ref<1 | 2>(1);
    const name = ref('');
    const ipWhitelistRaw = ref('');
    const submitting = ref(false);
    const regenerating = ref(false);
    const error = ref<string | null>(null);
    const regenerated = ref<AgentCreateResponse | null>(null);

    // Pre-fill form when the modal opens or the agent changes
    watch(
        () => [props.open, props.agent] as const,
        ([open, agent]) => {
            if (open && agent) {
                step.value = 1;
                name.value = agent.name;
                ipWhitelistRaw.value = (agent.ipWhitelist ?? []).join('\n');
                error.value = null;
                regenerated.value = null;
                submitting.value = false;
                regenerating.value = false;
            }
        },
        { immediate: true },
    );

    const npxCommand = computed(() =>
        regenerated.value
            ? `npx mcp-central-agent start --config mcp-agent.json`
            : '',
    );

    const configJson = computed(() => {
        if (!regenerated.value) return '';
        return JSON.stringify(
            {
                serverUrl: BASE_URL,
                agentName: regenerated.value.name,
                apiKey: regenerated.value.key,
            },
            null,
            2,
        );
    });

    function handleClose() {
        emit('close');
    }

    async function submit() {
        if (!name.value.trim()) {
            error.value = 'Name is required.';
            return;
        }
        if (!props.agent) return;
        error.value = null;
        submitting.value = true;
        try {
            const ips = ipWhitelistRaw.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
            await agentStore.updateAgent(props.agent.id, name.value.trim(), ips);
            emit('close');
        } catch (err: unknown) {
            error.value = err instanceof Error ? err.message : 'Failed to update agent.';
        } finally {
            submitting.value = false;
        }
    }

    async function doRegenerateKey() {
        if (!props.agent) return;
        error.value = null;
        regenerating.value = true;
        try {
            const result = await agentStore.regenerateKey(props.agent.id);
            regenerated.value = result;
            step.value = 2;
        } catch (err: unknown) {
            error.value = err instanceof Error ? err.message : 'Failed to regenerate key.';
        } finally {
            regenerating.value = false;
        }
    }

    function downloadConfig() {
        if (!configJson.value) return;
        const blob = new Blob([configJson.value], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mcp-agent.json';
        a.click();
        URL.revokeObjectURL(url);
    }
</script>

<template>
    <AppModal :open="open" :title="step === 1 ? 'Edit Agent' : 'New API Key'" size="md"
        :closable="!submitting && !regenerating" @close="handleClose">

        <!-- Step 1: Edit form -->
        <template v-if="step === 1">
            <div class="flex flex-col gap-4">
                <AppAlert v-if="error" :message="error" type="error" />
                <AppInput v-model="name" label="Agent Name" placeholder="My Laptop" id="edit-agent-name" required />
                <div>
                    <label class="block text-sm font-medium mb-1" style="color: var(--text-primary);">
                        IP Whitelist <span class="font-normal" style="color: var(--text-tertiary);">(optional)</span>
                    </label>
                    <textarea v-model="ipWhitelistRaw" rows="3" placeholder="192.168.1.10&#10;10.0.0.0/8"
                        class="w-full px-3 py-2 text-sm rounded-lg border outline-none font-mono resize-none"
                        style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);" />
                    <p class="text-xs mt-1" style="color: var(--text-tertiary);">
                        One IP or CIDR per line. Leave empty to allow connections from any IP.
                    </p>
                </div>

                <!-- Regenerate Key section -->
                <div class="rounded-lg border p-3 flex items-start gap-3"
                    style="background: rgba(239,68,68,.04); border-color: rgba(239,68,68,.2);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        class="shrink-0 mt-0.5 text-red-500">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs leading-relaxed mb-2" style="color: var(--text-secondary);">
                            <strong>Danger zone:</strong> Regenerating the API key will immediately invalidate the
                            current key. Any running agent using the old key will be disconnected.
                        </p>
                        <AppButton variant="secondary" size="sm" :loading="regenerating"
                            class="!text-red-500 !border-red-400/40 hover:!bg-red-500/10" @click="doRegenerateKey">
                            Regenerate API Key
                        </AppButton>
                    </div>
                </div>
            </div>
        </template>

        <!-- Step 2: Show new key -->
        <template v-else-if="step === 2 && regenerated">
            <div class="flex flex-col gap-5">
                <div class="flex items-start gap-3 p-3 rounded-lg border"
                    style="background: rgba(234,179,8,.06); border-color: rgba(234,179,8,.3);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        class="shrink-0 mt-0.5" style="color: #ca8a04;">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p class="text-xs leading-relaxed" style="color: var(--text-secondary);">
                        <strong>Save this API key — it won't be shown again.</strong>
                        Update your <code class="font-mono">mcp-agent.json</code> config with the new key, or download
                        the updated file below.
                    </p>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-xs font-semibold uppercase tracking-wider"
                        style="color: var(--text-tertiary);">New API Key</label>
                    <CopyField :value="regenerated.key" />
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-xs font-semibold uppercase tracking-wider"
                        style="color: var(--text-tertiary);">Run command</label>
                    <CopyField :value="npxCommand" />
                </div>

                <div class="flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-semibold uppercase tracking-wider"
                            style="color: var(--text-tertiary);">mcp-agent.json</label>
                        <button type="button" class="text-xs flex items-center gap-1 transition-colors hover:underline"
                            style="color: var(--text-link);" @click="downloadConfig">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                            </svg>
                            Download
                        </button>
                    </div>
                    <CopyField :value="configJson" />
                </div>
            </div>
        </template>

        <template #footer>
            <template v-if="step === 1">
                <AppButton variant="secondary" :disabled="submitting || regenerating" @click="handleClose">Cancel
                </AppButton>
                <AppButton :loading="submitting" :disabled="regenerating" @click="submit">Save Changes</AppButton>
            </template>
            <template v-else>
                <AppButton @click="handleClose">Done</AppButton>
            </template>
        </template>
    </AppModal>
</template>
