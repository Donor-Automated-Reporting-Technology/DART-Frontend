<template>
  <div class="assign-form">
    <label class="assign-label">Assign to Locations</label>
    <div class="assign-list">
      <label
        v-for="sp in servicePoints"
        :key="sp.id"
        class="assign-row"
        :class="{ 'assign-row--active': modelValue.includes(sp.id) }"
      >
        <input
          type="checkbox"
          :checked="modelValue.includes(sp.id)"
          @change="toggle(sp.id)"
        />
        <span class="assign-name">{{ sp.name }}</span>
      </label>
      <p v-if="servicePoints.length === 0" class="assign-empty">No service points configured.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ServicePoint } from '../../interfaces/location'

const props = defineProps<{
  servicePoints: ServicePoint[]
  modelValue: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', ids: string[]): void
}>()

function toggle(id: string) {
  const next = props.modelValue.includes(id)
    ? props.modelValue.filter(x => x !== id)
    : [...props.modelValue, id]
  emit('update:modelValue', next)
}
</script>

<style scoped>
.assign-form { display: flex; flex-direction: column; gap: 8px; }

.assign-label {
  font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--text-muted);
}

.assign-list {
  display: flex; flex-direction: column; gap: 0;
  border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);
  max-height: 200px; overflow-y: auto;
}

.assign-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; cursor: pointer;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.1s;
}

.assign-row:last-child { border-bottom: none; }
.assign-row:hover { background: var(--hover-bg-subtle, rgba(255,255,255,0.02)); }
.assign-row--active { background: color-mix(in srgb, var(--primary) 6%, transparent); }

.assign-row input { accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer; }
.assign-name { font-size: 0.82rem; color: var(--text-primary); }

.assign-empty { padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.82rem; margin: 0; }
</style>
