<script setup lang="ts">
defineProps<{
  modelValue?: string
  label?: string
  options: { value: string; label: string }[]
  error?: string
  disabled?: boolean
  required?: boolean
  id?: string
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
    <select
      :id="id"
      :value="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      :class="[
        'w-full px-3 py-2 text-sm rounded-lg border transition-colors duration-150 outline-none appearance-none cursor-pointer',
        'bg-[var(--bg-input)] text-[var(--text-primary)]',
        error
          ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
          : 'border-[var(--border-default)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-blue-500/20',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ]"
    >
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
