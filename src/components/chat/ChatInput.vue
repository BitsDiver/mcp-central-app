<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ChatAttachment } from '@/types'

const props = defineProps<{
  disabled?: boolean
  isGenerating?: boolean
}>()

const emit = defineEmits<{
  send: [content: string, attachments: ChatAttachment[]]
  stop: []
}>()

const text = ref('')
const attachments = ref<ChatAttachment[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const textarea = ref<HTMLTextAreaElement | null>(null)

const canSend = computed(() => (text.value.trim().length > 0 || attachments.value.length > 0) && !props.disabled)

function autoResize() {
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (props.isGenerating) {
      emit('stop')
    } else if (canSend.value) {
      sendMessage()
    }
  }
}

function sendMessage() {
  const content = text.value.trim()
  if (!content && attachments.value.length === 0) return
  emit('send', content, [...attachments.value])
  text.value = ''
  attachments.value = []
  if (textarea.value) {
    textarea.value.style.height = 'auto'
  }
}

function openFilePicker() {
  fileInput.value?.click()
}

async function handleFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return

  for (const file of Array.from(files)) {
    const base64 = await toBase64(file)
    attachments.value.push({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      type: file.type,
      base64,
      size: file.size,
    })
  }

  if (fileInput.value) fileInput.value.value = ''
}

function removeAttachment(id: string) {
  attachments.value = attachments.value.filter((a) => a.id !== id)
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
</script>

<template>
  <div class="chat-input-wrapper">
    <div v-if="attachments.length > 0" class="attachment-preview">
      <div v-for="att in attachments" :key="att.id" class="preview-item">
        <img v-if="att.type.startsWith('image/')" :src="att.base64" :alt="att.name" class="preview-image" />
        <div v-else class="preview-file">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="14 2 14 8 20 8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="preview-filename">{{ att.name }}</span>
          <span class="preview-size">{{ formatSize(att.size) }}</span>
        </div>
        <button type="button" class="preview-remove" @click="removeAttachment(att.id)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="input-row">
      <button type="button" class="icon-btn" @click="openFilePicker" title="Attach file">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <textarea
        ref="textarea"
        v-model="text"
        :disabled="disabled"
        placeholder="Message... (Enter to send, Shift+Enter for new line)"
        class="message-textarea"
        rows="1"
        @keydown="handleKeydown"
        @input="autoResize"
      />

      <button
        type="button"
        :class="['send-btn', isGenerating ? 'send-stop' : canSend ? 'send-active' : 'send-idle']"
        @click="isGenerating ? emit('stop') : sendMessage()"
        :title="isGenerating ? 'Stop generation' : 'Send message'"
      >
        <svg v-if="isGenerating" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*,.pdf,.txt,.md,.json,.csv,.ts,.js,.py,.html,.css"
      class="hidden"
      @change="handleFiles"
    />
  </div>
</template>

<style scoped>
.chat-input-wrapper {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  background: var(--bg-surface);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  padding: 4px 4px 4px 8px;
}

.chat-input-wrapper:focus-within {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.attachment-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 8px 4px;
}

.preview-item {
  position: relative;
  display: inline-flex;
}

.preview-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
}

.preview-file {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--bg-muted);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  color: var(--text-secondary);
}

.preview-filename {
  font-size: 11px;
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

.preview-size {
  font-size: 10px;
  color: var(--text-tertiary);
}

.preview-remove {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-neutral-600);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.1s ease;
}

.preview-remove:hover {
  background: var(--color-danger-500);
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: color 0.12s ease, background-color 0.12s ease;
  margin-bottom: 2px;
}

.icon-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.message-textarea {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  padding: 8px 6px;
  min-height: 38px;
  max-height: 200px;
  overflow-y: auto;
}

.message-textarea::placeholder {
  color: var(--text-tertiary);
}

.message-textarea:disabled {
  opacity: 0.5;
}

.send-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
  margin-bottom: 2px;
}

.send-active {
  background: var(--color-primary-500);
  color: white;
}

.send-active:hover {
  background: var(--color-primary-600);
}

.send-stop {
  background: var(--color-danger-500);
  color: white;
}

.send-stop:hover {
  background: var(--color-danger-600);
}

.send-idle {
  background: var(--bg-muted);
  color: var(--text-tertiary);
  cursor: default;
}

.hidden {
  display: none;
}
</style>
