<script setup lang="ts">
/**
 * PssCompleteSessionDialog — DART-37.
 *
 * Multi-step facilitator report. Mirrors the beneficiary register flow:
 * Stepper at the top, one stage at a time, slide transitions, Review
 * stage before submit. Uses canonical design tokens from
 * design-system/DART_UX_REFERENCE.md.
 */

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { Flag, X, Check, Plus } from 'lucide-vue-next';
import BeneficiariesFormStepper from '../beneficiaries/FormStepper.vue';

interface Props {
  open: boolean;
  /** Disables submit while the parent awaits the API. */
  submitting?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (
    e: 'submit',
    payload: {
      key_observations: string;
      protection_notes: string;
      challenges: string;
      follow_up_actions: string[];
      reflection: string;
      remarks: string;
    },
  ): void;
}>();

const stepLabels = ['Observations', 'Outcomes', 'Follow-up', 'Review'];
const stepDescriptions = [
  'What did you notice today?',
  'Challenges and reflection.',
  'Next actions and any extra remarks.',
  'Review before completing the session.',
];

const step = ref(0);
const slideDir = ref<'slide-left' | 'slide-right'>('slide-left');

const keyObservations = ref('');
const protectionNotes = ref('');
const challenges = ref('');
const reflection = ref('');
const followUpActions = ref<string[]>(['']);
const remarks = ref('');
const firstInput = ref<HTMLTextAreaElement | null>(null);
const titleId = `pss-complete-session-${Math.random().toString(36).slice(2, 9)}`;

const cleanedFollowUp = computed(() =>
  followUpActions.value.map((s) => s.trim()).filter((s) => s.length > 0),
);

const stepValid = computed(() => [
  keyObservations.value.trim().length > 0 &&
    protectionNotes.value.trim().length > 0,
  challenges.value.trim().length > 0 && reflection.value.trim().length > 0,
  cleanedFollowUp.value.length > 0,
  true,
]);

const isValid = computed(() => stepValid.value.every(Boolean));

function next(): void {
  if (!stepValid.value[step.value]) return;
  if (step.value < stepLabels.length - 1) {
    slideDir.value = 'slide-left';
    step.value += 1;
  }
}

function prev(): void {
  if (step.value > 0) {
    slideDir.value = 'slide-right';
    step.value -= 1;
  }
}

function goToStep(target: number): void {
  if (target < step.value) {
    slideDir.value = 'slide-right';
    step.value = target;
  }
}

function addFollowUp(): void {
  followUpActions.value.push('');
}
function removeFollowUp(index: number): void {
  if (followUpActions.value.length <= 1) {
    followUpActions.value[0] = '';
    return;
  }
  followUpActions.value.splice(index, 1);
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      step.value = 0;
      slideDir.value = 'slide-left';
      keyObservations.value = '';
      protectionNotes.value = '';
      challenges.value = '';
      reflection.value = '';
      followUpActions.value = [''];
      remarks.value = '';
      // Lock background scroll so the page behind can't be interacted with.
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      await nextTick();
      firstInput.value?.focus();
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
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
    // Safety: always unlock scroll on teardown.
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });
}

function onSubmit(): void {
  if (!isValid.value || props.submitting) return;
  emit('submit', {
    key_observations: keyObservations.value.trim(),
    protection_notes: protectionNotes.value.trim(),
    challenges: challenges.value.trim(),
    follow_up_actions: cleanedFollowUp.value,
    reflection: reflection.value.trim(),
    remarks: remarks.value.trim(),
  });
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dlg-fade">
      <div
        v-if="open"
        class="dlg-backdrop"
        role="presentation"
        @click="onBackdrop"
      >
        <Transition name="dlg-scale">
          <div
            v-if="open"
            class="dlg"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
          >
            <header class="dlg-head">
              <div class="dlg-title-wrap">
                <span class="dlg-icon"><Flag :size="16" /></span>
                <div>
                  <h2 :id="titleId" class="dlg-title">Complete session</h2>
                  <p class="dlg-subtitle">{{ stepDescriptions[step] }}</p>
                </div>
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

            <div class="dlg-stepper">
              <BeneficiariesFormStepper
                :steps="stepLabels"
                :current="step"
                @go="goToStep"
              />
            </div>

            <form class="dlg-form" @submit.prevent>
              <div class="dlg-body">
                <Transition :name="slideDir" mode="out-in">
                  <!-- Stage 0: Observations -->
                  <div v-if="step === 0" key="observations" class="stage">
                    <label class="field">
                      <span class="field-label">Key observations <span class="req">*</span></span>
                      <textarea
                        ref="firstInput"
                        v-model="keyObservations"
                        class="field-input"
                        rows="4"
                        placeholder="What stood out about the children's participation, mood, group dynamics…"
                        :disabled="submitting"
                      />
                    </label>
                    <label class="field">
                      <span class="field-label">Protection notes <span class="req">*</span></span>
                      <textarea
                        v-model="protectionNotes"
                        class="field-input"
                        rows="3"
                        placeholder="Anything safeguarding-related to flag for the supervisor."
                        :disabled="submitting"
                      />
                    </label>
                  </div>

                  <!-- Stage 1: Outcomes -->
                  <div v-else-if="step === 1" key="outcomes" class="stage">
                    <label class="field">
                      <span class="field-label">Challenges <span class="req">*</span></span>
                      <textarea
                        v-model="challenges"
                        class="field-input"
                        rows="3"
                        placeholder="What got in the way today?"
                        :disabled="submitting"
                      />
                    </label>
                    <label class="field">
                      <span class="field-label">Reflection <span class="req">*</span></span>
                      <textarea
                        v-model="reflection"
                        class="field-input"
                        rows="4"
                        placeholder="What would you change next time? What worked?"
                        :disabled="submitting"
                      />
                    </label>
                  </div>

                  <!-- Stage 2: Follow-up -->
                  <div v-else-if="step === 2" key="followup" class="stage">
                    <div class="field">
                      <span class="field-label">Follow-up actions <span class="req">*</span></span>
                      <p class="field-hint">List concrete next steps — at least one is required.</p>
                      <ul class="list">
                        <li
                          v-for="(_, idx) in followUpActions"
                          :key="idx"
                          class="list-row"
                        >
                          <span class="list-num">{{ idx + 1 }}</span>
                          <input
                            v-model="followUpActions[idx]"
                            type="text"
                            class="field-input list-input"
                            :placeholder="`Follow-up action #${idx + 1}`"
                            :disabled="submitting"
                          />
                          <button
                            type="button"
                            class="list-remove"
                            :disabled="submitting"
                            aria-label="Remove follow-up"
                            @click="removeFollowUp(idx)"
                          >
                            <X :size="14" />
                          </button>
                        </li>
                      </ul>
                      <button
                        type="button"
                        class="list-add"
                        :disabled="submitting"
                        @click="addFollowUp"
                      >
                        <Plus :size="14" />
                        Add follow-up
                      </button>
                    </div>

                    <label class="field">
                      <span class="field-label">
                        Remarks <span class="opt">optional</span>
                      </span>
                      <textarea
                        v-model="remarks"
                        class="field-input"
                        rows="3"
                        placeholder="Anything else for the supervisor."
                        :disabled="submitting"
                      />
                    </label>
                  </div>

                  <!-- Stage 3: Review -->
                  <div v-else key="review" class="stage">
                    <div class="dlg-warn">
                      <Flag :size="14" />
                      Once you complete the session, no further edits are possible.
                    </div>
                    <dl class="review">
                      <div class="review-row">
                        <dt>Key observations</dt>
                        <dd>{{ keyObservations.trim() }}</dd>
                      </div>
                      <div class="review-row">
                        <dt>Protection notes</dt>
                        <dd>{{ protectionNotes.trim() }}</dd>
                      </div>
                      <div class="review-row">
                        <dt>Challenges</dt>
                        <dd>{{ challenges.trim() }}</dd>
                      </div>
                      <div class="review-row">
                        <dt>Reflection</dt>
                        <dd>{{ reflection.trim() }}</dd>
                      </div>
                      <div class="review-row">
                        <dt>Follow-up actions</dt>
                        <dd>
                          <ul class="review-list">
                            <li v-for="(a, i) in cleanedFollowUp" :key="i">{{ a }}</li>
                          </ul>
                        </dd>
                      </div>
                      <div v-if="remarks.trim()" class="review-row">
                        <dt>Remarks</dt>
                        <dd>{{ remarks.trim() }}</dd>
                      </div>
                    </dl>
                  </div>
                </Transition>
              </div>

              <footer class="dlg-foot">
                <button
                  v-if="step > 0"
                  type="button"
                  class="btn-ghost"
                  :disabled="submitting"
                  @click="prev"
                >
                  Back
                </button>
                <button
                  v-else
                  type="button"
                  class="btn-ghost"
                  :disabled="submitting"
                  @click="close"
                >
                  Cancel
                </button>

                <button
                  v-if="step < stepLabels.length - 1"
                  type="button"
                  class="btn-primary"
                  :disabled="!stepValid[step] || submitting"
                  @click="next"
                >
                  Continue
                </button>
                <button
                  v-else
                  type="button"
                  class="btn-primary btn-primary--finish"
                  :disabled="!isValid || submitting"
                  @click="onSubmit"
                >
                  <span v-if="submitting" class="spinner" />
                  <Check v-else :size="16" />
                  {{ submitting ? 'Completing…' : 'Complete session' }}
                </button>
              </footer>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ── */
.dlg-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  /* Block pointer events on anything behind the backdrop */
  isolation: isolate;
}

.dlg-fade-enter-active,
.dlg-fade-leave-active { transition: opacity 0.2s ease; }
.dlg-fade-enter-from,
.dlg-fade-leave-to { opacity: 0; }

.dlg-scale-enter-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.15, 1); }
.dlg-scale-leave-active { transition: all 0.2s ease-in; }
.dlg-scale-enter-from { opacity: 0; transform: translateY(16px) scale(0.97); }
.dlg-scale-leave-to { opacity: 0; transform: translateY(16px) scale(0.97); }

.dlg {
  width: 100%;
  max-width: 560px;
  max-height: 92vh;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-elevated);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dlg-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border-subtle);
}
.dlg-title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.dlg-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  background: var(--success-bg);
  color: var(--success);
  flex-shrink: 0;
}
.dlg-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
  line-height: 1.3;
}
.dlg-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 2px 0 0;
}
.dlg-close {
  border: none;
  background: transparent;
  color: var(--text-muted);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.dlg-close:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}
.dlg-close:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dlg-stepper {
  padding: 14px 20px 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.dlg-form {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.dlg-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.stage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Slide transitions — match beneficiaries register flow */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.15, 1);
}
.slide-left-enter-from {
  opacity: 0;
  transform: translateX(32px);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-32px);
}
.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-32px);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(32px);
}

/* Fields */
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.req {
  color: var(--error);
  margin-left: 2px;
}
.opt {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 500;
  margin-left: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.field-hint {
  margin: -2px 0 4px;
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.4;
}





/* Numbered list — follow-up actions */
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.list-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.list-num {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--primary-dim);
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 600;
}
.list-input {
  flex: 1;
  min-height: 44px;
}
.list-remove {
  flex-shrink: 0;
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s;
}
.list-remove:hover {
  border-color: var(--error);
  color: var(--error);
}
.list-remove:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.list-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  margin-top: 4px;
  background: transparent;
  border: 1px dashed var(--border-color);
  color: var(--text-secondary);
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.list-add:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.list-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Review stage */
.dlg-warn {
  margin: 0;
  padding: 10px 12px;
  background: var(--warning-bg);
  color: var(--warning);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.review {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.review-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-subtle);
}
.review-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.review-row dt {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}
.review-row dd {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.5;
  white-space: pre-wrap;
}
.review-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Footer */
.dlg-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 14px 20px 16px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-panel);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px 18px;
  min-height: 44px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-ghost:hover {
  border-color: var(--text-secondary);
  color: var(--text-primary);
}
.btn-ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--primary);
  color: #fff;
  border: 1px solid var(--primary);
  border-radius: var(--radius-md);
  padding: 10px 20px;
  min-height: 44px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
}
.btn-primary:hover {
  filter: brightness(1.08);
}
.btn-primary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.btn-primary--finish {
  background: var(--success, #22c55e);
  border-color: var(--success, #22c55e);
}
.btn-primary--finish:hover:not(:disabled) {
  filter: brightness(1.1);
}

/* Mobile */
@media (max-width: 600px) {
  .dlg-backdrop { padding: 0; align-items: flex-end; }
  .dlg {
    max-height: 96vh;
    max-width: 100%;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
  .dlg-foot { flex-direction: column-reverse; }
  .btn-ghost, .btn-primary { width: 100%; justify-content: center; }
}
</style>
