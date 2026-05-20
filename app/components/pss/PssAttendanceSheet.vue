<script setup lang="ts">
/**
 * PssAttendanceSheet — bottom sheet (mobile) / centered modal (desktop)
 * for marking per-session attendance.
 *
 * Lists every child registered at the current CFS and lets the
 * facilitator toggle Present / Absent per child. Bulk shortcuts
 * "Mark all present" / "Mark all absent" cover the common cases.
 * On submit the parent owns the BE call (composable does the work);
 * this component is presentation only.
 */

import { computed, onBeforeUnmount, watch } from 'vue';
import { Check, X, Search, UserCheck, UserX } from 'lucide-vue-next';
import type { PssAttendanceRow } from '~/composables/usePssSessionAttendance';

interface Props {
  open: boolean;
  rows: PssAttendanceRow[];
  loading: boolean;
  saving: boolean;
  loadError: string;
  saveError: string;
  presentCount: number;
  absentCount: number;
  totalCount: number;
  markedCount: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'set-status', beneficiaryId: string, status: 'present' | 'absent'): void;
  (e: 'mark-remaining-present'): void;
  (e: 'mark-remaining-absent'): void;
  (e: 'submit'): void;
}>();

import { ref } from 'vue';
const search = ref('');

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return props.rows;
  return props.rows.filter((r) => {
    const parts = [
      r.beneficiary.personal_name,
      r.beneficiary.father_name,
      r.beneficiary.family_name,
    ]
      .filter((p): p is string => !!p)
      .join(' ')
      .toLowerCase();
    return parts.includes(q);
  });
});

const titleId = `pss-attendance-${Math.random().toString(36).slice(2, 9)}`;

function close(): void {
  if (props.saving) return;
  emit('update:open', false);
}

function onBackdrop(event: MouseEvent): void {
  if (event.target === event.currentTarget) close();
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKeydown);
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
}

watch(
  () => props.open,
  (open) => {
    if (open) search.value = '';
  },
);

function fullName(b: PssAttendanceRow['beneficiary']): string {
  const parts = [b.personal_name, b.father_name, b.family_name].filter(
    (p): p is string => !!p,
  );
  return parts.join(' ').trim() || 'Unnamed child';
}
</script>

<template>
  <div
    v-if="open"
    class="sheet-backdrop"
    role="presentation"
    @click="onBackdrop"
  >
    <div
      class="sheet"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <header class="sheet-head">
        <div>
          <h2 :id="titleId" class="sheet-title">Attendance</h2>
          <p class="sheet-sub">
            Mark each child present or absent for this session.
          </p>
        </div>
        <button
          type="button"
          class="sheet-close"
          aria-label="Close"
          :disabled="saving"
          @click="close"
        >
          <X :size="18" />
        </button>
      </header>

      <div class="sheet-stats">
        <span class="stat stat--present">
          <UserCheck :size="13" />
          {{ presentCount }} present
        </span>
        <span class="stat stat--absent">
          <UserX :size="13" />
          {{ absentCount }} absent
        </span>
        <span class="stat stat--total">
          {{ markedCount }} / {{ totalCount }} marked
        </span>
      </div>

      <div class="sheet-toolbar">
        <div class="search-wrap">
          <Search :size="14" class="search-icon" />
          <input
            v-model="search"
            class="search-input"
            type="search"
            placeholder="Search children…"
            autocomplete="off"
          />
        </div>
        <div class="bulk-buttons">
          <button
            type="button"
            class="bulk-btn"
            :disabled="saving"
            @click="emit('mark-remaining-present')"
          >
            All present
          </button>
          <button
            type="button"
            class="bulk-btn"
            :disabled="saving"
            @click="emit('mark-remaining-absent')"
          >
            All absent
          </button>
        </div>
      </div>

      <div class="sheet-body">
        <p v-if="loading" class="bn-state">Loading children…</p>
        <p v-else-if="loadError" class="bn-state bn-state--error">
          {{ loadError }}
        </p>
        <p v-else-if="rows.length === 0" class="bn-state">
          No children registered at your CFS yet. Register beneficiaries first.
        </p>
        <p v-else-if="filtered.length === 0" class="bn-state">
          No children match this search.
        </p>
        <ul v-else class="bn-list">
          <li
            v-for="row in filtered"
            :key="row.beneficiary.id"
            class="bn-row"
            :data-status="row.status"
          >
            <div class="bn-row__main">
              <span class="bn-row__name">{{ fullName(row.beneficiary) }}</span>
              <span class="bn-row__meta">
                Age {{ row.beneficiary.age_at_registration }} ·
                {{ row.beneficiary.sex || 'Unknown' }}
              </span>
            </div>
            <div class="bn-row__actions" role="radiogroup">
              <button
                type="button"
                class="status-btn status-btn--present"
                :data-active="row.status === 'present'"
                :disabled="saving"
                role="radio"
                :aria-checked="row.status === 'present'"
                aria-label="Present"
                @click="emit('set-status', row.beneficiary.id, 'present')"
              >
                <Check :size="14" />
              </button>
              <button
                type="button"
                class="status-btn status-btn--absent"
                :data-active="row.status === 'absent'"
                :disabled="saving"
                role="radio"
                :aria-checked="row.status === 'absent'"
                aria-label="Absent"
                @click="emit('set-status', row.beneficiary.id, 'absent')"
              >
                <X :size="14" />
              </button>
            </div>
          </li>
        </ul>
      </div>

      <p v-if="saveError" class="save-error">{{ saveError }}</p>

      <footer class="sheet-foot">
        <button
          type="button"
          class="btn-ghost"
          :disabled="saving"
          @click="close"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn-primary"
          :disabled="saving || markedCount === 0"
          @click="emit('submit')"
        >
          <span v-if="saving" class="spinner" />
          {{ saving ? 'Saving…' : 'Save attendance' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet {
  width: 100%;
  max-width: 560px;
  max-height: 92vh;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 18px 18px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.45);
}

@media (min-width: 768px) {
  .sheet-backdrop { align-items: center; }
  .sheet {
    border-radius: 14px;
    max-height: 84vh;
  }
}

.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px 8px;
}
.sheet-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}
.sheet-sub {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 2px 0 0;
}
.sheet-close {
  border: none;
  background: var(--bg-input);
  color: var(--text-muted);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.sheet-close:disabled { opacity: 0.4; }

.sheet-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 18px 10px;
}
.stat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 600;
}
.stat--present {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}
.stat--absent {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.stat--total {
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.sheet-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 0 18px 10px;
  flex-wrap: wrap;
}
.search-wrap {
  position: relative;
  flex: 1;
  min-width: 200px;
}
.search-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}
.search-input {
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 9px 12px 9px 32px;
  color: var(--text-primary);
  font-size: 0.88rem;
  font-family: inherit;
  box-sizing: border-box;
}
.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.bulk-buttons { display: flex; gap: 6px; }
.bulk-btn {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.bulk-btn:hover:not(:disabled) {
  border-color: var(--text-muted);
  color: var(--text-primary);
}
.bulk-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sheet-body {
  padding: 4px 18px 12px;
  overflow: auto;
  flex: 1;
}
.bn-state {
  margin: 30px 0;
  text-align: center;
  font-size: 0.86rem;
  color: var(--text-muted);
}
.bn-state--error { color: var(--error); }

.bn-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.bn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
}
.bn-row + .bn-row {
  border-top: 1px solid var(--border-color);
  border-radius: 0;
}
.bn-row[data-status='present'] {
  background: rgba(34, 197, 94, 0.05);
}
.bn-row[data-status='absent'] {
  background: rgba(239, 68, 68, 0.05);
}
.bn-row__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.bn-row__name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
}
.bn-row__meta {
  font-size: 0.74rem;
  color: var(--text-muted);
}
.bn-row__actions {
  display: flex;
  gap: 6px;
}
.status-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--text-muted);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.status-btn--present[data-active='true'] {
  background: #22c55e;
  border-color: #22c55e;
  color: #052e16;
}
.status-btn--absent[data-active='true'] {
  background: #ef4444;
  border-color: #ef4444;
  color: #fff;
}
.status-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.save-error {
  margin: 0;
  padding: 8px 18px;
  font-size: 0.82rem;
  color: var(--error);
  background: var(--error-bg);
  border-top: 1px solid var(--border-color);
}

.sheet-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 16px;
  border-top: 1px solid var(--border-color);
}
.btn-ghost {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-ghost:disabled { opacity: 0.4; }
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.spinner {
  width: 11px;
  height: 11px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
