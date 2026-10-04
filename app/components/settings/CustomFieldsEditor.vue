<template>
  <div class="cf-editor">
    <div v-if="label" class="cf-head">
      <span class="cf-label">{{ label }}</span>
      <span v-if="hint" class="cf-hint">{{ hint }}</span>
    </div>

    <div v-for="(row, i) in rows" :key="i" class="cf-row">
      <input
        v-model="row.key"
        type="text"
        class="cf-input cf-input--key"
        placeholder="Field name"
        @input="emitValue"
      />
      <input
        v-model="row.value"
        type="text"
        class="cf-input"
        placeholder="Value"
        @input="emitValue"
      />
      <button type="button" class="cf-remove" title="Remove field" @click="removeRow(i)">
        &times;
      </button>
    </div>

    <button type="button" class="cf-add" @click="addRow">
      + Add field
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  /** The custom-field map being edited (free-form key/value pairs). */
  modelValue?: Record<string, unknown> | null
  label?: string
  hint?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>): void
}>()

interface Row {
  key: string
  value: string
}

const rows = ref<Row[]>([])
/** True while we are the source of the latest modelValue, to avoid rebuilding rows. */
let internalUpdate = false

function toRows(obj: Record<string, unknown> | null | undefined): Row[] {
  return Object.entries(obj ?? {}).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value),
  }))
}

/** Parse an edited string back into a number/boolean/string where obvious. */
function parseValue(raw: string): unknown {
  const v = raw.trim()
  if (v === '') return ''
  if (v === 'true') return true
  if (v === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  return v
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
  const out: Record<string, unknown> = {}
  for (const row of rows.value) {
    const key = row.key.trim()
    if (!key) continue
    out[key] = parseValue(row.value)
  }
  internalUpdate = true
  emit('update:modelValue', out)
}

function addRow() {
  rows.value.push({ key: '', value: '' })
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
  emitValue()
}
</script>

<style scoped>
.cf-editor { margin: 6px 0 16px; }
.cf-head { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; }
.cf-label { font-size: 0.8rem; font-weight: 600; color: var(--ps-text, var(--text-primary)); }
.cf-hint { font-size: 0.76rem; color: var(--ps-text-2, var(--text-secondary)); }
.cf-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.cf-input {
  flex: 1; min-width: 0; padding: 10px 12px; font-size: 0.9rem;
  background: var(--ps-input, var(--bg-input)); border: 1px solid var(--ps-input-border, var(--border-color));
  border-radius: 8px; color: var(--ps-text, var(--text-primary)); font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.cf-input--key { flex: 0 0 38%; }
.cf-remove {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: none; border-radius: 8px; font-size: 1.1rem; line-height: 1;
  background: transparent; color: var(--ps-text-2, var(--text-secondary)); cursor: pointer; flex-shrink: 0;
}
.cf-remove:hover { background: var(--error-bg); color: var(--error); }
.cf-add {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; font-size: 0.82rem; font-weight: 600; font-family: inherit;
  background: var(--brand-soft, var(--bg-surface)); color: var(--ps-text, var(--text-primary));
  border: none; border-radius: 8px; cursor: pointer; transition: background 0.15s, color 0.15s;
}
.cf-add:hover { background: var(--brand, var(--accent)); color: #fff; }
.cf-input:focus { outline: none; border-color: var(--brand, var(--accent)); box-shadow: 0 0 0 3px var(--brand-soft, transparent); }
</style>
