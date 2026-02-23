<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ChatSession } from '@/types'

const props = defineProps<{
  sessions: ChatSession[]
  activeId: string | null
  activeTenantId?: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  delete: [id: string]
  new: []
}>()

const search = ref('')
const confirmDeleteId = ref<string | null>(null)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return props.sessions
  return props.sessions.filter((s) => s.title.toLowerCase().includes(q))
})

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

function confirmDelete(id: string, e: MouseEvent) {
  e.stopPropagation()
  confirmDeleteId.value = id
}

function doDelete(id: string) {
  emit('delete', id)
  confirmDeleteId.value = null
}
</script>

<template>
  <div class="session-list">
    <div class="session-list-header">
      <button type="button" class="new-chat-btn" @click="emit('new')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
        </svg>
        New chat
      </button>
    </div>

    <div class="session-search-wrapper">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/>
      </svg>
      <input
        v-model="search"
        type="text"
        placeholder="Search..."
        class="session-search"
      />
    </div>

    <div class="session-items">
      <div v-if="filtered.length === 0" class="session-empty">
        <p>{{ search ? 'No results' : 'No conversations yet' }}</p>
      </div>

      <div
        v-for="session in filtered"
        :key="session.id"
        :class="['session-item', { active: session.id === activeId }]"
        @click="emit('select', session.id)"
      >
        <div class="session-item-content">
          <p class="session-title">{{ session.title }}</p>
          <div class="session-meta">
            <span class="session-time">{{ relativeTime(session.updatedAt) }}</span>
            <span v-if="session.tenantId && session.tenantId === activeTenantId" class="tenant-dot" title="Linked to current tenant" />
          </div>
        </div>

        <template v-if="confirmDeleteId === session.id">
          <div class="delete-confirm" @click.stop>
            <button type="button" class="confirm-yes" @click.stop="doDelete(session.id)">Delete</button>
            <button type="button" class="confirm-no" @click.stop="confirmDeleteId = null">Cancel</button>
          </div>
        </template>
        <template v-else>
          <button
            type="button"
            class="delete-btn"
            @click="confirmDelete(session.id, $event)"
            title="Delete conversation"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.session-list-header {
  padding: 12px 12px 8px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
}

.new-chat-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}

.session-search-wrapper {
  position: relative;
  padding: 8px 12px;
  flex-shrink: 0;
}

.search-icon {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.session-search {
  width: 100%;
  padding: 6px 8px 6px 28px;
  font-size: 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-input);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s ease;
}

.session-search:focus {
  border-color: var(--border-focus);
}

.session-search::placeholder {
  color: var(--text-tertiary);
}

.session-items {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 8px;
}

.session-empty {
  padding: 24px 8px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.12s ease;
  margin-bottom: 1px;
}

.session-item:hover {
  background: var(--bg-hover);
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.session-item.active {
  background: var(--bg-active);
}

.session-item-content {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 2px;
}

.session-item.active .session-title {
  color: var(--text-on-active);
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.session-time {
  font-size: 10px;
  color: var(--text-tertiary);
}

.tenant-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary-400);
  flex-shrink: 0;
}

.delete-btn {
  opacity: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: all 0.12s ease;
}

.delete-btn:hover {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
}

[data-theme="dark"] .delete-btn:hover {
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-danger-500);
}

.delete-confirm {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.confirm-yes, .confirm-no {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  transition: all 0.1s ease;
}

.confirm-yes {
  background: var(--color-danger-500);
  color: white;
}

.confirm-yes:hover {
  background: var(--color-danger-600);
}

.confirm-no {
  background: var(--bg-muted);
  color: var(--text-secondary);
}

.confirm-no:hover {
  background: var(--bg-hover);
}
</style>
