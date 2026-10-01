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
        <AppIcon name="x" :size="13" />
      </button>
    </div>

    <button type="button" class="cf-add" @click="addRow">
      <AppIcon name="plus" :size="13" /> Add field
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
.cf-editor { margin-bottom: 12px; }
.cf-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.cf-label { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); }
.cf-hint { font-size: 0.7rem; color: var(--text-muted); }
.cf-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.cf-input {
  flex: 1; min-width: 0; padding: 8px 10px; font-size: 0.85rem;
  background: var(--bg-input); border: 1px solid var(--border-color);
  border-radius: 6px; color: var(--text-primary); font-family: inherit;
}
.cf-input--key { flex: 0 0 38%; }
.cf-remove {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border: none; border-radius: 6px;
  background: transparent; color: var(--text-muted); cursor: pointer; flex-shrink: 0;
}
.cf-remove:hover { background: var(--error-bg); color: var(--error); }
.cf-add {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px; font-size: 0.78rem;
  background: transparent; color: var(--text-muted);
  border: 1px dashed var(--border-color); border-radius: 6px; cursor: pointer;
}
.cf-add:hover { color: var(--text-primary); border-color: var(--text-muted); }
</style>
