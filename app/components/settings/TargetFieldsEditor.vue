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
        <AppIcon name="x" :size="13" />
      </button>
    </div>

    <button type="button" class="tf-add" @click="addRow">
      <AppIcon name="plus" :size="13" /> Add target field
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

/** A row keeps its value as a string while editing; it is parsed on emit. */
interface Row {
  uid: number
  label: string
  type: TargetFieldType
  value: string
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

/** Parse an edited string back into a number/boolean/string based on the field type. */
function parseValue(row: Row): string | number | boolean | null {
  const raw = row.value.trim()
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
  if (row.type === 'boolean' && row.value !== 'true' && row.value !== 'false') {
    row.value = 'true'
  } else if (!isNumeric(row.type) && row.type !== 'date' && isNumericValue(row.value)) {
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
.tf-editor { margin-bottom: 12px; }
.tf-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.tf-label { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); }
.tf-hint { font-size: 0.7rem; color: var(--text-muted); }
.tf-empty {
  font-size: 0.78rem; color: var(--text-muted);
  background: var(--bg-surface); border-radius: 8px;
  padding: 10px 12px; margin-bottom: 8px;
}
.tf-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.tf-input {
  min-width: 0; padding: 8px 10px; font-size: 0.85rem;
  background: var(--bg-input); border: 1px solid var(--border-color);
  border-radius: 6px; color: var(--text-primary); font-family: inherit;
}
.tf-input--name { flex: 1 1 26%; }
.tf-input--type { flex: 0 0 120px; }
.tf-input--value { flex: 1 1 20%; }
.tf-input--unit { flex: 1 1 20%; }
.tf-remove {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border: none; border-radius: 6px;
  background: transparent; color: var(--text-muted); cursor: pointer; flex-shrink: 0;
}
.tf-remove:hover { background: var(--error-bg); color: var(--error); }
.tf-add {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px; font-size: 0.78rem;
  background: transparent; color: var(--text-muted);
  border: 1px dashed var(--border-color); border-radius: 6px; cursor: pointer;
}
.tf-add:hover { color: var(--text-primary); border-color: var(--text-muted); }

@media (max-width: 640px) {
  .tf-row { flex-wrap: wrap; }
  .tf-input--name { flex: 1 1 100%; }
  .tf-input--type { flex: 1 1 45%; }
}
</style>
