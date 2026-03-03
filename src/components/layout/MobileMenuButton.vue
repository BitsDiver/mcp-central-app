<script setup lang="ts">
  import { Menu, X } from 'lucide-vue-next';
  defineProps<{ open: boolean; }>();
  defineEmits<{ toggle: []; }>();
</script>

<template>
  <button @click="$emit('toggle')"
    class="w-9 h-9 flex items-center justify-center rounded-lg transition-colors lg:hidden"
    style="color: var(--text-secondary);" :class="'hover:bg-[var(--bg-hover)]'" aria-label="Toggle menu">
    <X v-if="open" :size="20" :stroke-width="2.5" />
    <Menu v-else :size="20" :stroke-width="2" />
  </button>
</template>
