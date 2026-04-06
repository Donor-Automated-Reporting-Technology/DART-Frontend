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
        <span v-if="opt.icon" class="tile__icon">{{ opt.icon }}</span>
        <span class="tile__text">{{ opt.label }}</span>
        <Transition name="tile-check">
          <span v-if="modelValue === opt.value" class="tile__check">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </Transition>
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
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
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
  gap: 10px;
}

.tiles__grid--wrap {
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
}

.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 12px;
  min-height: 44px;
  background: var(--bg-panel);
  border: 1.5px solid var(--border-color);
  border-radius: 16px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.tile:hover {
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border-color));
  background: color-mix(in srgb, var(--primary) 4%, var(--bg-panel));
}

.tile--selected {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, var(--bg-panel));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
}

.tile--selected:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, var(--bg-panel));
}

.tile--error {
  border-color: var(--error);
}

.tile__icon {
  font-size: 1.4rem;
  line-height: 1;
}

.tile__text {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  line-height: 1.2;
}

.tile--selected .tile__text {
  color: var(--primary);
}

.tile__check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 18px;
  height: 18px;
  color: var(--primary);
}

.tile__check svg {
  width: 18px;
  height: 18px;
}

.tile-check-enter-active {
  animation: tile-pop 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.tile-check-leave-active {
  animation: tile-pop 0.15s cubic-bezier(0.4, 0, 0.2, 1) reverse;
}

@keyframes tile-pop {
  0% { opacity: 0; transform: scale(0.3); }
  60% { transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
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
