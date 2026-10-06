<template>
  <div class="tu-stack">
    <div v-for="row in ROWS" :key="row.key" class="tu-card tu-thumb">
      <span class="tu-thumb-icon" :class="row.cls" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: `rotate(${row.rotate}deg)` }">
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
      </span>
      <span class="tu-name">{{ row.label }}</span>
      <span class="tu-counter">
        <button type="button" :aria-label="`One fewer ${row.label}`" @click="change(row.key, -1)">−</button>
        <span aria-live="polite">{{ modelValue[row.key] }}</span>
        <button type="button" :aria-label="`One more ${row.label}`" @click="change(row.key, 1)">+</button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Thumbs } from '../../interfaces/teamup'

const props = defineProps<{ modelValue: Thumbs }>()
const emit = defineEmits<{ 'update:modelValue': [value: Thumbs] }>()

const ROWS = [
  { key: 'good', label: 'Good', cls: 'tu-thumb-good', rotate: 0 },
  { key: 'ok', label: 'Not too bad', cls: 'tu-thumb-ok', rotate: -90 },
  { key: 'bad', label: 'Not good', cls: 'tu-thumb-bad', rotate: 180 },
] as const

function change(key: keyof Thumbs, delta: number) {
  emit('update:modelValue', { ...props.modelValue, [key]: Math.max(0, props.modelValue[key] + delta) })
}
</script>
