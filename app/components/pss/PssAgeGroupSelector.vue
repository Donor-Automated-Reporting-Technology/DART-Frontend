<!--
  PssAgeGroupSelector — chip multi-select for schedule age groups (DART-47).

  Stateless: parent owns the selected list; we emit `toggle` per chip.
  Touch targets ≥44 px on mobile.
-->
<template>
  <div class="chip-group" role="group" :aria-label="ariaLabel">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="chip"
      :class="{ 'chip--active': isSelected(opt.value) }"
      :aria-pressed="isSelected(opt.value)"
      @click="$emit('toggle', opt.value)"
    >
      <AppIcon
        v-if="isSelected(opt.value)"
        name="check"
        :size="14"
        class="chip__check"
      />
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { PssScheduleAgeGroup } from '~/interfaces/pssDb';

interface AgeGroupOption {
  value: PssScheduleAgeGroup;
  label: string;
}

interface Props {
  options: ReadonlyArray<AgeGroupOption>;
  selected: ReadonlyArray<PssScheduleAgeGroup>;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  ariaLabel: 'Age groups',
});

defineEmits<{
  toggle: [value: PssScheduleAgeGroup];
}>();

function isSelected(value: PssScheduleAgeGroup): boolean {
  return props.selected.includes(value);
}
</script>

<style scoped>
.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 0.5rem 0.875rem;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 40px;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.chip:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.chip--active {
  background: var(--bg-card-hover);
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

.chip:focus-visible {
  outline: 2px solid var(--text-muted);
  outline-offset: 2px;
}

.chip__check {
  flex-shrink: 0;
}
</style>
