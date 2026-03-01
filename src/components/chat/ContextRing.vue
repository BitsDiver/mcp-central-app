<script setup lang="ts">
    import { computed } from 'vue';

    const props = withDefaults(defineProps<{
        /** 0–1 ratio of context consumed */
        usage: number;
        /** Diameter in pixels */
        size?: number;
    }>(), {
        size: 16,
    });

    const radius = computed(() => (props.size - 3) / 2);
    const circumference = computed(() => 2 * Math.PI * radius.value);
    const offset = computed(() => circumference.value * (1 - Math.min(props.usage, 1)));

    const level = computed(() => {
        const u = props.usage;
        if (u >= 0.90) return 'full';
        if (u >= 0.80) return 'high';
        if (u >= 0.60) return 'mid';
        return 'low';
    });

    const pct = computed(() => Math.round(props.usage * 100));
</script>

<template>
    <svg class="context-ring" :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" :title="`Context: ${pct}%`">
        <!-- Background track -->
        <circle :cx="size / 2" :cy="size / 2" :r="radius" fill="none" stroke="var(--border-default)"
            stroke-width="1.5" />
        <!-- Fill arc -->
        <circle class="ring-fill" :data-level="level" :cx="size / 2" :cy="size / 2" :r="radius" fill="none"
            stroke-width="1.5" stroke-linecap="round" :stroke-dasharray="circumference" :stroke-dashoffset="offset"
            :style="{ transform: `rotate(-90deg)`, transformOrigin: '50% 50%' }" />
    </svg>
</template>

<style scoped>
    .context-ring {
        flex-shrink: 0;
        transition: opacity 0.2s ease;
    }

    .ring-fill {
        transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
    }

    .ring-fill[data-level='low'] {
        stroke: #22c55e;
    }

    .ring-fill[data-level='mid'] {
        stroke: #f59e0b;
    }

    .ring-fill[data-level='high'] {
        stroke: #f97316;
    }

    .ring-fill[data-level='full'] {
        stroke: #ef4444;
    }
</style>
