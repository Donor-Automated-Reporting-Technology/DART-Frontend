<script setup lang="ts">
/**
 * PssLoadingSkeleton — neutral shimmer placeholder for loading states.
 *
 * Jira: DART-62.
 *
 * Shape variants cover the three layouts used across PSS pages:
 *   - card  — single rounded block, used for hero / detail panels
 *   - list  — N stacked rows, used for activity / schedule lists
 *   - text  — N inline lines, used inside cards for paragraphs
 *
 * Defaults are tuned for the mobile-first PSS pages — set `rows` to
 * override. The shimmer animation is pure Tailwind / CSS so it costs
 * nothing in JS and respects `prefers-reduced-motion`.
 */
type Variant = 'card' | 'list' | 'text';

interface Props {
  variant?: Variant;
  rows?: number;
  /** Optional accessible label announced to screen readers. */
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'card',
  rows: 3,
  label: 'Loading',
});
</script>

<template>
  <div role="status" :aria-label="props.label" class="animate-pulse">
    <span class="sr-only">{{ props.label }}</span>

    <div v-if="props.variant === 'card'" class="space-y-3">
      <div class="h-6 w-1/3 rounded-md bg-white/10" />
      <div class="h-32 w-full rounded-xl bg-white/10" />
      <div class="h-4 w-2/3 rounded-md bg-white/10" />
    </div>

    <div v-else-if="props.variant === 'list'" class="space-y-2">
      <div
        v-for="i in props.rows"
        :key="i"
        class="flex items-center gap-3 rounded-lg bg-white/5 p-3"
      >
        <div class="h-10 w-10 shrink-0 rounded-full bg-white/10" />
        <div class="flex-1 space-y-2">
          <div class="h-3 w-2/3 rounded bg-white/10" />
          <div class="h-2 w-1/3 rounded bg-white/10" />
        </div>
      </div>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="i in props.rows"
        :key="i"
        :class="[
          'h-3 rounded bg-white/10',
          i === props.rows ? 'w-2/3' : 'w-full',
        ]"
      />
    </div>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .animate-pulse {
    animation: none;
  }
}
</style>
