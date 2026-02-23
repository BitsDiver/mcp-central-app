<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <label class="inline-flex items-center gap-2.5 cursor-pointer select-none" :class="{ 'opacity-50 cursor-not-allowed': disabled }">
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      @click="!disabled && $emit('update:modelValue', !modelValue)"
      :class="[
        'relative w-10 h-6 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
        modelValue ? 'bg-blue-500' : 'bg-[var(--border-strong)]',
      ]"
    >
      <span
        :class="[
          'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
          modelValue ? 'translate-x-4' : 'translate-x-0',
        ]"
      />
    </button>
    <span v-if="label" class="text-sm font-medium" style="color: var(--text-primary)">{{ label }}</span>
  </label>
</template>
