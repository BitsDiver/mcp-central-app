<script setup lang="ts">
    import { ref, computed } from 'vue';
    import AppModal from '@/components/ui/AppModal.vue';
    import AppButton from '@/components/ui/AppButton.vue';
    import AppInput from '@/components/ui/AppInput.vue';
    import AppAlert from '@/components/ui/AppAlert.vue';
    import CopyField from '@/components/ui/CopyField.vue';
    import { useAgentStore } from '@/stores/agents';
    import type { AgentCreateResponse } from '@/types';

    defineProps<{ open: boolean; }>();
    const emit = defineEmits<{ close: []; }>();

    const agentStore = useAgentStore();

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    // ── Form state ───────────────────────────────────────────────────────────
    const step = ref<1 | 2>(1);
    const name = ref('');
    const ipWhitelistRaw = ref('');
    const submitting = ref(false);
    const error = ref<string | null>(null);
    const created = ref<AgentCreateResponse | null>(null);

    const npxCommand = computed(() =>
        created.value
            ? `npx mcp-central-agent start --config mcp-agent.json`
            : '',
    );

    const configJson = computed(() => {
        if (!created.value) return '';
        return JSON.stringify(
            {
                serverUrl: BASE_URL,
                agentName: created.value.name,
                apiKey: created.value.key,
            },
            null,
            2,
        );
    });

    function reset() {
        step.value = 1;
        name.value = '';
        ipWhitelistRaw.value = '';
        submitting.value = false;
        error.value = null;
        created.value = null;
    }

    function handleClose() {
        reset();
        emit('close');
    }

    async function submit() {
        if (!name.value.trim()) {
            error.value = 'Name is required.';
            return;
        }
        error.value = null;
        submitting.value = true;
        try {
            const ips = ipWhitelistRaw.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
            const result = await agentStore.create(name.value.trim(), ips);
            created.value = result;
            step.value = 2;
        } catch (err: unknown) {
            error.value = err instanceof Error ? err.message : 'Failed to create agent.';
        } finally {
            submitting.value = false;
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
    <AppModal :open="open" :title="step === 1 ? 'Add Local Agent' : 'Agent Created'" size="md" :closable="!submitting"
        @close="handleClose">
        <!-- Step 1: Create form -->
        <template v-if="step === 1">
            <div class="flex flex-col gap-4">
                <p class="text-sm" style="color: var(--text-secondary);">
                    A local agent bridges private MCP servers (localhost, stdio) running on
                    your machine to MCP Central. Install it with <code class="font-mono">npx mcp-central-agent</code>.
                </p>
                <AppAlert v-if="error" :message="error" type="error" />
                <AppInput v-model="name" label="Agent Name" placeholder="My Laptop" id="agent-name" required />
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
            </div>
        </template>

        <!-- Step 2: Show key + npx command + config -->
        <template v-else-if="step === 2 && created">
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
                        Copy it to your <code class="font-mono">mcp-agent.json</code> config or download the file below.
                    </p>
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-xs font-semibold uppercase tracking-wider"
                        style="color: var(--text-tertiary);">API Key</label>
                    <CopyField :value="created.key" />
                </div>

                <div class="flex flex-col gap-1">
                    <label class="text-xs font-semibold uppercase tracking-wider"
                        style="color: var(--text-tertiary);">Run command</label>
                    <CopyField :value="npxCommand" />
                    <p class="text-xs mt-0.5" style="color: var(--text-tertiary);">
                        Run this on the machine where your local MCP servers are.
                    </p>
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
                    <p class="text-xs mt-0.5" style="color: var(--text-tertiary);">
                        Place this file in your project directory, then run the command above.
                    </p>
                </div>
            </div>
        </template>

        <template #footer>
            <template v-if="step === 1">
                <AppButton variant="secondary" :disabled="submitting" @click="handleClose">Cancel</AppButton>
                <AppButton :loading="submitting" @click="submit">Create Agent</AppButton>
            </template>
            <template v-else>
                <AppButton @click="handleClose">Done</AppButton>
            </template>
        </template>
    </AppModal>
</template>
