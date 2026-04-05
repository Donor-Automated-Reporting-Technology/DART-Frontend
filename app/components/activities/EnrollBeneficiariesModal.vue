<template>
  <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-box">
      <div class="modal-header">
        <h3 class="modal-title">Enroll Beneficiaries</h3>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-search">
        <input
          v-model="search"
          type="text"
          class="search-input"
          placeholder="Search by name…"
        />
      </div>

      <div class="modal-list">
        <label
          v-for="b in filtered"
          :key="b.id"
          class="bene-row"
          :class="{ 'bene-row--selected': selected.has(b.id) }"
        >
          <input
            type="checkbox"
            :checked="selected.has(b.id)"
            @change="toggle(b.id)"
          />
          <span class="bene-name">{{ b.full_name }}</span>
          <span class="bene-meta">{{ b.age }}y &middot; {{ b.sex }}</span>
        </label>
        <p v-if="filtered.length === 0" class="empty-list">No matching beneficiaries.</p>
      </div>

      <div class="modal-footer">
        <span class="selected-count">{{ selected.size }} selected</span>
        <button class="btn-secondary" @click="$emit('close')">Cancel</button>
        <button
          class="btn-primary"
          :disabled="selected.size === 0 || enrolling"
          @click="enroll"
        >
          <span v-if="enrolling" class="btn-spinner" />
          {{ enrolling ? 'Enrolling…' : 'Enroll Selected' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface BeneficiaryOption {
  id: string
  full_name: string
  age: number
  sex: string
}

const props = defineProps<{
  open: boolean
  beneficiaries: BeneficiaryOption[]
  enrolling?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'enroll', ids: string[]): void
}>()

const search = ref('')
const selected = ref<Set<string>>(new Set())

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return props.beneficiaries.filter(b =>
    b.full_name.toLowerCase().includes(q),
  )
})

function toggle(id: string) {
  if (selected.value.has(id)) selected.value.delete(id)
  else selected.value.add(id)
  // trigger reactivity
  selected.value = new Set(selected.value)
}

function enroll() {
  emit('enroll', [...selected.value])
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-box {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 460px;
  max-width: 95vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.4rem;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
}

.modal-search {
  padding: 12px 18px;
}

.search-input {
  width: 100%;
  padding: 9px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.82rem;
  font-family: inherit;
  box-sizing: border-box;
}

.search-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }

.modal-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 18px;
  max-height: 360px;
}

.bene-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background 0.1s;
}

.bene-row:hover { background: var(--hover-bg-subtle, rgba(255,255,255,0.02)); }
.bene-row--selected { background: color-mix(in srgb, var(--primary) 6%, transparent); }

.bene-row input { accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer; }

.bene-name { font-size: 0.82rem; font-weight: 500; color: var(--text-primary); flex: 1; }
.bene-meta { font-size: 0.72rem; color: var(--text-muted); }

.empty-list {
  text-align: center;
  padding: 24px 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.modal-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid var(--border-subtle);
}

.selected-count { font-size: 0.78rem; color: var(--text-muted); flex: 1; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
  background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm);
  font-size: 0.82rem; font-weight: 600; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-secondary {
  padding: 8px 16px; background: transparent; color: var(--text-muted);
  border: 1px solid var(--border-color); border-radius: var(--radius-sm);
  font-size: 0.82rem; cursor: pointer;
}

.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
