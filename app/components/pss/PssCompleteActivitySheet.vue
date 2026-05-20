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
import { AlertTriangle, X, Search, UserPlus, CheckCircle } from 'lucide-vue-next';
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
  <Teleport to="body">
    <Transition name="sheet-fade">
      <div
        v-if="open"
        class="sheet-backdrop"
        role="presentation"
        @click="onBackdrop"
      >
        <Transition name="sheet-slide">
          <div
            v-if="open"
            class="sheet"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
          >
            <header class="sheet-head">
              <div class="sheet-head__left">
                <span class="sheet-head__icon">
                  <CheckCircle :size="18" />
                </span>
                <div>
                  <h2 :id="titleId" class="sheet-title">Complete activity</h2>
                  <p class="sheet-sub">{{ activityName }}</p>
                </div>
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
                <span class="field-label">Notes <span class="opt">optional</span></span>
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

              <Transition name="expand">
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
              </Transition>
            </div>

            <footer class="sheet-foot">
              <button type="button" class="btn-ghost" @click="close">Cancel</button>
              <button
                type="button"
                class="btn-primary"
                :disabled="flagInvalid"
                @click="onSubmit"
              >
                <CheckCircle :size="16" />
                Mark complete
              </button>
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ── */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet-fade-enter-active,
.sheet-fade-leave-active { transition: opacity 0.2s ease; }
.sheet-fade-enter-from,
.sheet-fade-leave-to { opacity: 0; }

.sheet-slide-enter-active { transition: transform 0.3s cubic-bezier(0.4, 0, 0.15, 1); }
.sheet-slide-leave-active { transition: transform 0.2s ease-in; }
.sheet-slide-enter-from { transform: translateY(100%); }
.sheet-slide-leave-to { transform: translateY(100%); }

/* ── Sheet container ── */
.sheet {
  width: 100%;
  max-width: 560px;
  max-height: 92vh;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 18px 18px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

@media (min-width: 768px) {
  .sheet-backdrop { align-items: center; }
  .sheet {
    border-radius: 14px;
    max-height: 80vh;
    box-shadow: var(--shadow-elevated, 0 8px 32px rgba(0,0,0,0.2));
  }
  .sheet-slide-enter-from { transform: translateY(24px) scale(0.97); }
  .sheet-slide-leave-to { transform: translateY(24px) scale(0.97); }
}

/* ── Header ── */
.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border-color);
}
.sheet-head__left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.sheet-head__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--primary-dim, rgba(99, 102, 241, 0.12));
  color: var(--primary);
  flex-shrink: 0;
}
.sheet-title {
  font-size: 1.05rem;
  font-weight: 650;
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
  background: var(--hover-bg, rgba(0,0,0,0.04));
  color: var(--text-muted);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.sheet-close:hover {
  background: var(--bg-input);
  color: var(--text-primary);
}

/* ── Body ── */
.sheet-body {
  padding: 16px 20px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-secondary, var(--text-muted));
}
.opt {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 500;
  margin-left: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.field-input {
  background: var(--bg-input, var(--input-bg));
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 0.92rem;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring, var(--primary-dim));
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

/* ── Flag toggle ── */
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
  background: var(--warning-bg, rgba(250, 204, 21, 0.12));
  border: 1px solid var(--warning, rgba(250, 204, 21, 0.4));
  color: var(--warning, #eab308);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  transition: background 0.15s;
}
.flag-toggle__btn[data-on='true'] {
  background: color-mix(in srgb, var(--warning, #eab308) 18%, transparent);
}
.flag-toggle__hint {
  margin: 0;
  font-size: 0.74rem;
  color: var(--text-muted);
}

/* ── Expand transition ── */
.expand-enter-active { transition: all 0.25s ease-out; }
.expand-leave-active { transition: all 0.2s ease-in; }
.expand-enter-from,
.expand-leave-to { opacity: 0; transform: translateY(-8px); }

/* ── Flag block ── */
.flag-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: var(--warning-bg, rgba(250, 204, 21, 0.05));
  border: 1px solid color-mix(in srgb, var(--warning, #eab308) 22%, transparent);
  border-radius: 12px;
}

/* ── Beneficiary list ── */
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
.bn-state--error { color: var(--error); }
.bn-row {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-primary);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s, border-color 0.12s;
}
.bn-row:hover { background: var(--hover-bg); }
.bn-row[data-selected='true'] {
  background: var(--primary-dim, rgba(99, 102, 241, 0.12));
  border-color: var(--primary);
}
.bn-row__icon {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--bg-input);
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

/* ── Concern pills ── */
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
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  font-size: 0.8rem;
  cursor: pointer;
  color: var(--text-primary);
  transition: background 0.12s, border-color 0.12s;
}
.concern-pill[data-active='true'] {
  background: var(--primary-dim, rgba(99, 102, 241, 0.15));
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
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

/* ── Footer ── */
.sheet-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-panel);
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary, var(--text-muted));
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  min-height: 42px;
  transition: border-color 0.15s, color 0.15s;
}
.btn-ghost:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 9px 18px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  min-height: 42px;
  transition: filter 0.15s, transform 0.1s;
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
.btn-primary:active:not(:disabled) { transform: scale(0.98); }
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Mobile ── */
@media (max-width: 600px) {
  .sheet-foot { flex-direction: column-reverse; }
  .btn-ghost, .btn-primary { width: 100%; justify-content: center; }
}
</style>
