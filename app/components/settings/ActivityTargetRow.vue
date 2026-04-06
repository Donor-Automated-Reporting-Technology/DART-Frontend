<template>
  <div class="activity-row" :class="{ 'activity-row--active': modelActive }">
    <!-- Toggle -->
    <label class="toggle-wrap">
      <input
        type="checkbox"
        class="toggle-input"
        :checked="modelActive"
        @change="$emit('update:modelActive', ($event.target as HTMLInputElement).checked)"
      />
      <span class="toggle-track"><span class="toggle-thumb" /></span>
    </label>

    <!-- Name + description -->
    <div class="activity-info">
      <span class="activity-name">{{ name }}</span>
      <span v-if="description" class="activity-desc">{{ description }}</span>
    </div>

    <!-- Target inputs (only when active) -->
    <div v-if="modelActive" class="target-group">
      <input
        type="number"
        class="target-input"
        :value="targetCount"
        min="0"
        placeholder="0"
        @input="$emit('update:targetCount', Number(($event.target as HTMLInputElement).value))"
      />
      <select
        class="target-unit"
        :value="targetUnit"
        @change="$emit('update:targetUnit', ($event.target as HTMLSelectElement).value)"
      >
        <option value="children">children</option>
        <option value="adults">adults</option>
        <option value="beneficiaries">beneficiaries</option>
        <option value="sessions">sessions</option>
        <option value="cases">cases</option>
        <option value="participants">participants</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  description?: string
  modelActive: boolean
  targetCount: number
  targetUnit: string
}>()

defineEmits<{
  (e: 'update:modelActive', value: boolean): void
  (e: 'update:targetCount', value: number): void
  (e: 'update:targetUnit', value: string): void
}>()
</script>

<style scoped>
.activity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  transition: border-color 0.15s, opacity 0.15s;
  opacity: 0.55;
}

.activity-row--active {
  opacity: 1;
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 3%, var(--bg-panel));
}

/* ── Toggle ───────────────────────────────────────────────────────────────── */
.toggle-wrap {
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  margin-top: 2px;
}

.toggle-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  display: block;
  width: 34px;
  height: 18px;
  background: var(--border-color);
  border-radius: 9px;
  transition: background 0.2s;
  position: relative;
}

.toggle-input:checked + .toggle-track {
  background: var(--primary);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-input:checked + .toggle-track .toggle-thumb {
  transform: translateX(16px);
}

/* ── Info ──────────────────────────────────────────────────────────────────── */
.activity-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}

.activity-name {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-desc {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Target ────────────────────────────────────────────────────────────────── */
.target-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.target-input {
  width: 80px;
  padding: 7px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.8rem;
  text-align: right;
  font-family: inherit;
}

.target-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-dim);
}

.target-unit {
  padding: 7px 28px 7px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-family: inherit;
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 6px center;
  background-repeat: no-repeat;
  background-size: 16px;
  min-width: 110px;
}

.target-unit:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-dim);
}

.target-unit:hover {
  border-color: var(--text-muted);
}

@media (max-width: 600px) {
  .activity-row {
    flex-wrap: wrap;
  }
  .target-group {
    width: 100%;
    padding-left: 46px;
  }
}
</style>
