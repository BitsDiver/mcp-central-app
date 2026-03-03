<script setup lang="ts">
  import { ref, onMounted, computed } from 'vue';
  import { Plus, Building, Trash2, TriangleAlert, Copy, Check } from 'lucide-vue-next';
  import AppButton from '@/components/ui/AppButton.vue';
  import AppModal from '@/components/ui/AppModal.vue';
  import AppInput from '@/components/ui/AppInput.vue';
  import AppAlert from '@/components/ui/AppAlert.vue';
  import SkeletonBlock from '@/components/ui/SkeletonBlock.vue';
  import EmptyState from '@/components/ui/EmptyState.vue';
  import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
  import { useTenantStore } from '@/stores/tenant';
  import { useSocketStore } from '@/stores/socket';
  import { useEndpointStore } from '@/stores/endpoints';
  import { useToolStore } from '@/stores/tools';
  import { useStatusStore } from '@/stores/status';
  import { useToastStore } from '@/stores/toast';
  import { useAuthStore } from '@/stores/auth';
  import { useError } from '@/composables/useError';
  import type { NewApiKey, Tenant } from '@/types';

  const tenantStore = useTenantStore();
  const socketStore = useSocketStore();
  const endpointStore = useEndpointStore();
  const toolStore = useToolStore();
  const statusStore = useStatusStore();
  const toast = useToastStore();
  const authStore = useAuthStore();
  const { useFormErrors } = useError();

  onMounted(async () => {
    if (tenantStore.tenants.length === 0) await tenantStore.loadTenants();
  });

  const showWizard = ref(false);
  const wizardStep = ref<'name' | 'key'>('name');
  const tenantName = ref('');
  const creating = ref(false);
  const { errors, setFromApiError, clearErrors } = useFormErrors();
  const createdKey = ref<NewApiKey | null>(null);
  const copied = ref(false);
  const switching = ref<string | null>(null);

  // ── Delete tenant ──────────────────────────────────────────
  const deleteTarget = ref<Tenant | null>(null);
  const deleting = ref(false);

  async function confirmDeleteTenant() {
    if (!deleteTarget.value) return;
    const id = deleteTarget.value.id;
    const wasActive = tenantStore.selectedTenant?.id === id;
    deleting.value = true;
    try {
      await tenantStore.deleteTenant(id);
      deleteTarget.value = null;

      if (wasActive) {
        endpointStore.clear();
        toolStore.clear();
        statusStore.clear();
        const next = tenantStore.tenants[0];
        if (next) {
          tenantStore.setSelectedTenant(next);
          await socketStore.selectTenant(next.id);
          await tenantStore.loadKeys();
          if (tenantStore.apiKeys.length > 0) tenantStore.selectKey(tenantStore.apiKeys[0].id);
          await Promise.all([endpointStore.load(), toolStore.load(), statusStore.load()]);
        }
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete tenant.');
      deleteTarget.value = null;
    } finally {
      deleting.value = false;
    }
  }

  function openWizard() {
    wizardStep.value = 'name';
    tenantName.value = '';
    clearErrors();
    createdKey.value = null;
    showWizard.value = true;
  }

  async function createTenant() {
    if (!tenantName.value.trim()) {
      errors.value['name'] = 'Tenant name is required.';
      return;
    }
    clearErrors();
    creating.value = true;
    try {
      const result = await tenantStore.createTenant(tenantName.value.trim());
      createdKey.value = result.apiKey;
      wizardStep.value = 'key';
    } catch (err) {
      setFromApiError(err);
    } finally {
      creating.value = false;
    }
  }

  async function copyKey() {
    if (!createdKey.value?.key) return;
    await navigator.clipboard.writeText(createdKey.value.key);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  }

  function finishWizard() {
    showWizard.value = false;
    createdKey.value = null;
  }

  async function selectTenant(tenantId: string) {
    if (switching.value || tenantStore.selectedTenant?.id === tenantId) return;
    switching.value = tenantId;
    try {
      const tenant = tenantStore.tenants.find((t) => t.id === tenantId);
      if (!tenant) return;
      tenantStore.setSelectedTenant(tenant);
      await socketStore.selectTenant(tenantId);
      await tenantStore.loadKeys();
      if (tenantStore.apiKeys.length > 0) tenantStore.selectKey(tenantStore.apiKeys[0].id);
      endpointStore.clear();
      toolStore.clear();
      statusStore.clear();
      await Promise.all([endpointStore.load(), toolStore.load(), statusStore.load()]);
    } finally {
      switching.value = null;
    }
  }

  function formatDate(d: string): string {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(d));
  }

  const modalTitle = computed(() =>
    wizardStep.value === 'name' ? 'Create Tenant' : 'Save Your API Key'
  );
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-base font-semibold" style="color: var(--text-primary);">
          {{ authStore.isAdmin ? 'Tenants' : 'My Tenants' }}
        </h2>
        <p class="text-sm mt-1" style="color: var(--text-secondary);">Manage organizations and workspaces</p>
      </div>
      <AppButton @click="openWizard">
        <Plus :size="16" :stroke-width="2.5" />
        Create Tenant
      </AppButton>
    </div>

    <div v-if="tenantStore.isLoading" class="card overflow-hidden">
      <div v-for="i in 3" :key="i" class="flex items-center gap-4 px-5 py-4 border-b"
        style="border-color: var(--border-default);">
        <SkeletonBlock height="1rem" width="35%" />
        <SkeletonBlock height="1rem" width="20%" />
      </div>
    </div>

    <EmptyState v-else-if="tenantStore.tenants.length === 0" title="No tenants yet"
      description="Create your first tenant to get started with MCP Central.">
      <template #icon>
        <Building :size="24" :stroke-width="1.5" style="color: var(--text-tertiary);" />
      </template>
      <AppButton size="sm" @click="openWizard">Create Tenant</AppButton>
    </EmptyState>

    <div v-else class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b" style="border-color: var(--border-default);">
            <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
              style="color: var(--text-tertiary);">Name</th>
            <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell"
              style="color: var(--text-tertiary);">Created</th>
            <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
              style="color: var(--text-tertiary);">Status</th>
            <th class="px-5 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y" style="border-color: var(--border-default);">
          <tr v-for="tenant in tenantStore.tenants" :key="tenant.id"
            class="hover:bg-[var(--bg-hover)] transition-colors">
            <td class="px-5 py-3 font-medium" style="color: var(--text-primary);">{{ tenant.name }}</td>
            <td class="px-5 py-3 hidden sm:table-cell" style="color: var(--text-secondary);">{{
              formatDate(tenant.createdAt)
            }}</td>
            <td class="px-5 py-3">
              <span v-if="tenantStore.selectedTenant?.id === tenant.id" class="badge badge-success">Active</span>
              <span v-else class="badge badge-neutral">—</span>
            </td>
            <td class="px-5 py-3 text-right">
              <div class="flex items-center gap-2 justify-end">
                <AppButton v-if="tenantStore.selectedTenant?.id !== tenant.id" variant="secondary" size="sm"
                  :loading="switching === tenant.id" @click="selectTenant(tenant.id)">
                  Switch
                </AppButton>
                <span v-else class="text-xs font-medium" style="color: var(--text-tertiary);">Current</span>
                <AppButton variant="ghost" size="sm" :title="'Delete ' + tenant.name" @click="deleteTarget = tenant">
                  <Trash2 :size="14" class="text-red-400" />
                </AppButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <AppModal :open="showWizard" :title="modalTitle" size="md" :closable="wizardStep !== 'key'"
    @close="wizardStep === 'name' && (showWizard = false)">
    <form v-if="wizardStep === 'name'" @submit.prevent="createTenant" class="flex flex-col gap-4">
      <p class="text-sm" style="color: var(--text-secondary);">Tenants are isolated workspaces. Each tenant has its own
        endpoints and API keys.</p>
      <AppAlert v-if="errors['_global']" :message="errors['_global']" type="error" />
      <AppInput v-model="tenantName" label="Tenant Name" placeholder="e.g. My Organization" :error="errors['name']"
        required id="tenant-name" />
    </form>

    <div v-else class="flex flex-col gap-4">
      <div class="flex items-start gap-3 p-3 rounded-lg border border-amber-200"
        style="background: var(--color-warning-50);">
        <TriangleAlert class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p class="text-sm text-amber-700 font-medium">Copy and save this API key now. It will not be shown again.</p>
      </div>
      <div>
        <p class="text-xs font-medium mb-1" style="color: var(--text-secondary);">Tenant created successfully.</p>
        <label class="text-xs font-semibold uppercase tracking-wider block mb-1.5"
          style="color: var(--text-tertiary);">Default API Key</label>
        <div class="flex items-center gap-2">
          <code class="flex-1 text-xs font-mono px-3 py-2.5 rounded-lg border break-all"
            style="background: var(--bg-muted); color: var(--text-primary); border-color: var(--border-default);">{{
              createdKey?.key }}</code>
          <AppButton variant="secondary" size="sm" @click="copyKey" class="shrink-0">
            <Copy v-if="!copied" :size="15" />
            <Check v-else :size="15" class="text-green-500" />
            {{ copied ? 'Copied!' : 'Copy' }}
          </AppButton>
        </div>
      </div>
    </div>

    <template #footer>
      <template v-if="wizardStep === 'name'">
        <AppButton variant="secondary" :disabled="creating" @click="showWizard = false">Cancel</AppButton>
        <AppButton :loading="creating" @click="createTenant">Create Tenant</AppButton>
      </template>
      <AppButton v-else @click="finishWizard">I've saved my key — Done</AppButton>
    </template>
  </AppModal>

  <ConfirmDialog :open="!!deleteTarget" title="Delete Tenant" :message="deleteTarget
    ? `Permanently delete &quot;${deleteTarget.name}&quot;? This will remove all endpoints, API keys, and data associated with it. This cannot be undone.${tenantStore.selectedTenant?.id === deleteTarget.id
      ? ' This is your currently active tenant.'
      : ''
    }`
    : ''" confirm-label="Delete" :loading="deleting" @confirm="confirmDeleteTenant" @cancel="deleteTarget = null" />
</template>
