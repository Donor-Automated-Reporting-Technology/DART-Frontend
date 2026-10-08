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
      <button type="button" class="breakdown-toggle" @click="showBreakdown = !showBreakdown">
        <AppIcon :name="showBreakdown ? 'chevron-up' : 'chevron-down'" :size="14" />
      </button>
    </div>

    <!-- Gender + disability breakdown (expandable) -->
    <div v-if="modelActive && showBreakdown" class="breakdown">
      <div class="breakdown-grid">
        <div class="bk-field">
          <label :for="`${fid}-1`" class="bk-label">Girls</label>
          <input :id="`${fid}-1`"
            type="number"
            class="bk-input"
            :value="targetGirls"
            min="0"
            placeholder="0"
            @input="onBreakdownChange('girls', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="bk-field">
          <label :for="`${fid}-2`" class="bk-label">Boys</label>
          <input :id="`${fid}-2`"
            type="number"
            class="bk-input"
            :value="targetBoys"
            min="0"
            placeholder="0"
            @input="onBreakdownChange('boys', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="bk-field">
          <label :for="`${fid}-3`" class="bk-label">Girls w/ disability</label>
          <input :id="`${fid}-3`"
            type="number"
            class="bk-input"
            :value="targetGirlsDisability"
            min="0"
            placeholder="0"
            @input="onBreakdownChange('girls_disability', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="bk-field">
          <label :for="`${fid}-4`" class="bk-label">Boys w/ disability</label>
          <input :id="`${fid}-4`"
            type="number"
            class="bk-input"
            :value="targetBoysDisability"
            min="0"
            placeholder="0"
            @input="onBreakdownChange('boys_disability', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { ref } from 'vue'

// Links each label to its field.
const fid = useId()

const props = defineProps<{
  name: string
  description?: string
  modelActive: boolean
  targetCount: number
  targetUnit: string
  targetGirls: number
  targetBoys: number
  targetGirlsDisability: number
  targetBoysDisability: number
}>()

const emit = defineEmits<{
  (e: 'update:modelActive', value: boolean): void
  (e: 'update:targetCount', value: number): void
  (e: 'update:targetUnit', value: string): void
  (e: 'update:breakdown', value: { target_girls: number; target_boys: number; target_girls_disability: number; target_boys_disability: number }): void
}>()

const showBreakdown = ref(false)

function onBreakdownChange(field: string, value: number) {
  const breakdown = {
    target_girls: props.targetGirls,
    target_boys: props.targetBoys,
    target_girls_disability: props.targetGirlsDisability,
    target_boys_disability: props.targetBoysDisability,
  }
  if (field === 'girls') breakdown.target_girls = value
  else if (field === 'boys') breakdown.target_boys = value
  else if (field === 'girls_disability') breakdown.target_girls_disability = value
  else if (field === 'boys_disability') breakdown.target_boys_disability = value

  emit('update:breakdown', breakdown)
  // Auto-update the total count from gender breakdown
  emit('update:targetCount', breakdown.target_girls + breakdown.target_boys)
}
</script>

<style scoped>
.activity-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  transition: border-color 0.15s, opacity 0.15s, background 0.15s;
  opacity: 0.5;
  flex-wrap: wrap;
}

.activity-row--active {
  opacity: 1;
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border-color));
  background: color-mix(in srgb, var(--primary) 2%, var(--bg-panel));
}

/* ── Toggle ── */
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
  width: 36px;
  height: 20px;
  background: var(--border-color);
  border-radius: 10px;
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
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.toggle-input:checked + .toggle-track .toggle-thumb {
  transform: translateX(16px);
}

/* ── Info ── */
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

/* ── Target ── */
.target-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.target-input {
  width: 80px;
  padding: 8px 10px;
  background: var(--bg-input);
  border: 1px solid var(--input-border-hover);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.8rem;
  text-align: right;
  font-family: inherit;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.target-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--field-ring);
}

.target-unit {
  padding: 8px 28px 8px 10px;
  background: var(--bg-input);
  border: 1px solid var(--input-border-hover);
  border-radius: 8px;
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
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.target-unit:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--field-ring);
}

.target-unit:hover {
  border-color: var(--text-muted);
}

.breakdown-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-muted);
  transition: border-color 0.15s, color 0.15s;
}
.breakdown-toggle:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* ── Breakdown ── */
.breakdown {
  width: 100%;
  padding: 12px 0 0 50px;
  animation: slideDown 0.15s ease-out;
}

.breakdown-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.bk-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bk-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
}

.bk-input {
  width: 100%;
  padding: 6px 8px;
  background: var(--bg-input);
  border: 1px solid var(--input-border-hover);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.78rem;
  text-align: right;
  font-family: inherit;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.bk-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--field-ring);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 600px) {
  .target-group {
    width: 100%;
    padding-left: 46px;
  }
  .breakdown {
    padding-left: 0;
  }
}
</style>
