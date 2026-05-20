<script setup lang="ts">
/**
 * PssCompleteSessionDialog — DART-37.
 *
 * Centered modal opened when the facilitator taps "Complete session"
 * on the checklist after marking every activity done. Captures the
 * required overall remarks and emits `submit`. The parent owns the
 * PATCH /pss/sessions/:id/complete call and the post-complete
 * navigation to the smiley evaluation screen (DART-34 / DART-42).
 */

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { Flag, X } from 'lucide-vue-next';

interface Props {
  open: boolean;
  /** Disables the submit button while the parent is awaiting the API. */
  submitting?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'submit', payload: { remarks: string }): void;
}>();

const remarks = ref('');
const remarksInput = ref<HTMLTextAreaElement | null>(null);
const titleId = `pss-complete-session-${Math.random().toString(36).slice(2, 9)}`;

const isValid = computed(() => remarks.value.trim().length > 0);

watch(
  () => props.open,
  async (open) => {
    if (open) {
      remarks.value = '';
      await nextTick();
      remarksInput.value?.focus();
    }
  },
);

function close(): void {
  if (props.submitting) return;
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
  });
}

function onSubmit(): void {
  if (!isValid.value || props.submitting) return;
  emit('submit', { remarks: remarks.value.trim() });
}
</script>

<template>
  <div
    v-if="open"
    class="dlg-backdrop"
    role="presentation"
    @click="onBackdrop"
  >
    <div
      class="dlg"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <header class="dlg-head">
        <div class="dlg-title-wrap">
          <span class="dlg-icon"><Flag :size="16" /></span>
          <h2 :id="titleId" class="dlg-title">Complete session</h2>
        </div>
        <button
          type="button"
          class="dlg-close"
          aria-label="Close"
          :disabled="submitting"
          @click="close"
        >
          <X :size="18" />
        </button>
      </header>

      <div class="dlg-body">
        <p class="dlg-hint">
          Add overall remarks for this session — what went well, anything
          worth noting for the supervisor. Required.
        </p>
        <label class="field">
          <span class="field-label">Remarks</span>
          <textarea
            ref="remarksInput"
            v-model="remarks"
            class="field-input"
            rows="5"
            placeholder="Good day overall, Mary very engaged…"
            :disabled="submitting"
          />
        </label>
        <p class="dlg-warn">
          Once you complete the session, no further edits are possible.
        </p>
      </div>

      <footer class="dlg-foot">
        <button
          type="button"
          class="btn-ghost"
          :disabled="submitting"
          @click="close"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn-primary"
          :disabled="!isValid || submitting"
          @click="onSubmit"
        >
          <span v-if="submitting" class="spinner" />
          {{ submitting ? 'Completing…' : 'Complete session' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.dlg-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.dlg {
  width: 100%;
  max-width: 480px;
  background: var(--surface, #1a1a2e);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.dlg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
}
.dlg-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dlg-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: rgba(74, 222, 128, 0.14);
  color: #4ade80;
}
.dlg-title {
  font-size: 1.05rem;
  font-weight: 650;
  margin: 0;
  color: var(--text);
}
.dlg-close {
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.dlg-close:disabled { opacity: 0.4; cursor: not-allowed; }

.dlg-body {
  padding: 14px 18px 6px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dlg-hint {
  margin: 0;
  font-size: 0.86rem;
  color: var(--text-muted);
  line-height: 1.5;
}
.dlg-warn {
  margin: 0;
  font-size: 0.74rem;
  color: #fde047;
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
  resize: vertical;
  min-height: 110px;
}
.field-input:focus {
  outline: none;
  border-color: var(--accent, #818cf8);
}
.field-input:disabled { opacity: 0.7; }

.dlg-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 16px;
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
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #4ade80;
  color: #052e16;
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.spinner {
  width: 11px;
  height: 11px;
  border: 2px solid rgba(5, 46, 22, 0.3);
  border-top-color: #052e16;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
