<script setup lang="ts">
    import { ref, computed, onMounted } from 'vue';
    import { Plus, KeyRound, RefreshCw, Ban, TriangleAlert, Copy, Check } from 'lucide-vue-next';
    import AppButton from '@/components/ui/AppButton.vue';
    import AppModal from '@/components/ui/AppModal.vue';
    import AppInput from '@/components/ui/AppInput.vue';
    import AppAlert from '@/components/ui/AppAlert.vue';
    import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
    import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
    import EmptyState from '@/components/ui/EmptyState.vue';
    import { useTenantStore } from '@/stores/tenant';
    import { useError } from '@/composables/useError';
    import type { ApiKey } from '@/types';

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    const tenantStore = useTenantStore();
    const { resolveMessage, useFormErrors } = useError();

    onMounted(async () => {
        if (tenantStore.apiKeys.length === 0) await tenantStore.loadKeys();
    });

    const showCreateModal = ref(false);
    const label = ref('');
    const creating = ref(false);
    const { errors, setFromApiError, clearErrors } = useFormErrors();

    // ── Copy-once modal (shared between create + regenerate) ────────────────
    const createdKey = ref<string | null>(null);
    const showKeyModal = ref(false);
    const copiedKey = ref(false);
    const copiedVscode = ref(false);

    const vscodeConfig = computed(() => {
        if (!createdKey.value) return '';
        return JSON.stringify({
            servers: {
                'MCP Central': {
                    type: 'http',
                    url: `${BASE_URL}/mcp`,
                    headers: {
                        Authorization: `Bearer ${createdKey.value}`,
                    },
                },
            },
        }, null, 2);
    });

    // ── Revoke ─────────────────────────────────────────────────────
    const revokeTarget = ref<ApiKey | null>(null);
    const revoking = ref(false);

    // ── Regenerate ───────────────────────────────────────────────
    const regenerateTarget = ref<ApiKey | null>(null);
    const regenerating = ref(false);

    async function create() {
        clearErrors();
        creating.value = true;
        try {
            const newKey = await tenantStore.createKey(label.value.trim());
            createdKey.value = newKey.key;
            showCreateModal.value = false;
            showKeyModal.value = true;
            label.value = '';
        } catch (err) {
            setFromApiError(err);
        } finally {
            creating.value = false;
        }
    }

    async function copyKey() {
        if (!createdKey.value) return;
        await navigator.clipboard.writeText(createdKey.value);
        copiedKey.value = true;
        setTimeout(() => { copiedKey.value = false; }, 2000);
    }

    async function copyVscodeConfig() {
        if (!vscodeConfig.value) return;
        await navigator.clipboard.writeText(vscodeConfig.value);
        copiedVscode.value = true;
        setTimeout(() => { copiedVscode.value = false; }, 2000);
    }

    function acknowledgeKey() {
        createdKey.value = null;
        showKeyModal.value = false;
        copiedKey.value = false;
        copiedVscode.value = false;
    }

    async function confirmRevoke() {
        if (!revokeTarget.value) return;
        revoking.value = true;
        try {
            await tenantStore.revokeKey(revokeTarget.value.id);
            revokeTarget.value = null;
        } catch (err) {
            const toast = (await import('@/stores/toast')).useToastStore();
            toast.error(resolveMessage(err));
        } finally {
            revoking.value = false;
        }
    }

    async function confirmRegenerate() {
        if (!regenerateTarget.value) return;
        regenerating.value = true;
        try {
            const newKey = await tenantStore.regenerateKey(regenerateTarget.value.id);
            createdKey.value = newKey.key;
            regenerateTarget.value = null;
            showKeyModal.value = true;
        } catch (err) {
            const toast = (await import('@/stores/toast')).useToastStore();
            toast.error(resolveMessage(err));
        } finally {
            regenerating.value = false;
        }
    }

    function formatDate(d: string | null): string {
        if (!d) return 'Never';
        return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(d));
    }
</script>

<template>
    <div class="px-4 md:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
        <div class="flex items-center justify-between mb-6">
            <div>
                <h2 class="text-base font-semibold" style="color: var(--text-primary);">API Keys</h2>
                <p class="text-sm mt-1" style="color: var(--text-secondary);">Keys used by your AI clients (VS Code,
                    Claude Desktop…) to authenticate with this tenant’s proxy</p>
            </div>
            <AppButton class="shrink-0" @click="showCreateModal = true">
                <Plus :size="16" :stroke-width="2.5" />
                Create Key
            </AppButton>
        </div>

        <div v-if="tenantStore.isLoading" class="card overflow-hidden">
            <div v-for="i in 3" :key="i" class="flex items-center gap-4 px-5 py-4 border-b"
                style="border-color: var(--border-default);">
                <SkeletonBlock height="1rem" width="30%" />
                <SkeletonBlock height="1rem" width="20%" />
                <SkeletonBlock height="1rem" width="25%" />
            </div>
        </div>

        <EmptyState v-else-if="tenantStore.apiKeys.length === 0" title="No API keys"
            description="Create an API key to connect MCP clients to this tenant.">
            <template #icon>
                <KeyRound :size="24" :stroke-width="1.5" style="color: var(--text-tertiary);" />
            </template>
            <AppButton size="sm" @click="showCreateModal = true">Create API Key</AppButton>
        </EmptyState>

        <div v-else class="card overflow-hidden">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b" style="border-color: var(--border-default);">
                        <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                            style="color: var(--text-tertiary);">Label</th>
                        <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                            style="color: var(--text-tertiary);">Prefix</th>
                        <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell"
                            style="color: var(--text-tertiary);">Last used</th>
                        <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell"
                            style="color: var(--text-tertiary);">Created</th>
                        <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                            style="color: var(--text-tertiary);">Status</th>
                        <th class="px-5 py-3" />
                    </tr>
                </thead>
                <tbody class="divide-y" style="border-color: var(--border-default);">
                    <tr v-for="key in tenantStore.apiKeys" :key="key.id"
                        class="hover:bg-[var(--bg-hover)] transition-colors">
                        <td class="px-5 py-3 font-medium" style="color: var(--text-primary);">{{ key.label || '—' }}
                        </td>
                        <td class="px-5 py-3">
                            <code class="text-xs font-mono px-1.5 py-0.5 rounded"
                                style="background: var(--bg-muted); color: var(--text-secondary);">{{ key.keyPrefix }}…</code>
                        </td>
                        <td class="px-5 py-3 hidden sm:table-cell" style="color: var(--text-secondary);">{{
                            formatDate(key.lastUsedAt) }}</td>
                        <td class="px-5 py-3 hidden md:table-cell" style="color: var(--text-secondary);">{{
                            formatDate(key.createdAt) }}</td>
                        <td class="px-5 py-3">
                            <span :class="['badge', key.isActive ? 'badge-success' : 'badge-neutral']">{{ key.isActive ?
                                'Active' : 'Inactive' }}</span>
                        </td>
                        <td class="px-5 py-3">
                            <div class="flex items-center gap-1 justify-end">
                                <AppButton variant="ghost" size="sm" @click="regenerateTarget = key">
                                    <RefreshCw :size="14" class="text-amber-500" />
                                    Regenerate
                                </AppButton>
                                <AppButton variant="ghost" size="sm" @click="revokeTarget = key">
                                    <Ban :size="14" class="text-red-500" />
                                    Revoke
                                </AppButton>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Create key modal -->
    <AppModal :open="showCreateModal" title="Create API Key" size="sm" :closable="!creating"
        @close="showCreateModal = false">
        <form @submit.prevent="create" class="flex flex-col gap-4">
            <AppAlert v-if="errors['_global']" :message="errors['_global']" type="error" />
            <AppInput v-model="label" label="Label (optional)" placeholder="e.g. VS Code" :error="errors['label']"
                id="key-label" hint="A memorable name for this key" />
        </form>
        <template #footer>
            <AppButton variant="secondary" :disabled="creating" @click="showCreateModal = false">Cancel</AppButton>
            <AppButton :loading="creating" @click="create">Create Key</AppButton>
        </template>
    </AppModal>

    <!-- Copy-once modal (create or regenerate) -->
    <AppModal :open="showKeyModal" title="API Key Ready" size="lg" :closable="false">
        <div class="flex flex-col gap-5">
            <div class="flex items-start gap-3 p-3 rounded-lg border border-amber-200"
                style="background: rgba(251,191,36,.08);">
                <TriangleAlert class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p class="text-sm font-medium" style="color: var(--text-primary);">Copy and save this key now — it will
                    never be shown again.</p>
            </div>

            <!-- Raw key -->
            <div>
                <label class="text-xs font-semibold uppercase tracking-wider block mb-1.5"
                    style="color: var(--text-tertiary);">API Key</label>
                <div class="flex items-center gap-2">
                    <code class="flex-1 text-xs font-mono px-3 py-2.5 rounded-lg border break-all"
                        style="background: var(--bg-muted); color: var(--text-primary); border-color: var(--border-default);">{{
                            createdKey }}</code>
                    <AppButton variant="secondary" size="sm" @click="copyKey" class="shrink-0">
                        <Copy v-if="!copiedKey" :size="14" />
                        <Check v-else :size="14" class="text-green-500" />
                        {{ copiedKey ? 'Copied!' : 'Copy' }}
                    </AppButton>
                </div>
            </div>

            <!-- VS Code config snippet -->
            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <label class="text-xs font-semibold uppercase tracking-wider"
                        style="color: var(--text-tertiary);">VS
                        Code — settings.json</label>
                    <AppButton variant="ghost" size="sm" @click="copyVscodeConfig">
                        <Copy v-if="!copiedVscode" :size="14" />
                        <Check v-else :size="14" class="text-green-500" />
                        {{ copiedVscode ? 'Copied!' : 'Copy snippet' }}
                    </AppButton>
                </div>
                <pre class="text-xs font-mono rounded-lg px-4 py-3 overflow-x-auto leading-relaxed"
                    style="background: var(--bg-muted); color: var(--text-secondary);">{{ vscodeConfig }}</pre>
            </div>
        </div>
        <template #footer>
            <AppButton @click="acknowledgeKey">I've saved my key</AppButton>
        </template>
    </AppModal>

    <!-- Revoke confirm -->
    <ConfirmDialog :open="!!revokeTarget" title="Revoke API Key"
        :message="`Revoke '${revokeTarget?.label || revokeTarget?.keyPrefix}'? Any clients using this key will lose access immediately.`"
        confirm-label="Revoke" :loading="revoking" @confirm="confirmRevoke" @cancel="revokeTarget = null" />

    <!-- Regenerate confirm -->
    <ConfirmDialog :open="!!regenerateTarget" title="Regenerate API Key"
        :message="`Regenerate '${regenerateTarget?.label || regenerateTarget?.keyPrefix}'? The current key will stop working immediately and a new one will be issued.`"
        confirm-label="Regenerate" :loading="regenerating" @confirm="confirmRegenerate"
        @cancel="regenerateTarget = null" />
</template>
