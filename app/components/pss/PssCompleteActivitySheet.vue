<script setup lang="ts">
/**
 * PssCompleteActivitySheet — DART-44.
 *
 * Bottom sheet (mobile) / centered modal (desktop) opened from the
 * session checklist's "Mark complete" button. Captures:
 *   • optional free-text notes for the activity
 *   • optional child flag — picks a beneficiary registered at this CFS
 *     and a concern type
 *
 * Emits `submit` with the payload; the parent owns the API call so
 * the sheet stays stateless and reusable.
 */

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { AlertTriangle, X, Search, UserPlus } from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';
import { beneficiaryApi } from '~/services/beneficiaryApi';
import type { Beneficiary } from '~/interfaces/beneficiary';

export interface PssCompleteActivitySubmitPayload {
  notes: string;
  flag: {
    beneficiaryId: string;
    beneficiaryName: string;
    concern: string;
  } | null;
}

interface Props {
  open: boolean;
  activityName: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'submit', payload: PssCompleteActivitySubmitPayload): void;
}>();

const auth = useAuthStore();
const cfsLocationId = computed(() => auth.cfsLocationId ?? '');

// ── Local form state ────────────────────────────────────────────────────────

const notes = ref('');
const flagOpen = ref(false);
const search = ref('');
const concern = ref('');
const selectedBeneficiary = ref<Beneficiary | null>(null);

// Predefined concerns from PRD §7.4 + the "case pipeline" hand-off; the
// last item is a free-text fallback. The list is intentionally short
// because facilitators are typing on phones in the field.
const CONCERN_OPTIONS = [
  'Withdrawn / not participating',
  'Aggressive behaviour',
  'Visible distress / crying',
  'Disclosed harm',
  'Hygiene / health concern',
  'Other',
] as const;

const concernOther = ref('');
const isOther = computed(() => concern.value === 'Other');

const finalConcern = computed(() =>
  isOther.value ? concernOther.value.trim() : concern.value,
);

// ── Beneficiary lookup ──────────────────────────────────────────────────────

const beneficiaries = ref<Beneficiary[]>([]);
const loadingBeneficiaries = ref(false);
const lookupError = ref<string>('');

let searchHandle: ReturnType<typeof setTimeout> | null = null;

async function fetchBeneficiaries(): Promise<void> {
  if (!cfsLocationId.value) {
    beneficiaries.value = [];
    return;
  }
  loadingBeneficiaries.value = true;
  lookupError.value = '';
  try {
    const res = await beneficiaryApi.list({
      cfs_location_id: cfsLocationId.value,
      search: search.value.trim() || undefined,
      page: 1,
      page_size: 25,
    });
    beneficiaries.value = res.beneficiaries ?? [];
  } catch (err) {
    lookupError.value =
      err instanceof Error ? err.message : 'Could not load children.';
    beneficiaries.value = [];
  } finally {
    loadingBeneficiaries.value = false;
  }
}

watch(search, () => {
  if (!flagOpen.value) return;
  if (searchHandle) clearTimeout(searchHandle);
  searchHandle = setTimeout(fetchBeneficiaries, 250);
});

watch(flagOpen, async (isOpen) => {
  if (!isOpen) {
    selectedBeneficiary.value = null;
    return;
  }
  if (beneficiaries.value.length === 0) {
    await fetchBeneficiaries();
  }
});

// ── Open / close ────────────────────────────────────────────────────────────

const titleId = `pss-complete-activity-${Math.random().toString(36).slice(2, 9)}`;
const notesInput = ref<HTMLTextAreaElement | null>(null);

watch(
  () => props.open,
  async (open) => {
    if (open) {
      // Reset form on each open so a previous flag doesn't leak.
      notes.value = '';
      flagOpen.value = false;
      search.value = '';
      concern.value = '';
      concernOther.value = '';
      selectedBeneficiary.value = null;
      lookupError.value = '';
      await nextTick();
      notesInput.value?.focus();
    }
  },
);

function close(): void {
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
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown);
    if (searchHandle) clearTimeout(searchHandle);
  });
}

// ── Submit ──────────────────────────────────────────────────────────────────

const flagInvalid = computed(() => {
  if (!flagOpen.value) return false;
  if (!selectedBeneficiary.value) return true;
  if (!finalConcern.value) return true;
  return false;
});

function fullName(b: Beneficiary): string {
  const parts = [b.personal_name, b.father_name, b.family_name].filter(
    (p): p is string => !!p,
  );
  return parts.join(' ');
}

function onSubmit(): void {
  if (flagInvalid.value) return;
  emit('submit', {
    notes: notes.value.trim(),
    flag: selectedBeneficiary.value
      ? {
          beneficiaryId: selectedBeneficiary.value.id,
          beneficiaryName: fullName(selectedBeneficiary.value),
          concern: finalConcern.value,
        }
      : null,
  });
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
          <h2 :id="titleId" class="sheet-title">Complete activity</h2>
          <p class="sheet-sub">{{ activityName }}</p>
        </div>
        <button
          type="button"
          class="sheet-close"
          aria-label="Close"
          @click="close"
        >
          <X :size="18" />
        </button>
      </header>

      <div class="sheet-body">
        <label class="field">
          <span class="field-label">Notes (optional)</span>
          <textarea
            ref="notesInput"
            v-model="notes"
            class="field-input field-input--textarea"
            placeholder="What worked? Any standouts?"
            rows="3"
          />
        </label>

        <div class="flag-toggle">
          <button
            type="button"
            class="flag-toggle__btn"
            :data-on="flagOpen"
            @click="flagOpen = !flagOpen"
          >
            <AlertTriangle :size="14" />
            {{ flagOpen ? 'Cancel flag' : 'Flag a child' }}
          </button>
          <p class="flag-toggle__hint">
            Optional — for any child showing distress or disclosure.
          </p>
        </div>

        <section v-if="flagOpen" class="flag-block">
          <label class="field">
            <span class="field-label">Find child</span>
            <div class="search-wrap">
              <Search :size="14" class="search-icon" />
              <input
                v-model="search"
                class="field-input field-input--search"
                type="search"
                placeholder="Search by name…"
                autocomplete="off"
              />
            </div>
          </label>

          <div
            class="beneficiary-list"
            role="listbox"
            :aria-busy="loadingBeneficiaries"
          >
            <p v-if="loadingBeneficiaries" class="bn-state">Loading…</p>
            <p v-else-if="lookupError" class="bn-state bn-state--error">
              {{ lookupError }}
            </p>
            <p v-else-if="beneficiaries.length === 0" class="bn-state">
              No children registered at your CFS match this search.
            </p>
            <button
              v-for="b in beneficiaries"
              :key="b.id"
              type="button"
              class="bn-row"
              :data-selected="selectedBeneficiary?.id === b.id"
              role="option"
              :aria-selected="selectedBeneficiary?.id === b.id"
              @click="selectedBeneficiary = b"
            >
              <span class="bn-row__icon"><UserPlus :size="14" /></span>
              <span class="bn-row__main">
                <span class="bn-row__name">{{ fullName(b) }}</span>
                <span class="bn-row__meta">
                  Age {{ b.age_at_registration }} ·
                  {{ b.sex || 'Unknown' }}
                </span>
              </span>
            </button>
          </div>

          <fieldset class="concern-group">
            <legend class="field-label">Concern type</legend>
            <div class="concern-options">
              <label
                v-for="opt in CONCERN_OPTIONS"
                :key="opt"
                class="concern-pill"
                :data-active="concern === opt"
              >
                <input
                  v-model="concern"
                  type="radio"
                  :value="opt"
                  class="visually-hidden"
                />
                <span>{{ opt }}</span>
              </label>
            </div>
            <input
              v-if="isOther"
              v-model="concernOther"
              class="field-input field-input--inline"
              type="text"
              placeholder="Describe the concern"
            />
          </fieldset>
        </section>
      </div>

      <footer class="sheet-foot">
        <button type="button" class="btn-ghost" @click="close">Cancel</button>
        <button
          type="button"
          class="btn-primary"
          :disabled="flagInvalid"
          @click="onSubmit"
        >
          Mark complete
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
  background: var(--surface, #1a1a2e);
  border-radius: 18px 18px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

@media (min-width: 768px) {
  .sheet-backdrop { align-items: center; }
  .sheet {
    border-radius: 14px;
    max-height: 80vh;
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
  font-weight: 650;
  margin: 0;
  color: var(--text);
}
.sheet-sub {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 2px 0 0;
}
.sheet-close {
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.sheet-body {
  padding: 12px 18px 18px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-muted);
}
.field-input {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text);
  font-size: 0.92rem;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}
.field-input:focus {
  outline: none;
  border-color: var(--accent, #818cf8);
}
.field-input--textarea {
  resize: vertical;
  min-height: 76px;
}
.field-input--inline { margin-top: 8px; }
.field-input--search { padding-left: 34px; }
.search-wrap { position: relative; }
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.flag-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.flag-toggle__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(250, 204, 21, 0.12);
  border: 1px solid rgba(250, 204, 21, 0.4);
  color: #fde047;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
}
.flag-toggle__btn[data-on='true'] {
  background: rgba(250, 204, 21, 0.22);
}
.flag-toggle__hint {
  margin: 0;
  font-size: 0.74rem;
  color: var(--text-muted);
}

.flag-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: rgba(250, 204, 21, 0.05);
  border: 1px solid rgba(250, 204, 21, 0.18);
  border-radius: 12px;
}

.beneficiary-list {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bn-state {
  margin: 8px 0;
  text-align: center;
  font-size: 0.82rem;
  color: var(--text-muted);
}
.bn-state--error { color: #fca5a5; }
.bn-row {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text);
  cursor: pointer;
}
.bn-row:hover { background: rgba(255, 255, 255, 0.03); }
.bn-row[data-selected='true'] {
  background: rgba(129, 140, 248, 0.14);
  border-color: var(--accent, #818cf8);
}
.bn-row__icon {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.bn-row__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.bn-row__name { font-size: 0.88rem; font-weight: 500; }
.bn-row__meta { font-size: 0.74rem; color: var(--text-muted); }

.concern-group {
  border: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.concern-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.concern-pill {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  font-size: 0.8rem;
  cursor: pointer;
  color: var(--text);
}
.concern-pill[data-active='true'] {
  background: rgba(129, 140, 248, 0.18);
  border-color: var(--accent, #818cf8);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.sheet-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 18px;
  border-top: 1px solid var(--border, rgba(255, 255, 255, 0.06));
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
.btn-primary {
  background: var(--accent, #818cf8);
  color: #fff;
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
