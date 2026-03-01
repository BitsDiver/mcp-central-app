<script setup lang="ts">
  import { ref, computed } from 'vue';
  import ContextRing from '@/components/chat/ContextRing.vue';
  import ContextDetailPopover from '@/components/chat/ContextDetailPopover.vue';
  import ModelSelector from '@/components/chat/ModelSelector.vue';
  import ChatModeSelector from '@/components/chat/ChatModeSelector.vue';
  import { useChatSettingsStore } from '@/stores/chatSettings';
  import type { ChatAttachment, ChatMode } from '@/types';

  const settingsStore = useChatSettingsStore();
  const currentMode = computed(() => settingsStore.settings.chatMode ?? 'agent');

  const props = defineProps<{
    disabled?: boolean;
    isGenerating?: boolean;
    /** 0–1 ratio of context window consumed */
    contextUsage?: number;
    contextTokens?: number;
    contextSize?: number;
    toolCount?: number;
  }>();

  const emit = defineEmits<{
    send: [content: string, attachments: ChatAttachment[], mode: ChatMode];
    stop: [];
  }>();

  const text = ref('');
  const attachments = ref<ChatAttachment[]>([]);
  const fileInput = ref<HTMLInputElement | null>(null);
  const textarea = ref<HTMLTextAreaElement | null>(null);

  const canSend = computed(() => (text.value.trim().length > 0 || attachments.value.length > 0) && !props.disabled);
  const showContextDetail = ref(false);

  const effectiveUsage = computed(() => props.contextUsage ?? 0);

  /** Auto-grow to max 12 lines (~252 px at 1.5 line-height * 14px) */
  function autoResize() {
    const el = textarea.value;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 252)}px`;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (props.isGenerating) {
        emit('stop');
      } else if (canSend.value) {
        sendMessage();
      }
    }
  }

  function sendMessage() {
    const content = text.value.trim();
    if (!content && attachments.value.length === 0) return;
    emit('send', content, [...attachments.value], currentMode.value);
    text.value = '';
    attachments.value = [];
    if (textarea.value) {
      textarea.value.style.height = 'auto';
    }
  }

  function openFilePicker() {
    fileInput.value?.click();
  }

  async function handleFiles(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const base64 = await toBase64(file);
      attachments.value.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        type: file.type,
        base64,
        size: file.size,
      });
    }

    if (fileInput.value) fileInput.value.value = '';
  }

  function removeAttachment(id: string) {
    attachments.value = attachments.value.filter((a) => a.id !== id);
  }

  function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
</script>

<template>
  <div class="chat-input-wrapper">
    <!-- ── Header: attach (left) + context ring (right) ── -->
    <div class="input-header">
      <button type="button" class="icon-btn" @click="openFilePicker" title="Attach file">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <path
            d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
            stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <button v-if="contextSize" type="button" class="context-ring-btn" title="Context window details"
        @click="showContextDetail = !showContextDetail">
        <ContextRing :usage="effectiveUsage" :size="18" />
      </button>
    </div>

    <!-- ── Context detail popover ──────────────────────── -->
    <ContextDetailPopover v-if="showContextDetail" :used-tokens="contextTokens ?? 0" :context-size="contextSize ?? 0"
      :usage="effectiveUsage" @close="showContextDetail = false" />

    <!-- ── Attachment previews ─────────────────────────── -->
    <div v-if="attachments.length > 0" class="attachment-preview">
      <div v-for="att in attachments" :key="att.id" class="preview-item">
        <img v-if="att.type.startsWith('image/')" :src="att.base64" :alt="att.name" class="preview-image" />
        <div v-else class="preview-file">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-linecap="round"
              stroke-linejoin="round" />
            <polyline points="14 2 14 8 20 8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="preview-filename">{{ att.name }}</span>
          <span class="preview-size">{{ formatSize(att.size) }}</span>
        </div>
        <button type="button" class="preview-remove" @click="removeAttachment(att.id)">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Textarea ────────────────────────────────────── -->
    <textarea ref="textarea" v-model="text" :disabled="disabled"
      placeholder="Message… (Enter to send, Shift+Enter for new line)" class="message-textarea" rows="1"
      @keydown="handleKeydown" @input="autoResize" />

    <!-- ── Footer: model selector + tools (left) + send (right) ── -->
    <div class="input-footer">
      <div class="footer-left">
        <ChatModeSelector />
        <span class="footer-sep" aria-hidden="true" />
        <ModelSelector />
        <span v-if="toolCount" class="tool-badge" :title="`${toolCount} tool${toolCount !== 1 ? 's' : ''} available`">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
              stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="tool-count">{{ toolCount }}</span>
        </span>
      </div>
      <div class="footer-right">
        <button type="button" :class="['icon-btn', 'send-icon', { 'send-active': canSend, 'send-stop': isGenerating }]"
          @click="isGenerating ? emit('stop') : sendMessage()" :disabled="!isGenerating && !canSend"
          :title="isGenerating ? 'Stop generation (Enter)' : 'Send message (Enter)'">
          <svg v-if="isGenerating" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>

    <input ref="fileInput" type="file" multiple accept="image/*,.pdf,.txt,.md,.json,.csv,.ts,.js,.py,.html,.css"
      class="hidden" @change="handleFiles" />
  </div>
</template>

<style scoped>
  .chat-input-wrapper {
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    background: var(--bg-surface);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    overflow: hidden;
  }

  .chat-input-wrapper:focus-within {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* ── Header ────────────────────────────────────────── */
  .input-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px 0;
  }

  .context-ring-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: background-color 0.12s ease;
  }

  .context-ring-btn:hover {
    background: var(--bg-hover);
  }

  /* ── Shared icon button ────────────────────────────── */
  .icon-btn {
    width: 28px;
    height: 28px;
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
  }

  .icon-btn:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .icon-btn:disabled {
    opacity: 0.35;
    cursor: default;
    pointer-events: none;
  }

  /* ── Send icon variants ────────────────────────────── */
  .send-icon.send-active {
    color: var(--color-primary-500);
  }

  .send-icon.send-active:hover {
    color: var(--color-primary-600);
    background: color-mix(in srgb, var(--color-primary-500) 10%, transparent);
  }

  .send-icon.send-stop {
    color: var(--color-danger-500);
  }

  .send-icon.send-stop:hover {
    color: var(--color-danger-600);
    background: color-mix(in srgb, var(--color-danger-500) 10%, transparent);
  }

  /* ── Attachments ───────────────────────────────────── */
  .attachment-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 12px 0;
  }

  .preview-item {
    position: relative;
    display: inline-flex;
  }

  .preview-image {
    width: 52px;
    height: 52px;
    object-fit: cover;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
  }

  .preview-file {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--bg-muted);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    padding: 5px 7px;
    color: var(--text-secondary);
  }

  .preview-filename {
    font-size: 11px;
    font-weight: 500;
    max-width: 90px;
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
    top: -4px;
    right: -4px;
    width: 15px;
    height: 15px;
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

  /* ── Textarea ──────────────────────────────────────── */
  .message-textarea {
    display: block;
    width: 100%;
    resize: none;
    border: none;
    outline: none;
    background: transparent;
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-primary);
    padding: 8px 14px;
    min-height: 38px;
    max-height: 252px;
    overflow-y: auto;
    box-sizing: border-box;
  }

  .message-textarea::placeholder {
    color: var(--text-tertiary);
  }

  .message-textarea:disabled {
    opacity: 0.5;
  }

  /* ── Footer ────────────────────────────────────────── */
  .input-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 6px 6px 10px;
  }

  .footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .footer-sep {
    width: 1px;
    height: 12px;
    background: var(--border-default);
    flex-shrink: 0;
    opacity: 0.7;
  }

  .tool-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
    cursor: default;
    white-space: nowrap;
  }

  .tool-badge svg {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .tool-count {
    font-variant-numeric: tabular-nums;
  }

  .footer-right {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .hidden {
    display: none;
  }
</style>
