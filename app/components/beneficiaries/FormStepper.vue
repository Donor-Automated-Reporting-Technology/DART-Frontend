<template>
  <nav class="stepper" role="navigation" aria-label="Registration progress">
    <div class="stepper__header">
      <span class="stepper__label">Step {{ current + 1 }} of {{ steps.length }}</span>
      <span class="stepper__step-name">{{ steps[current] }}</span>
    </div>
    <div class="stepper__bar-track">
      <div
        class="stepper__bar-fill"
        :style="{ width: `${((current + 1) / steps.length) * 100}%` }"
      />
    </div>
    <div class="stepper__steps">
      <button
        v-for="(step, i) in steps"
        :key="i"
        type="button"
        class="stepper__step"
        :class="{
          'stepper__step--active': i === current,
          'stepper__step--completed': i < current,
        }"
        :aria-current="i === current ? 'step' : undefined"
        :aria-label="`Step ${i + 1}: ${step}`"
        :disabled="i > current"
        @click="i < current && $emit('go', i)"
      >
        {{ step }}
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  steps: string[]
  current: number
}>()

defineEmits<{
  go: [index: number]
}>()
</script>

<style scoped>
.stepper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stepper__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.stepper__label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6E6E73;
  letter-spacing: 0.02em;
}

.stepper__step-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-primary);
}

.stepper__bar-track {
  width: 100%;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
}

.stepper__bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.stepper__steps {
  display: flex;
  gap: 4px;
}

.stepper__step {
  flex: 1;
  padding: 0;
  background: none;
  border: none;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: default;
  text-align: center;
  transition: color 0.2s;
}

.stepper__step--completed {
  color: var(--text-secondary);
  cursor: pointer;
}

.stepper__step--completed:hover {
  color: var(--text-primary);
}

.stepper__step--active {
  color: var(--primary);
  font-weight: 600;
}
</style>
