<script setup lang="ts">
    import { ref, computed, watch, nextTick, type Component } from 'vue';
    import { onClickOutside } from '@vueuse/core';
    import { ChevronDown, Search, Check } from 'lucide-vue-next';

    /* ── Types ─────────────────────────────────────────────────── */
    export interface ListboxOption {
        value: string;
        label: string;
        description?: string;
        icon?: string | Component;
        disabled?: boolean;
        group?: string;
    }

    export interface ListboxGroup {
        label: string;
        options: ListboxOption[];
    }

    /* ── Props / Emits ─────────────────────────────────────────── */
    const props = withDefaults(
        defineProps<{
            modelValue?: string;
            options: ListboxOption[];
            placeholder?: string;
            label?: string;
            error?: string;
            disabled?: boolean;
            required?: boolean;
            size?: 'sm' | 'md';
            placement?: 'bottom' | 'top';
            triggerIcon?: string | Component;
            searchable?: boolean;
            id?: string;
        }>(),
        { size: 'md', placement: 'bottom', placeholder: 'Select…' },
    );

    const emit = defineEmits<{
        'update:modelValue': [value: string];
    }>();

    /* ── Refs ──────────────────────────────────────────────────── */
    const open = ref(false);
    const search = ref('');
    const highlightedIndex = ref(-1);
    const containerRef = ref<HTMLElement | null>(null);
    const triggerRef = ref<HTMLElement | null>(null);
    const panelRef = ref<HTMLElement | null>(null);
    const listRef = ref<HTMLElement | null>(null);
    const searchInputRef = ref<HTMLInputElement | null>(null);

    // Close when clicking outside both the trigger area and the teleported panel
    onClickOutside(containerRef, (event) => {
        if (panelRef.value?.contains(event.target as Node)) return;
        close();
    });

    /* ── Panel positioning (fixed, escapes overflow) ────────── */
    const panelPos = ref<Record<string, string>>({});

    function updatePanelPosition() {
        const el = triggerRef.value;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (props.placement === 'top') {
            panelPos.value = {
                bottom: `${window.innerHeight - rect.top + 4}px`,
                left: `${rect.left}px`,
                minWidth: `${rect.width}px`,
            };
        } else {
            panelPos.value = {
                top: `${rect.bottom + 4}px`,
                left: `${rect.left}px`,
                minWidth: `${rect.width}px`,
            };
        }
    }

    /* ── Computed ──────────────────────────────────────────────── */
    const selectedOption = computed(() =>
        props.options.find((o) => o.value === props.modelValue),
    );

    /** Build ordered groups (preserving first-seen order of `group` field). */
    const groups = computed<ListboxGroup[]>(() => {
        const map = new Map<string, ListboxOption[]>();
        for (const opt of props.options) {
            const g = opt.group ?? '';
            if (!map.has(g)) map.set(g, []);
            map.get(g)!.push(opt);
        }
        return Array.from(map.entries()).map(([label, options]) => ({ label, options }));
    });

    /** Flat list of visible (filtered) options for keyboard nav. */
    const visibleOptions = computed<ListboxOption[]>(() => {
        const q = search.value.toLowerCase().trim();
        return props.options.filter(
            (o) =>
                !o.disabled &&
                (!q ||
                    o.label.toLowerCase().includes(q) ||
                    o.description?.toLowerCase().includes(q) ||
                    o.group?.toLowerCase().includes(q)),
        );
    });

    /** Filtered groups for rendering. */
    const filteredGroups = computed<ListboxGroup[]>(() => {
        const q = search.value.toLowerCase().trim();
        if (!q) return groups.value;
        return groups.value
            .map((g) => ({
                label: g.label,
                options: g.options.filter(
                    (o) =>
                        o.label.toLowerCase().includes(q) ||
                        o.description?.toLowerCase().includes(q),
                ),
            }))
            .filter((g) => g.options.length > 0);
    });

    /* ── Actions ───────────────────────────────────────────────── */
    function toggle() {
        if (props.disabled) return;
        open.value ? close() : openDropdown();
    }

    function openDropdown() {
        open.value = true;
        search.value = '';
        highlightedIndex.value = -1;
        updatePanelPosition();
        nextTick(() => {
            if (props.searchable) searchInputRef.value?.focus();
            scrollToSelected();
        });
    }

    function close() {
        open.value = false;
        search.value = '';
        highlightedIndex.value = -1;
    }

    function select(option: ListboxOption) {
        if (option.disabled) return;
        emit('update:modelValue', option.value);
        close();
    }

    function scrollToSelected() {
        nextTick(() => {
            const el = listRef.value?.querySelector('[data-selected="true"]');
            el?.scrollIntoView({ block: 'nearest' });
        });
    }

    /* ── Keyboard ──────────────────────────────────────────────── */
    function onKeydown(e: KeyboardEvent) {
        if (!open.value) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                openDropdown();
            }
            return;
        }

        const opts = visibleOptions.value;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                highlightedIndex.value = Math.min(highlightedIndex.value + 1, opts.length - 1);
                scrollHighlightedIntoView();
                break;
            case 'ArrowUp':
                e.preventDefault();
                highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
                scrollHighlightedIntoView();
                break;
            case 'Home':
                e.preventDefault();
                highlightedIndex.value = 0;
                scrollHighlightedIntoView();
                break;
            case 'End':
                e.preventDefault();
                highlightedIndex.value = opts.length - 1;
                scrollHighlightedIntoView();
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex.value >= 0 && highlightedIndex.value < opts.length) {
                    select(opts[highlightedIndex.value]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                close();
                break;
            case 'Tab':
                close();
                break;
        }
    }

    function scrollHighlightedIntoView() {
        nextTick(() => {
            const el = listRef.value?.querySelector('[data-highlighted="true"]');
            el?.scrollIntoView({ block: 'nearest' });
        });
    }

    /* Reset highlight when search changes */
    watch(search, () => {
        highlightedIndex.value = visibleOptions.value.length > 0 ? 0 : -1;
    });

    /* ── Helpers ───────────────────────────────────────────────── */
    function flatIndex(option: ListboxOption): number {
        return visibleOptions.value.findIndex((o) => o.value === option.value);
    }
</script>

<template>
    <div :class="['lb-root', `lb-root--${size}`]" ref="containerRef" @keydown="onKeydown">
        <!-- ── Label ─────────────────────────────────────────────── -->
        <label v-if="label" :for="id" class="lb-label">
            {{ label }}
            <span v-if="required" class="lb-required">*</span>
        </label>

        <!-- ── Trigger ───────────────────────────────────────────── -->
        <button ref="triggerRef" type="button" :id="id" :disabled="disabled"
            :class="['lb-trigger', { 'lb-trigger--open': open, 'lb-trigger--error': error }]"
            :title="selectedOption?.label ?? placeholder" @click="toggle" aria-haspopup="listbox" :aria-expanded="open">
            <!-- Leading icon -->
            <component v-if="triggerIcon && typeof triggerIcon !== 'string'" :is="triggerIcon"
                class="lb-trigger-icon" />
            <span v-else-if="typeof triggerIcon === 'string'" class="lb-trigger-icon" v-html="triggerIcon" />

            <!-- Selected option icon (only in sm) -->
            <template v-if="size === 'sm' && selectedOption?.icon">
                <component v-if="typeof selectedOption.icon !== 'string'" :is="selectedOption.icon"
                    class="lb-option-icon" />
                <span v-else class="lb-option-icon" v-html="selectedOption.icon" />
            </template>

            <span v-if="selectedOption" class="lb-trigger-text">{{ selectedOption.label }}</span>
            <span v-else class="lb-trigger-placeholder">{{ placeholder }}</span>

            <!-- Chevron -->
            <ChevronDown class="lb-chevron" :class="{ 'lb-chevron--open': open }" :size="13" :stroke-width="2.5" />
        </button>

        <!-- ── Dropdown panel (teleported to body to escape overflow) ── -->
        <Teleport to="body">
            <Transition name="dropdown">
                <div v-if="open" ref="panelRef" :class="['lb-panel', `lb-panel--${size}`]" role="listbox"
                    :style="panelPos">
                    <!-- Search input -->
                    <div v-if="searchable" class="lb-search-wrap">
                        <Search class="lb-search-icon" :size="13" :stroke-width="2" />
                        <input ref="searchInputRef" v-model="search" type="text" class="lb-search" placeholder="Search…"
                            @keydown.stop="onKeydown" />
                    </div>

                    <!-- Options list -->
                    <div ref="listRef" class="lb-list">
                        <template v-for="group in filteredGroups" :key="group.label">
                            <!-- Group header -->
                            <div v-if="group.label" class="lb-group-header">
                                <span>{{ group.label }}</span>
                                <span class="lb-group-count">{{ group.options.length }}</span>
                            </div>

                            <!-- Options -->
                            <button v-for="option in group.options" :key="option.value" type="button" :class="[
                                'lb-option',
                                {
                                    'lb-option--selected': option.value === modelValue,
                                    'lb-option--highlighted': flatIndex(option) === highlightedIndex,
                                    'lb-option--disabled': option.disabled,
                                },
                            ]" :data-selected="option.value === modelValue || undefined"
                                :data-highlighted="flatIndex(option) === highlightedIndex || undefined"
                                :disabled="option.disabled" role="option" :aria-selected="option.value === modelValue"
                                @click="select(option)" @mouseenter="highlightedIndex = flatIndex(option)">
                                <!-- Option icon -->
                                <template v-if="option.icon">
                                    <component v-if="typeof option.icon !== 'string'" :is="option.icon"
                                        class="lb-option-icon" />
                                    <span v-else class="lb-option-icon" v-html="option.icon" />
                                </template>

                                <!-- Label + description -->
                                <span class="lb-option-body">
                                    <span class="lb-option-label">{{ option.label }}</span>
                                    <span v-if="option.description" class="lb-option-desc">{{ option.description
                                    }}</span>
                                </span>

                                <!-- Check mark -->
                                <Check v-if="option.value === modelValue" class="lb-option-check" :size="14"
                                    :stroke-width="2.5" />
                            </button>
                        </template>

                        <!-- Empty state -->
                        <p v-if="filteredGroups.length === 0 || filteredGroups.every(g => g.options.length === 0)"
                            class="lb-empty">
                            {{ search ? 'No matches' : 'No options' }}
                        </p>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- ── Error ─────────────────────────────────────────────── -->
        <p v-if="error" class="lb-error">{{ error }}</p>
    </div>
</template>

<style scoped>

    /* ── Root ──────────────────────────────────────────────────── */
    .lb-root {
        position: relative;
    }

    .lb-root--md {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .lb-root--sm {
        display: inline-block;
    }

    /* ── Label ─────────────────────────────────────────────────── */
    .lb-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-primary);
    }

    .lb-required {
        color: #ef4444;
        margin-left: 2px;
    }

    /* ── Trigger (md — full-width form field) ──────────────────── */
    .lb-root--md .lb-trigger {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid var(--border-default);
        background: var(--bg-input);
        color: var(--text-primary);
        font-size: 0.875rem;
        cursor: pointer;
        transition: border-color 0.15s, box-shadow 0.15s;
        text-align: left;
    }

    .lb-root--md .lb-trigger:hover:not(:disabled) {
        border-color: var(--border-strong);
    }

    .lb-root--md .lb-trigger--open,
    .lb-root--md .lb-trigger:focus-visible {
        border-color: var(--border-focus);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent);
        outline: none;
    }

    .lb-root--md .lb-trigger--error {
        border-color: #ef4444;
    }

    .lb-root--md .lb-trigger:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* ── Trigger (sm — compact inline) ─────────────────────────── */
    .lb-root--sm .lb-trigger {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 4px;
        border: none;
        border-radius: 5px;
        background: none;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        color: var(--text-tertiary);
        transition: color 0.12s, background 0.12s;
        min-width: 0;
        max-width: 200px;
    }

    .lb-root--sm .lb-trigger:hover {
        color: var(--text-secondary);
        background: var(--bg-hover);
    }

    .lb-root--sm .lb-trigger--open {
        color: var(--text-primary);
        background: var(--bg-hover);
    }

    .lb-root--sm .lb-trigger:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 1px;
    }

    /* ── Trigger internals ─────────────────────────────────────── */
    .lb-trigger-icon {
        flex-shrink: 0;
        color: var(--text-tertiary);
        display: inline-flex;
        align-items: center;
    }

    .lb-trigger-icon :deep(svg) {
        width: 14px;
        height: 14px;
    }

    .lb-root--sm .lb-trigger-icon :deep(svg) {
        width: 10px;
        height: 10px;
    }

    .lb-trigger-text {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
    }

    .lb-trigger-placeholder {
        flex: 1;
        color: var(--text-tertiary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .lb-chevron {
        flex-shrink: 0;
        color: var(--text-tertiary);
        transition: transform 0.15s;
    }

    .lb-root--sm .lb-chevron {
        width: 10px;
        height: 10px;
    }

    .lb-chevron--open {
        transform: rotate(180deg);
    }

    /* ── Dropdown panel (teleported to body, uses fixed positioning) ── */
    .lb-panel {
        position: fixed;
        width: max-content;
        max-width: 360px;
        background: var(--bg-surface);
        border: 1px solid var(--border-default);
        border-radius: 10px;
        box-shadow: var(--shadow-dropdown);
        z-index: 9999;
        overflow: hidden;
    }

    .lb-panel--sm {
        min-width: 200px;
    }

    /* ── Search ────────────────────────────────────────────────── */
    .lb-search-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-bottom: 1px solid var(--border-default);
    }

    .lb-search-icon {
        flex-shrink: 0;
        color: var(--text-tertiary);
    }

    .lb-search {
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        color: var(--text-primary);
        font-size: 0.8125rem;
        font-family: var(--font-sans);
        min-width: 0;
    }

    .lb-search::placeholder {
        color: var(--text-tertiary);
    }

    /* ── List ──────────────────────────────────────────────────── */
    .lb-list {
        padding: 4px;
        max-height: 260px;
        overflow-y: auto;
    }

    /* ── Group header ──────────────────────────────────────────── */
    .lb-group-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-tertiary);
        user-select: none;
    }

    .lb-group-count {
        background: var(--bg-muted);
        border-radius: 999px;
        padding: 0 5px;
        font-size: 0.65rem;
        color: var(--text-secondary);
    }

    /* ── Option ────────────────────────────────────────────────── */
    .lb-option {
        width: 100%;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 6px 8px;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 7px;
        font-size: 0.875rem;
        color: var(--text-primary);
        transition: background 0.08s;
        text-align: left;
    }

    .lb-option:hover,
    .lb-option--highlighted {
        background: var(--bg-hover);
    }

    .lb-option--selected {
        background: color-mix(in srgb, var(--color-primary) 8%, transparent);
    }

    .lb-option--selected.lb-option--highlighted {
        background: color-mix(in srgb, var(--color-primary) 14%, transparent);
    }

    .lb-option--disabled {
        opacity: 0.45;
        cursor: default;
    }

    /* ── Option icon ───────────────────────────────────────────── */
    .lb-option-icon {
        flex-shrink: 0;
        color: var(--text-secondary);
        display: inline-flex;
        align-items: center;
        margin-top: 1px;
    }

    .lb-option-icon :deep(svg) {
        width: 16px;
        height: 16px;
    }

    .lb-root--sm .lb-option-icon :deep(svg) {
        width: 12px;
        height: 12px;
    }

    /* ── Option body (label + description) ─────────────────────── */
    .lb-option-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
    }

    .lb-option-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .lb-option-desc {
        font-size: 0.75rem;
        color: var(--text-tertiary);
        line-height: 1.3;
    }

    /* ── Check mark ────────────────────────────────────────────── */
    .lb-option-check {
        flex-shrink: 0;
        color: var(--color-primary);
        margin-top: 2px;
    }

    /* ── Empty state ───────────────────────────────────────────── */
    .lb-empty {
        padding: 12px;
        text-align: center;
        font-size: 0.8125rem;
        color: var(--text-tertiary);
        margin: 0;
    }

    /* ── Error ─────────────────────────────────────────────────── */
    .lb-error {
        font-size: 0.75rem;
        color: #ef4444;
        margin: 0;
    }
</style>
