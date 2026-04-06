<template>
  <div class="assign-form">
    <label class="assign-label">Assign to Locations</label>

    <!-- Selected pills -->
    <div v-if="modelValue.length > 0" class="assign-pills">
      <span
        v-for="id in modelValue"
        :key="id"
        class="assign-pill"
      >
        <span class="assign-pill__text">{{ nameOf(id) }}</span>
        <button
          type="button"
          class="assign-pill__remove"
          aria-label="Remove"
          @click="toggle(id)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </span>
    </div>

    <!-- Bento grid -->
    <div class="assign-grid" :class="{ 'assign-grid--empty': servicePoints.length === 0 }">
      <button
        v-for="sp in servicePoints"
        :key="sp.id"
        type="button"
        class="assign-card"
        :class="{ 'assign-card--active': modelValue.includes(sp.id) }"
        @click="toggle(sp.id)"
      >
        <div class="assign-card__icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <span class="assign-card__name">{{ sp.name }}</span>
        <span v-if="sp.sector" class="assign-card__meta">{{ sp.sector }}</span>
        <div v-if="modelValue.includes(sp.id)" class="assign-card__check">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      </button>
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

function nameOf(id: string): string {
  return props.servicePoints.find(sp => sp.id === id)?.name ?? id
}
</script>

<style scoped>
.assign-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.assign-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

/* ── Selected pills ──────────────────────────────── */
.assign-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.assign-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #F2F2F7;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #1D1D1F;
  transition: background 0.15s ease;
}

:root:not([data-theme="light"]) .assign-pill {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.assign-pill__text {
  line-height: 1;
}

.assign-pill__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  width: 16px;
  height: 16px;
  background: none;
  border: none;
  border-radius: 50%;
  color: #86868B;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.assign-pill__remove:hover {
  color: #1D1D1F;
  background: rgba(0, 0, 0, 0.06);
}

:root:not([data-theme="light"]) .assign-pill__remove:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.1);
}

/* ── Bento grid ──────────────────────────────────── */
.assign-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  padding: 2px;
}

.assign-grid--empty {
  display: flex;
}

.assign-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.2s ease, background 0.15s ease, transform 0.15s ease;
}

.assign-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-color);
}

.assign-card--active {
  border: 2px solid #000000;
  background: var(--bg-card);
}

[data-theme="light"] .assign-card--active {
  border-color: #000000;
}

:root:not([data-theme="light"]) .assign-card--active {
  border-color: #FFFFFF;
}

.assign-card:active {
  transform: scale(0.97);
}

.assign-card__icon {
  color: #86868B;
  transition: color 0.15s ease;
}

.assign-card--active .assign-card__icon {
  color: var(--text-primary);
}

.assign-card__name {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-primary);
  text-align: center;
  line-height: 1.25;
}

.assign-card__meta {
  font-size: 0.68rem;
  color: #86868B;
  text-align: center;
}

.assign-card__check {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #000000;
  color: #FFFFFF;
}

:root:not([data-theme="light"]) .assign-card__check {
  background: #FFFFFF;
  color: #000000;
}

.assign-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.82rem;
  margin: 0;
  width: 100%;
}

@media (max-width: 480px) {
  .assign-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
