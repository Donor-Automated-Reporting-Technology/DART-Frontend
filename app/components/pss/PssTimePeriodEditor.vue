<!--
  PssTimePeriodEditor — list of time-period rows with add / remove (DART-47).

  Stateless presentational component:
    • Receives the current time-periods array via prop.
    • Emits granular events back to the parent composable.
    • Inline error text per row when the parent passes one.

  Mobile-first: each row is a vertical stack on narrow screens, inline on
  ≥640 px. Uses native <input type="time"> for OS-level wheel pickers.
-->
<template>
  <div class="period-editor">
    <div
      v-for="(period, index) in periods"
      :key="index"
      class="period-row"
      :class="{ 'period-row--invalid': errorFor(index) }"
    >
      <div class="period-row__head">
        <select
          :value="period.label"
          class="period-label"
          :aria-label="`Time period ${index + 1} label`"
          @change="onLabelChange(index, ($event.target as HTMLSelectElement).value)"
        >
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
        </select>
        <button
          v-if="periods.length > 1"
          type="button"
          class="period-remove"
          :aria-label="`Remove ${period.label} period`"
          @click="$emit('remove', index)"
        >
          <AppIcon name="x" :size="16" />
        </button>
      </div>

      <div class="period-row__times">
        <label class="time-field">
          <span class="time-field__label">Start</span>
          <input
            type="time"
            :value="period.startTime"
            class="time-input"
            @input="onTimeInput(index, 'startTime', ($event.target as HTMLInputElement).value)"
          >
        </label>
        <span class="time-sep" aria-hidden="true">→</span>
        <label class="time-field">
          <span class="time-field__label">End</span>
          <input
            type="time"
            :value="period.endTime"
            class="time-input"
            @input="onTimeInput(index, 'endTime', ($event.target as HTMLInputElement).value)"
          >
        </label>
      </div>

      <p v-if="errorFor(index)" class="period-error">
        {{ errorFor(index) }}
      </p>
    </div>

    <button
      type="button"
      class="period-add"
      @click="$emit('add')"
    >
      <AppIcon name="plus" :size="16" />
      <span>Add time period</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type {
  PssTimePeriod,
  PssTimePeriodLabel,
} from '~/interfaces/pssDb';

interface Props {
  periods: ReadonlyArray<PssTimePeriod>;
  /** Map of row index → error message (parent decides which rows are invalid). */
  errors?: Readonly<Record<number, string>>;
}

const props = withDefaults(defineProps<Props>(), {
  errors: () => ({}),
});

const emit = defineEmits<{
  add: [];
  remove: [index: number];
  update: [index: number, patch: Partial<PssTimePeriod>];
}>();

function errorFor(index: number): string | undefined {
  return props.errors[index];
}

function onLabelChange(index: number, value: string): void {
  if (value !== 'morning' && value !== 'afternoon') return;
  emit('update', index, { label: value as PssTimePeriodLabel });
}

function onTimeInput(
  index: number,
  field: 'startTime' | 'endTime',
  value: string,
): void {
  emit('update', index, { [field]: value } as Partial<PssTimePeriod>);
}
</script>

<style scoped>
.period-editor {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.period-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--surface-2, #1a1a2e);
  border: 1px solid var(--border, #2a2a3e);
  border-radius: 8px;
  transition: border-color 120ms ease;
}

.period-row--invalid {
  border-color: var(--danger, #ef4444);
}

.period-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.period-label {
  background: transparent;
  color: var(--text, #fff);
  font: inherit;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}

.period-label:focus-visible {
  outline: 2px solid var(--accent, #818cf8);
  outline-offset: 2px;
}

.period-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  color: var(--text-muted, #9ca3af);
  border-radius: 6px;
  cursor: pointer;
}

.period-remove:hover {
  background: var(--surface-3, #2a2a3e);
  color: var(--danger, #ef4444);
}

.period-row__times {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

.time-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.time-field__label {
  font-size: 0.75rem;
  color: var(--text-muted, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.time-input {
  background: var(--surface-1, #0f0f1a);
  color: var(--text, #fff);
  border: 1px solid var(--border, #2a2a3e);
  border-radius: 6px;
  padding: 0.5rem 0.625rem;
  font: inherit;
  font-size: 0.95rem;
  min-height: 40px;
}

.time-input:focus-visible {
  outline: 2px solid var(--accent, #818cf8);
  outline-offset: 1px;
  border-color: transparent;
}

.time-sep {
  color: var(--text-muted, #9ca3af);
  padding: 0 0.25rem 0.5rem;
}

.period-error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--danger, #ef4444);
}

.period-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: transparent;
  color: var(--accent, #818cf8);
  border: 1px dashed var(--accent, #818cf8);
  border-radius: 8px;
  padding: 0.625rem 0.75rem;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
}

.period-add:hover {
  background: rgba(129, 140, 248, 0.08);
}

@media (max-width: 480px) {
  .period-row__times {
    flex-direction: column;
    align-items: stretch;
  }

  .time-sep {
    display: none;
  }
}
</style>
