<template>
  <fieldset class="tiles" role="radiogroup" :aria-label="label">
    <legend class="tiles__label">{{ label }} <span v-if="required" class="tiles__req">*</span></legend>
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
    <Transition name="tile-err">
      <span v-if="error" class="tiles__error">{{ error }}</span>
    </Transition>
  </fieldset>
</template>

<script setup lang="ts">
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
</script>

<style scoped>
.tiles {
  border: none;
  padding: 0;
  margin: 0;
}

.tiles__label {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6E6E73;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tiles__req {
  color: var(--error);
  font-weight: 500;
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  min-height: 44px;
  background: var(--tile-bg, #F5F5F7);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s ease, color 0.2s ease;
}

.tile:hover {
  background: var(--tile-hover-bg, #EBEBED);
}

.tile--selected {
  background: var(--primary);
  color: #fff;
}

.tile--selected:hover {
  background: var(--primary);
  opacity: 0.92;
}

.tile--error {
  box-shadow: inset 0 0 0 1px var(--error);
}

.tile__text {
  font-size: 0.82rem;
  font-weight: 500;
  color: inherit;
  text-align: center;
  line-height: 1.2;
}

.tile:not(.tile--selected) .tile__text {
  color: var(--text-primary);
}

.tiles__error {
  display: block;
  font-size: 0.72rem;
  color: var(--error);
  margin-top: 6px;
  padding-left: 2px;
}

.tile-err-enter-active { animation: tile-err-in 0.25s ease; }
.tile-err-leave-active { animation: tile-err-in 0.15s ease reverse; }

@keyframes tile-err-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 560px) {
  .tiles__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
