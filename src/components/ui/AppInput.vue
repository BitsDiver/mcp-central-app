<script setup lang="ts">
defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  type?: string
  disabled?: boolean
  required?: boolean
  id?: string
  readonly?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="id" class="text-sm font-medium" style="color: var(--text-primary)">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-0.5">*</span>
    </label>
    <input
      :id="id"
      :type="type ?? 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :class="[
        'w-full px-3 py-2 text-sm rounded-lg border transition-colors duration-150 outline-none',
        'bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
        error
          ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
          : 'border-[var(--border-default)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-blue-500/20',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        readonly ? 'cursor-default font-mono text-xs' : '',
      ]"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
    <p v-else-if="hint" class="text-xs" style="color: var(--text-tertiary)">{{ hint }}</p>
  </div>
</template>
