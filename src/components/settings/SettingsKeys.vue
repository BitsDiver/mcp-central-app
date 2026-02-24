<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useTenantStore } from '@/stores/tenant'
import { useError } from '@/composables/useError'
import type { ApiKey } from '@/types'

const tenantStore = useTenantStore()
const { resolveMessage, useFormErrors } = useError()

onMounted(async () => {
  if (tenantStore.apiKeys.length === 0) await tenantStore.loadKeys()
})

const showCreateModal = ref(false)
const label = ref('')
const creating = ref(false)
const { errors, setFromApiError, clearErrors } = useFormErrors()

const createdKey = ref<string | null>(null)
const showKeyModal = ref(false)
const copied = ref(false)

const revokeTarget = ref<ApiKey | null>(null)
const revoking = ref(false)

async function create() {
  clearErrors()
  creating.value = true
  try {
    const newKey = await tenantStore.createKey(label.value.trim())
    createdKey.value = newKey.key
    showCreateModal.value = false
    showKeyModal.value = true
    label.value = ''
  } catch (err) {
    setFromApiError(err)
  } finally {
    creating.value = false
  }
}

async function copyKey() {
  if (!createdKey.value) return
  await navigator.clipboard.writeText(createdKey.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function acknowledgeKey() {
  createdKey.value = null
  showKeyModal.value = false
}

async function confirmRevoke() {
  if (!revokeTarget.value) return
  revoking.value = true
  try {
    await tenantStore.revokeKey(revokeTarget.value.id)
    revokeTarget.value = null
  } catch (err) {
    const toast = (await import('@/stores/toast')).useToastStore()
    toast.error(resolveMessage(err))
  } finally {
    revoking.value = false
  }
}

function formatDate(d: string | null): string {
  if (!d) return 'Never'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(d))
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-base font-semibold" style="color: var(--text-primary);">API Keys</h2>
        <p class="text-sm mt-1" style="color: var(--text-secondary);">Keys used by your AI clients (VS Code, Claude Desktop…) to authenticate with this tenant's proxy</p>
      </div>
      <AppButton @click="showCreateModal = true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        Create Key
      </AppButton>
    </div>

    <div v-if="tenantStore.isLoading" class="card overflow-hidden">
      <div v-for="i in 3" :key="i" class="flex items-center gap-4 px-5 py-4 border-b" style="border-color: var(--border-default);">
        <SkeletonBlock height="1rem" width="30%" />
        <SkeletonBlock height="1rem" width="20%" />
        <SkeletonBlock height="1rem" width="25%" />
      </div>
    </div>

    <EmptyState
      v-else-if="tenantStore.apiKeys.length === 0"
      title="No API keys"
      description="Create an API key to connect MCP clients to this tenant."
    >
      <template #icon>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-tertiary);">
          <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </template>
      <AppButton size="sm" @click="showCreateModal = true">Create API Key</AppButton>
    </EmptyState>

    <div v-else class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b" style="border-color: var(--border-default);">
            <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-tertiary);">Label</th>
            <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-tertiary);">Prefix</th>
            <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style="color: var(--text-tertiary);">Last used</th>
            <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style="color: var(--text-tertiary);">Created</th>
            <th class="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-tertiary);">Status</th>
            <th class="px-5 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y" style="border-color: var(--border-default);">
          <tr v-for="key in tenantStore.apiKeys" :key="key.id" class="hover:bg-[var(--bg-hover)] transition-colors">
            <td class="px-5 py-3 font-medium" style="color: var(--text-primary);">{{ key.label || '—' }}</td>
            <td class="px-5 py-3">
              <code class="text-xs font-mono px-1.5 py-0.5 rounded" style="background: var(--bg-muted); color: var(--text-secondary);">{{ key.keyPrefix }}…</code>
            </td>
            <td class="px-5 py-3 hidden sm:table-cell" style="color: var(--text-secondary);">{{ formatDate(key.lastUsedAt) }}</td>
            <td class="px-5 py-3 hidden md:table-cell" style="color: var(--text-secondary);">{{ formatDate(key.createdAt) }}</td>
            <td class="px-5 py-3">
              <span :class="['badge', key.isActive ? 'badge-success' : 'badge-neutral']">{{ key.isActive ? 'Active' : 'Inactive' }}</span>
            </td>
            <td class="px-5 py-3">
              <AppButton variant="ghost" size="sm" @click="revokeTarget = key">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-red-500"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                Revoke
              </AppButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <AppModal :open="showCreateModal" title="Create API Key" size="sm" :closable="!creating" @close="showCreateModal = false">
    <form @submit.prevent="create" class="flex flex-col gap-4">
      <AppAlert v-if="errors['_global']" :message="errors['_global']" type="error" />
      <AppInput v-model="label" label="Label (optional)" placeholder="e.g. CI/CD key" :error="errors['label']" id="key-label" hint="A memorable name for this key" />
    </form>
    <template #footer>
      <AppButton variant="secondary" :disabled="creating" @click="showCreateModal = false">Cancel</AppButton>
      <AppButton :loading="creating" @click="create">Create Key</AppButton>
    </template>
  </AppModal>

  <AppModal :open="showKeyModal" title="API Key Created" size="md" :closable="false">
    <div class="flex flex-col gap-4">
      <div class="flex items-start gap-3 p-3 rounded-lg border border-amber-200" style="background: var(--color-warning-50);">
        <svg class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p class="text-sm text-amber-700 font-medium">Copy and save this key now. It will not be shown again.</p>
      </div>
      <div>
        <label class="text-xs font-semibold uppercase tracking-wider block mb-1.5" style="color: var(--text-tertiary);">Your API Key</label>
        <div class="flex items-center gap-2">
          <code
            class="flex-1 text-xs font-mono px-3 py-2.5 rounded-lg border break-all"
            style="background: var(--bg-muted); color: var(--text-primary); border-color: var(--border-default);"
          >{{ createdKey }}</code>
          <AppButton variant="secondary" size="sm" @click="copyKey" class="shrink-0">
            <svg v-if="!copied" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-green-500"><path d="M20 6L9 17l-5-5"/></svg>
            {{ copied ? 'Copied!' : 'Copy' }}
          </AppButton>
        </div>
      </div>
    </div>
    <template #footer>
      <AppButton @click="acknowledgeKey">I've saved my key</AppButton>
    </template>
  </AppModal>

  <ConfirmDialog
    :open="!!revokeTarget"
    title="Revoke API Key"
    :message="`Revoke '${revokeTarget?.label || revokeTarget?.keyPrefix}'? Any clients using this key will lose access immediately.`"
    confirm-label="Revoke"
    :loading="revoking"
    @confirm="confirmRevoke"
    @cancel="revokeTarget = null"
  />
</template>
