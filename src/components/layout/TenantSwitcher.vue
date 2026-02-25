<script setup lang="ts">
  import { ref, nextTick } from 'vue';
  import { onClickOutside } from '@vueuse/core';
  import { useTenantStore } from '@/stores/tenant';
  import { useSocketStore } from '@/stores/socket';
  import { useEndpointStore } from '@/stores/endpoints';
  import { useToolStore } from '@/stores/tools';
  import { useStatusStore } from '@/stores/status';
  import { useRouter } from 'vue-router';

  const tenantStore = useTenantStore();
  const socketStore = useSocketStore();
  const endpointStore = useEndpointStore();
  const toolStore = useToolStore();
  const statusStore = useStatusStore();
  const router = useRouter();

  const open = ref(false);
  const switching = ref(false);
  const containerRef = ref<HTMLElement | null>(null);

  // New tenant form
  const creatingTenant = ref(false);
  const newTenantName = ref('');
  const newTenantInput = ref<HTMLInputElement | null>(null);
  const isCreating = ref(false);

  onClickOutside(containerRef, () => {
    open.value = false;
    creatingTenant.value = false;
    newTenantName.value = '';
  });

  async function switchTenant(tenantId: string) {
    if (switching.value || tenantStore.selectedTenant?.id === tenantId) {
      open.value = false;
      return;
    }
    switching.value = true;
    try {
      const tenant = tenantStore.tenants.find((t) => t.id === tenantId);
      if (!tenant) return;
      tenantStore.setSelectedTenant(tenant);
      await socketStore.selectTenant(tenant.id);
      await tenantStore.loadKeys();
      if (tenantStore.apiKeys.length > 0) tenantStore.selectKey(tenantStore.apiKeys[0].id);
      endpointStore.clear();
      toolStore.clear();
      statusStore.clear();
      await Promise.all([endpointStore.load(), toolStore.load(), statusStore.load()]);
    } finally {
      switching.value = false;
      open.value = false;
    }
  }

  function openCreateForm() {
    creatingTenant.value = true;
    newTenantName.value = '';
    nextTick(() => newTenantInput.value?.focus());
  }

  async function submitCreateTenant() {
    const name = newTenantName.value.trim();
    if (!name || isCreating.value) return;
    isCreating.value = true;
    try {
      const { tenant } = await tenantStore.createTenant(name);
      await switchTenant(tenant.id);
      creatingTenant.value = false;
      newTenantName.value = '';
    } finally {
      isCreating.value = false;
    }
  }
</script>

<template>
  <div class="ts-root" ref="containerRef">
    <!-- Trigger button -->
    <button @click="open = !open" :disabled="switching" class="ts-trigger">
      <!-- Building icon -->
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        class="ts-trigger-icon">
        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
      <span v-if="tenantStore.selectedTenant" class="ts-trigger-name">{{ tenantStore.selectedTenant.name }}</span>
      <span v-else class="ts-trigger-placeholder">Select workspace…</span>
      <!-- Spinner while switching, chevron otherwise -->
      <svg v-if="switching" class="ts-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.5">
        <path
          d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
          stroke-linecap="round" />
      </svg>
      <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        class="ts-chevron" :class="{ 'ts-chevron--open': open }">
        <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div v-if="open" class="ts-dropdown">
        <!-- Header -->
        <div class="ts-dropdown-header">
          <span>Workspaces</span>
          <span class="ts-count">{{ tenantStore.tenants.length }}</span>
        </div>

        <!-- Tenant list -->
        <div class="ts-list">
          <button v-for="tenant in tenantStore.tenants" :key="tenant.id" @click="switchTenant(tenant.id)"
            :class="['ts-item', { 'ts-item--active': tenantStore.selectedTenant?.id === tenant.id }]">
            <!-- Monogram avatar -->
            <span class="ts-item-avatar"
              :class="{ 'ts-item-avatar--active': tenantStore.selectedTenant?.id === tenant.id }">
              {{ tenant.name.charAt(0).toUpperCase() }}
            </span>
            <span class="ts-item-name">{{ tenant.name }}</span>
            <svg v-if="tenantStore.selectedTenant?.id === tenant.id" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.5" class="ts-item-check">
              <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <p v-if="tenantStore.tenants.length === 0" class="ts-empty">No workspaces yet</p>
        </div>

        <!-- New tenant form / button -->
        <div class="ts-footer">
          <template v-if="!creatingTenant">
            <button type="button" class="ts-new-btn" @click="openCreateForm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 5v14M5 12h14" stroke-linecap="round" />
              </svg>
              New workspace
            </button>
          </template>
          <template v-else>
            <form class="ts-create-form" @submit.prevent="submitCreateTenant">
              <input ref="newTenantInput" v-model="newTenantName" type="text" placeholder="Workspace name…"
                class="ts-create-input" :disabled="isCreating" @keydown.esc="creatingTenant = false" />
              <button type="submit" class="ts-create-confirm" :disabled="!newTenantName.trim() || isCreating">
                <svg v-if="isCreating" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"
                    stroke-linecap="round" />
                </svg>
                <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2.5">
                  <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </form>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>

  /* ── Trigger ── */
  .ts-root {
    position: relative;
    display: inline-block;
  }

  .ts-trigger {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 8px;
    border-radius: 7px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    transition: background 0.12s;
    max-width: 260px;
  }

  .ts-trigger:hover {
    background: var(--bg-hover);
  }

  .ts-trigger:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .ts-trigger-icon {
    color: var(--text-tertiary);
    flex-shrink: 0;
  }

  .ts-trigger-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ts-trigger-placeholder {
    color: var(--text-tertiary);
  }

  .ts-chevron {
    color: var(--text-tertiary);
    flex-shrink: 0;
    transition: transform 0.15s;
  }

  .ts-chevron--open {
    transform: rotate(180deg);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .ts-spinner {
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
    color: var(--text-tertiary);
  }

  /* ── Dropdown ── */
  .ts-dropdown {
    position: absolute;
    left: 0;
    top: calc(100% + 6px);
    width: 240px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 10px;
    box-shadow: var(--shadow-dropdown);
    z-index: 50;
    overflow: hidden;
  }

  .ts-dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px 6px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-tertiary);
  }

  .ts-count {
    background: var(--bg-muted);
    border-radius: 999px;
    padding: 1px 6px;
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  /* ── Tenant items ── */
  .ts-list {
    padding: 2px 6px;
  }

  .ts-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 6px 8px;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 7px;
    font-size: 0.875rem;
    color: var(--text-primary);
    transition: background 0.1s;
    text-align: left;
  }

  .ts-item:hover {
    background: var(--bg-hover);
  }

  .ts-item--active {
    background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  }

  .ts-item-avatar {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    background: var(--bg-muted);
    color: var(--text-secondary);
    font-size: 0.7rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .ts-item-avatar--active {
    background: var(--color-primary);
    color: white;
  }

  .ts-item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ts-item-check {
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .ts-empty {
    padding: 8px;
    font-size: 0.8125rem;
    color: var(--text-tertiary);
    text-align: center;
  }

  /* ── Footer (new workspace) ── */
  .ts-footer {
    padding: 6px;
    border-top: 1px solid var(--border-default);
    margin-top: 2px;
  }

  .ts-new-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 8px;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 7px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-secondary);
    transition: background 0.1s, color 0.1s;
  }

  .ts-new-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  /* Inline create form */
  .ts-create-form {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .ts-create-input {
    flex: 1;
    padding: 5px 8px;
    font-size: 0.8125rem;
    border-radius: 6px;
    border: 1px solid var(--border-focus);
    background: var(--bg-input);
    color: var(--text-primary);
    outline: none;
    min-width: 0;
  }

  .ts-create-input:focus {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent);
  }

  .ts-create-confirm {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: none;
    background: var(--color-primary);
    color: white;
    cursor: pointer;
    transition: opacity 0.12s;
  }

  .ts-create-confirm:disabled {
    opacity: 0.45;
    cursor: default;
  }
</style>
