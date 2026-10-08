<template>
  <fieldset class="tiles" role="radiogroup" :aria-label="label" :aria-describedby="error ? errorId : undefined">
    <legend class="tiles__label">{{ label }}</legend>
    <div class="tiles__grid" :class="{ 'tiles__grid--wrap': options.length > 4 }">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="tile"
        :class="{
          'tile--selected': modelValue === opt.value,
          'tile--error': error,
        }"
        role="radio"
        :aria-checked="modelValue === opt.value"
        @click="$emit('update:modelValue', opt.value)"
      >
        <span class="tile__text">{{ opt.label }}</span>
      </button>
    </div>
    <FieldError :id="errorId" :message="error" class="tiles__error" />
  </fieldset>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import FieldError from '../interfaces/FieldError.vue'

export interface TileOption {
  value: string
  label: string
  icon?: string
}

defineProps<{
  modelValue: string
  label: string
  options: TileOption[]
  required?: boolean
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const errorId = `tiles-${useId()}-error`
</script>

<style scoped>
.tiles {
  border: none;
  padding: 0;
  margin: 0;
  min-width: 0;
}

.tiles__label {
  padding: 0;
  margin-bottom: 8px;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--text-primary);
}

.tiles__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.tiles__grid--wrap {
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
}

.tile {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  min-height: var(--field-h, 46px);
  background: var(--input-bg);
  border: 1px solid var(--input-border-hover);
  border-radius: var(--field-radius, 10px);
  color: var(--text-primary);
  cursor: pointer;
  font-family: inherit;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.tile:hover { border-color: var(--primary); }
.tile:focus-visible { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--field-ring); }
.tile--selected,
.tile--selected:hover { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
.tile--error:not(.tile--selected) { border-color: var(--error-text); }

.tile__text {
  font-size: 0.875rem;
  font-weight: 400;
  color: inherit;
  text-align: center;
  line-height: 1.3;
}

.tiles__error { margin-top: 8px; }

@media (max-width: 560px) {
  .tiles__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
