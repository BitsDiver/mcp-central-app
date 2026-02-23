<script setup lang="ts">
import { ref, computed } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { MCP_REGISTRY, REGISTRY_CATEGORIES, type RegistryServer } from '@/data/mcpRegistry'
import { useEndpointStore } from '@/stores/endpoints'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [server: RegistryServer]
}>()

const endpointStore = useEndpointStore()
const search = ref('')
const activeCategory = ref('All')

const categories = REGISTRY_CATEGORIES

const isAdded = (server: RegistryServer) =>
  endpointStore.endpoints.some(
    (e) => e.namespace === server.namespace || e.name.toLowerCase() === server.name.toLowerCase()
  )

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return MCP_REGISTRY.filter((s) => {
    const matchesCategory = activeCategory.value === 'All' || s.category === activeCategory.value
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags?.some((t) => t.includes(q))
    return matchesCategory && matchesSearch
  })
})

function handleSelect(server: RegistryServer) {
  emit('select', server)
  emit('close')
}
</script>

<template>
  <AppModal :open="open" title="Browse MCP Registry" size="xl" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <input
        v-model="search"
        type="search"
        placeholder="Search servers…"
        class="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
        style="background: var(--bg-input); color: var(--text-primary); border-color: var(--border-default);"
      />

      <div class="flex gap-1.5 flex-wrap">
        <button
          v-for="cat in categories"
          :key="cat"
          @click="activeCategory = cat"
          :class="[
            'px-3 py-1 text-xs font-medium rounded-full transition-colors',
            activeCategory === cat
              ? 'bg-blue-500 text-white'
              : 'border text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          ]"
          style="border-color: var(--border-default);"
        >
          {{ cat }}
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
        <div
          v-for="server in filtered"
          :key="server.id"
          class="card p-4 flex gap-3 items-start transition-all"
          :class="isAdded(server) ? 'opacity-60' : 'card-hover cursor-pointer'"
          @click="!isAdded(server) && handleSelect(server)"
        >
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            :style="`background: ${server.color}`"
          >
            {{ server.iconLetters }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-sm font-semibold truncate" style="color: var(--text-primary);">{{ server.name }}</span>
              <span v-if="server.official" class="badge badge-primary text-[10px] px-1.5 py-0 shrink-0">Official</span>
            </div>
            <p class="text-xs leading-relaxed line-clamp-2" style="color: var(--text-secondary);">{{ server.description }}</p>
            <div class="flex items-center gap-2 mt-2">
              <span class="text-[10px] px-1.5 py-0.5 rounded font-mono" style="background: var(--bg-muted); color: var(--text-tertiary);">
                {{ server.transport }}
              </span>
              <span v-if="isAdded(server)" class="text-[10px] text-green-500 font-medium">Already added</span>
            </div>
          </div>
          <AppButton
            v-if="!isAdded(server)"
            size="sm"
            variant="secondary"
            class="shrink-0 mt-0.5"
            @click.stop="handleSelect(server)"
          >
            Add
          </AppButton>
        </div>

        <div v-if="filtered.length === 0" class="col-span-2 py-8 text-center">
          <p class="text-sm" style="color: var(--text-tertiary);">No servers match your search.</p>
        </div>
      </div>
    </div>

    <template #footer>
      <p class="text-xs mr-auto" style="color: var(--text-tertiary);">
        {{ filtered.length }} server{{ filtered.length !== 1 ? 's' : '' }} available
      </p>
      <router-link to="/registry" @click="emit('close')">
        <AppButton variant="secondary" size="sm">View full registry</AppButton>
      </router-link>
      <AppButton variant="secondary" @click="emit('close')">Close</AppButton>
    </template>
  </AppModal>
</template>
