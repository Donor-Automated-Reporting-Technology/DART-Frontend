<template>
  <div class="tf-editor">
    <div v-if="label" class="tf-head">
      <span class="tf-label">{{ label }}</span>
      <span v-if="hint" class="tf-hint">{{ hint }}</span>
    </div>

    <div v-if="!rows.length" class="tf-empty">
      No target fields yet — add one below (e.g. Girls, Boys, Persons with disability).
    </div>

    <div v-for="(row, i) in rows" :key="row.uid" class="tf-row">
      <input
        v-model="row.label"
        type="text"
        class="tf-input tf-input--name"
        placeholder="Field name (e.g. Girls)"
        @input="emitValue"
      />

      <select v-model="row.type" class="tf-input tf-input--type" @change="onTypeChange(row)">
        <option v-for="t in fieldTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>

      <select
        v-if="row.type === 'boolean'"
        v-model="row.value"
        class="tf-input tf-input--value"
        @change="emitValue"
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
      <input
        v-else-if="row.type === 'date'"
        v-model="row.value"
        type="date"
        class="tf-input tf-input--value"
        @input="emitValue"
      />
      <input
        v-else
        v-model="row.value"
        :type="isNumeric(row.type) ? 'number' : 'text'"
        :step="row.type === 'number' ? '1' : 'any'"
        class="tf-input tf-input--value"
        placeholder="Value"
        @input="emitValue"
      />

      <input
        v-model="row.unit"
        type="text"
        class="tf-input tf-input--unit"
        placeholder="Unit (e.g. persons)"
        @input="emitValue"
      />

      <button type="button" class="tf-remove" title="Remove field" @click="removeRow(i)">
        &times;
      </button>
    </div>

    <button type="button" class="tf-add" @click="addRow">
      + Add target field
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { LogframeTargetField, TargetFieldType } from '../../interfaces/logframe'

const props = defineProps<{
  /** The list of target fields being edited. */
  modelValue?: LogframeTargetField[] | null
  label?: string
  hint?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: LogframeTargetField[]): void
}>()

const fieldTypes: Array<{ value: TargetFieldType; label: string }> = [
  { value: 'number', label: 'Number' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'percent', label: 'Percent' },
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes / No' },
]

/**
 * A row keeps its value as a string while editing; it is parsed on emit.
 * Note: `v-model` on an `<input type="number">` casts the bound value to a
 * JS number, so `value` can arrive as either a string or a number.
 */
interface Row {
  uid: number
  label: string
  type: TargetFieldType
  value: string | number
  unit: string
}

let uid = 0
const rows = ref<Row[]>([])
/** True while we are the source of the latest modelValue, to avoid rebuilding rows. */
let internalUpdate = false

function isNumeric(type: TargetFieldType): boolean {
  return type === 'number' || type === 'decimal' || type === 'percent'
}

function toRows(list: LogframeTargetField[] | null | undefined): Row[] {
  return (list ?? []).map((f) => ({
    uid: uid++,
    label: f.label ?? '',
    type: (f.type as TargetFieldType) ?? 'number',
    value: f.value === null || f.value === undefined ? '' : String(f.value),
    unit: f.unit ?? '',
  }))
}

/** Normalise a raw row value to a string (number inputs store JS numbers). */
function valueText(value: string | number | boolean | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

/** Parse an edited value back into a number/boolean/string based on the field type. */
function parseValue(row: Row): string | number | boolean | null {
  const raw = valueText(row.value).trim()
  if (row.type === 'boolean') return raw === 'true'
  if (raw === '') return null
  if (isNumeric(row.type)) {
    const n = Number(raw)
    return Number.isNaN(n) ? null : n
  }
  return raw
}

watch(
  () => props.modelValue,
  (val) => {
    if (internalUpdate) {
      internalUpdate = false
      return
    }
    rows.value = toRows(val)
  },
  { immediate: true },
)

function emitValue() {
  const out: LogframeTargetField[] = []
  for (const row of rows.value) {
    if (!row.label.trim()) continue
    const field: LogframeTargetField = {
      label: row.label.trim(),
      type: row.type,
      value: parseValue(row),
    }
    if (row.unit.trim()) field.unit = row.unit.trim()
    out.push(field)
  }
  internalUpdate = true
  emit('update:modelValue', out)
}

/** Reset the value when switching to a type the old value cannot represent. */
function onTypeChange(row: Row) {
  const current = valueText(row.value)
  if (row.type === 'boolean' && current !== 'true' && current !== 'false') {
    row.value = 'true'
  } else if (!isNumeric(row.type) && row.type !== 'date' && isNumericValue(current)) {
    row.value = ''
  }
  emitValue()
}

function isNumericValue(v: string): boolean {
  return v.trim() !== '' && !Number.isNaN(Number(v))
}

function addRow() {
  rows.value.push({ uid: uid++, label: '', type: 'number', value: '', unit: '' })
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
  emitValue()
}
</script>

<style scoped>
.tf-editor { margin: 6px 0 16px; }
.tf-head { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; }
.tf-label { font-size: 0.8rem; font-weight: 600; color: var(--ps-text, var(--text-primary)); }
.tf-hint { font-size: 0.76rem; color: var(--ps-text-2, var(--text-secondary)); }
.tf-empty {
  font-size: 0.84rem; color: var(--ps-text-2, var(--text-secondary));
  background: var(--ps-tile, var(--bg-surface)); border-radius: 8px;
  padding: 10px 12px; margin-bottom: 8px;
}
.tf-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.tf-input {
  min-width: 0; padding: 10px 12px; font-size: 0.9rem;
  background: var(--ps-input, var(--bg-input)); border: 1px solid var(--ps-input-border, var(--border-color));
  border-radius: 8px; color: var(--ps-text, var(--text-primary)); font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.tf-input--name { flex: 1 1 26%; }
.tf-input--type { flex: 0 0 120px; }
.tf-input--value { flex: 1 1 20%; }
.tf-input--unit { flex: 1 1 20%; }
.tf-remove {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: none; border-radius: 8px; font-size: 1.1rem; line-height: 1;
  background: transparent; color: var(--ps-text-2, var(--text-secondary)); cursor: pointer; flex-shrink: 0;
}
.tf-remove:hover { background: var(--error-bg); color: var(--error); }
.tf-add {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; font-size: 0.82rem; font-weight: 600; font-family: inherit;
  background: var(--brand-soft, var(--bg-surface)); color: var(--ps-text, var(--text-primary));
  border: none; border-radius: 8px; cursor: pointer; transition: background 0.15s, color 0.15s;
}
.tf-add:hover { background: var(--brand, var(--accent)); color: #fff; }
.tf-input:focus { outline: none; border-color: var(--brand, var(--accent)); box-shadow: 0 0 0 3px var(--brand-soft, transparent); }

@media (max-width: 640px) {
  .tf-row { flex-wrap: wrap; }
  .tf-input--name { flex: 1 1 100%; }
  .tf-input--type { flex: 1 1 45%; }
}
</style>
