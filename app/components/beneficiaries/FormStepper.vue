<template>
  <nav class="stepper" role="navigation" aria-label="Registration progress">
    <ol class="stepper__track">
      <li
        v-for="(step, i) in steps"
        :key="i"
        class="stepper__item"
        :class="{
          'stepper__item--active': i === current,
          'stepper__item--completed': i < current,
          'stepper__item--upcoming': i > current,
        }"
      >
        <button
          class="stepper__dot"
          :aria-current="i === current ? 'step' : undefined"
          :aria-label="`Step ${i + 1}: ${step}`"
          :disabled="i > current"
          @click="i < current && $emit('go', i)"
        >
          <svg v-if="i < current" class="stepper__check" viewBox="0 0 20 20" fill="none">
            <path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span v-else class="stepper__num">{{ i + 1 }}</span>
        </button>
        <span class="stepper__label">{{ step }}</span>
        <span v-if="i < steps.length - 1" class="stepper__line" />
      </li>
    </ol>
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
  padding: 0 8px;
}

.stepper__track {
  display: flex;
  align-items: flex-start;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0;
}

.stepper__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  min-width: 0;
}

.stepper__dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--border-color);
  background: var(--bg-panel);
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 700;
  font-family: inherit;
  cursor: default;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 2;
  padding: 0;
}

.stepper__item--active .stepper__dot {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 16%, transparent);
  transform: scale(1.08);
}

.stepper__item--completed .stepper__dot {
  border-color: #34c759;
  background: #34c759;
  color: #fff;
  cursor: pointer;
}

.stepper__item--completed .stepper__dot:hover {
  box-shadow: 0 0 0 3px color-mix(in srgb, #34c759 20%, transparent);
}

.stepper__check {
  width: 16px;
  height: 16px;
}

.stepper__num {
  line-height: 1;
}

.stepper__label {
  margin-top: 8px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  text-align: center;
  letter-spacing: 0.02em;
  transition: color 0.3s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  padding: 0 4px;
}

.stepper__item--active .stepper__label {
  color: var(--primary);
}

.stepper__item--completed .stepper__label {
  color: #34c759;
}

.stepper__line {
  position: absolute;
  top: 18px;
  left: calc(50% + 22px);
  right: calc(-50% + 22px);
  height: 2px;
  background: var(--border-color);
  z-index: 1;
  transition: background 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.stepper__item--completed .stepper__line {
  background: #34c759;
}

@media (max-width: 560px) {
  .stepper__label {
    font-size: 0.65rem;
  }
  .stepper__dot {
    width: 30px;
    height: 30px;
    font-size: 0.72rem;
  }
  .stepper__line {
    top: 15px;
    left: calc(50% + 19px);
    right: calc(-50% + 19px);
  }
}
</style>
