<!--
  PssActiveDaysSelector — Mon–Sun toggle row (DART-47).

  Stateless: parent owns the active-days list.
  Mon–Fri default to ON in the parent composable; this component just
  reflects state and emits toggles. Sat/Sun render with a subtle "weekend"
  hint so facilitators see they're optional.
-->
<template>
  <div class="day-row" role="group" :aria-label="ariaLabel">
    <button
      v-for="day in options"
      :key="day.value"
      type="button"
      class="day-pill"
      :class="{
        'day-pill--active': isActive(day.value),
        'day-pill--weekend': day.value === 'sat' || day.value === 'sun',
      }"
      :aria-pressed="isActive(day.value)"
      :aria-label="day.long"
      @click="$emit('toggle', day.value)"
    >
      {{ day.short }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { PssDayOfWeek } from '~/interfaces/pssDb';

interface DayOption {
  value: PssDayOfWeek;
  short: string;
  long: string;
}

interface Props {
  options: ReadonlyArray<DayOption>;
  active: ReadonlyArray<PssDayOfWeek>;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  ariaLabel: 'Active days',
});

defineEmits<{
  toggle: [value: PssDayOfWeek];
}>();

function isActive(value: PssDayOfWeek): boolean {
  return props.active.includes(value);
}
</script>

<style scoped>
.day-row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.375rem;
}

.day-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-input);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.625rem 0;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.day-pill:hover {
  border-color: var(--text-muted);
  color: var(--text-secondary);
}

.day-pill--active {
  background: var(--bg-card-hover);
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

.day-pill--weekend:not(.day-pill--active) {
  opacity: 0.7;
  font-style: italic;
}

.day-pill:focus-visible {
  outline: 2px solid var(--text-muted);
  outline-offset: 2px;
}

@media (max-width: 360px) {
  .day-pill {
    font-size: 0.78rem;
    padding: 0.5rem 0;
  }
}
</style>
