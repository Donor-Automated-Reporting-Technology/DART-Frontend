<script setup lang="ts">
/**
 * PssActivityForm — modal form for creating a custom PSS activity.
 *
 * Jira: DART-29 (sub-task of DART-36).
 *
 * Triggered from the activity picker (DART-38) when the facilitator
 * taps '+ Create New Activity' for a slot the seeded UNICEF activities
 * (DART-27) don't cover.
 *
 * Persistence path
 * ----------------
 * Online:
 *   1. POST /api/v1/pss/sub-activities via usePssApi (DART-66).
 *   2. Write the server-blessed record to pss_activities IndexedDB
 *      cache (syncStatus = 'synced').
 *   3. Emit `created` with the record so the picker can pre-select it.
 *
 * Offline (or when the POST fails for a non-validation reason):
 *   1. Write a local-only record to pss_activities with a fresh
 *      client UUID and syncStatus = 'pending'.
 *   2. Enqueue a `pss_activities` create on the sync queue (DART-68);
 *      the queue stores the same idempotency key as the record's
 *      clientId so peer (DART-30) can replay safely on reconnect.
 *   3. Emit `created` immediately so the user can keep building the
 *      schedule without waiting for the network.
 *
 * Validation
 * ----------
 * Inline, mirrored from the DART-61 contract:
 *   • name        — required, 1–255 chars
 *   • description — required, ≥1 char
 *   • category    — required, one of Play / Wellbeing / Learn
 *   • ageGroup    — required, one of 6-10 / 11-14 / 15-17 / all / parents
 *
 * Server-side 422 errors arrive on `PssApiError.fields`; we surface
 * them inline keyed on the same field name so the user can correct and
 * resubmit without losing context.
 *
 * What this component does NOT do
 *   • No router calls — `update:open` returns control to the caller.
 *   • No picker re-open coordination — the picker (DART-38) owns the
 *     `presetActivityId` flow and re-opens itself with the returned
 *     record's clientId.
 */

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { X, AlertTriangle, Loader2 } from 'lucide-vue-next'
import type {
  PssActivityRecord,
  PssActivityCategory,
  PssActivityAgeGroup,
} from '../../interfaces/pssDb'
import type { PssApiError } from '../../interfaces/pss'
import { usePssApi } from '../../composables/usePssApi'
import { activitiesRepository } from '../../services/pss/repositories'
import { enqueue as enqueueSync } from '../../composables/usePssSyncQueue'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  /** Visibility (v-model:open). */
  open: boolean
  /**
   * CFS location id the new activity will belong to. Required by the
   * server; the calling page (schedule wizard) supplies it from its
   * draft schedule. Stored on the local record as `cfsId`.
   */
  cfsLocationId: string
  /**
   * Optional preselected category — when the picker opens this form
   * after the user already chose the Play/Wellbeing/Learn tab, we
   * pre-fill so they don't have to re-pick.
   */
  defaultCategory?: PssActivityCategory | null
  /**
   * Optional preselected age group — same rationale (the picker is
   * already filtered by the section's age group).
   */
  defaultAgeGroup?: PssActivityAgeGroup | null
}

const props = withDefaults(defineProps<Props>(), {
  defaultCategory: null,
  defaultAgeGroup: null,
})

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void
  /** Fired with the new local record (synced or pending). */
  (e: 'created', activity: PssActivityRecord): void
}>()

// ─── Form state ─────────────────────────────────────────────────────────────

const NAME_MAX = 255

const name = ref<string>('')
const description = ref<string>('')
const category = ref<PssActivityCategory | ''>('')
const ageGroup = ref<PssActivityAgeGroup | ''>('')

const isSubmitting = ref<boolean>(false)
/** Map of field-name → error message, blended from client + server. */
const fieldErrors = ref<Record<string, string>>({})
/** Top-of-form banner message (network failures, unknown errors). */
const formError = ref<string | null>(null)

const nameInputEl = ref<HTMLInputElement | null>(null)

// Auto-id'd stable suffix for label/aria-describedby — avoids collisions
// when multiple instances of the form get teleported in tests.
const fieldId = `pss-activity-form-${Math.random().toString(36).slice(2, 9)}`

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: ReadonlyArray<{
  value: PssActivityCategory
  label: string
}> = [
  { value: 'play', label: 'Play' },
  { value: 'wellbeing', label: 'Wellbeing' },
  { value: 'learn', label: 'Learn' },
]

const AGE_GROUP_OPTIONS: ReadonlyArray<{
  value: PssActivityAgeGroup
  label: string
}> = [
  { value: '6-10', label: 'Age 6–10' },
  { value: '11-14', label: 'Age 11–14' },
  { value: '15-17', label: 'Age 15–17' },
  { value: 'all', label: 'All ages' },
  { value: 'parents', label: 'Parents / Caregivers' },
]

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Run the local rules. Returns the same `Record<string,string>` shape
 * as the server's `PssApiError.fields` so the renderer doesn't care
 * which side raised the issue.
 */
function validateLocal(): Record<string, string> {
  const errs: Record<string, string> = {}
  const trimmedName = name.value.trim()
  if (!trimmedName) errs.name = 'Name is required.'
  else if (trimmedName.length > NAME_MAX)
    errs.name = `Name must be ${NAME_MAX} characters or fewer.`

  if (!description.value.trim())
    errs.description = 'Description is required.'

  if (!category.value)
    errs.category = 'Choose a category.'

  if (!ageGroup.value)
    errs.ageGroup = 'Choose an age group.'

  return errs
}

const isValid = computed(
  () => Object.keys(validateLocal()).length === 0 && !isSubmitting.value,
)

// ─── Open / close lifecycle ────────────────────────────────────────────────

let previousBodyOverflow: string | null = null

function lockBodyScroll(): void {
  if (typeof document === 'undefined') return
  if (previousBodyOverflow !== null) return
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return
  if (previousBodyOverflow === null) return
  document.body.style.overflow = previousBodyOverflow
  previousBodyOverflow = null
}

function resetForm(): void {
  name.value = ''
  description.value = ''
  category.value = props.defaultCategory ?? ''
  ageGroup.value = props.defaultAgeGroup ?? ''
  fieldErrors.value = {}
  formError.value = null
  isSubmitting.value = false
}

watch(
  () => props.open,
  async (isOpen, wasOpen) => {
    if (isOpen && !wasOpen) {
      resetForm()
      lockBodyScroll()
      await nextTick()
      nameInputEl.value?.focus()
    } else if (!isOpen && wasOpen) {
      unlockBodyScroll()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  unlockBodyScroll()
})

// ─── Submission ────────────────────────────────────────────────────────────

const api = usePssApi()

interface CreateSubActivityPayload {
  name: string
  description: string
  category: PssActivityCategory
  age_group: PssActivityAgeGroup
  cfs_location_id: string
}

interface CreateSubActivityResponse {
  id: string
  name: string
  description: string
  category: PssActivityCategory
  age_group: PssActivityAgeGroup
  steps?: string[] | null
  materials?: string | null
  conclusion?: string | null
  attention_note?: string | null
  cfs_location_id: string | null
  created_by: string | null
}

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Build the local PssActivityRecord we will write to IndexedDB. When
 * `serverRow` is supplied (online success path) we mirror its server
 * id; otherwise we ship a `clientId`-only record marked `pending`.
 */
function buildLocalRecord(
  clientId: string,
  serverRow: CreateSubActivityResponse | null,
): PssActivityRecord {
  const cat = (serverRow?.category ?? category.value) as PssActivityCategory
  const ag = (serverRow?.age_group ?? ageGroup.value) as PssActivityAgeGroup
  return {
    id: serverRow?.id ?? clientId,
    clientId,
    serverId: serverRow?.id ?? null,
    syncStatus: serverRow ? 'synced' : 'pending',
    clientTimestamp: nowIso(),
    name: (serverRow?.name ?? name.value).trim(),
    description: (serverRow?.description ?? description.value).trim(),
    category: cat,
    ageGroup: ag,
    source: 'custom',
    steps: serverRow?.steps ?? [],
    materials: serverRow?.materials ?? '',
    conclusion: serverRow?.conclusion ?? '',
    attentionNote: serverRow?.attention_note ?? '',
    cfsId: serverRow?.cfs_location_id ?? props.cfsLocationId,
    createdBy: serverRow?.created_by ?? null,
  }
}

async function persistOfflineAndEnqueue(
  clientId: string,
  payload: CreateSubActivityPayload,
): Promise<PssActivityRecord> {
  const local = buildLocalRecord(clientId, null)
  await activitiesRepository.upsert(local)
  // The idempotency key is intentionally === clientId so DART-30's
  // replay is deterministic across retries / app restarts.
  await enqueueSync({
    resource: 'pss_activities',
    operation: 'create',
    recordClientId: clientId,
    payload,
    idempotencyKey: clientId,
  })
  return local
}

function isPssApiError(err: unknown): err is PssApiError {
  return (
    !!err &&
    typeof err === 'object' &&
    'status' in err &&
    'code' in err &&
    'message' in err
  )
}

async function onSubmit(): Promise<void> {
  if (isSubmitting.value) return
  formError.value = null
  const localErrs = validateLocal()
  fieldErrors.value = localErrs
  if (Object.keys(localErrs).length > 0) {
    // Focus the first invalid field for accessibility.
    await nextTick()
    const firstInvalid = document.querySelector<HTMLElement>(
      `[data-pss-form-id="${fieldId}"] [aria-invalid="true"]`,
    )
    firstInvalid?.focus()
    return
  }

  isSubmitting.value = true

  const clientId = uuidv4()
  const payload: CreateSubActivityPayload = {
    name: name.value.trim(),
    description: description.value.trim(),
    category: category.value as PssActivityCategory,
    age_group: ageGroup.value as PssActivityAgeGroup,
    cfs_location_id: props.cfsLocationId,
  }

  // Offline shortcut — skip the POST and go straight to the local + queue
  // path so the user is not blocked by an obviously-doomed network call.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    try {
      const local = await persistOfflineAndEnqueue(clientId, payload)
      emit('created', local)
      close()
    } catch (err) {
      formError.value =
        err instanceof Error
          ? err.message
          : 'Could not save the activity locally.'
    } finally {
      isSubmitting.value = false
    }
    return
  }

  try {
    // Reuse the clientId as the Idempotency-Key so a retry triggered by
    // either the inline POST OR the queued replay (DART-30) collapses
    // server-side onto the same row.
    const serverRow = await api.post<CreateSubActivityResponse>(
      '/pss/sub-activities',
      payload,
      { idempotencyKey: clientId },
    )
    const local = buildLocalRecord(clientId, serverRow)
    await activitiesRepository.upsert(local)
    emit('created', local)
    close()
  } catch (err) {
    if (isPssApiError(err)) {
      // 422 → show inline field errors and stay open.
      if (err.status === 422 && err.fields) {
        // The server contract uses snake_case field names — map back
        // to our local form field names so the renderer can key on
        // `fieldErrors[fieldName]` directly.
        const mapped: Record<string, string> = {}
        for (const [k, v] of Object.entries(err.fields)) {
          if (k === 'age_group') mapped.ageGroup = v
          else if (k === 'cfs_location_id') mapped.form = v
          else mapped[k] = v
        }
        fieldErrors.value = mapped
        if (mapped.form) formError.value = mapped.form
        isSubmitting.value = false
        return
      }
      // Network / 5xx / offline detected mid-flight → fall back to the
      // local + queue path so the user is never stuck.
      if (err.status === 0 || err.status >= 500) {
        try {
          const local = await persistOfflineAndEnqueue(clientId, payload)
          emit('created', local)
          close()
          return
        } catch (innerErr) {
          formError.value =
            innerErr instanceof Error
              ? innerErr.message
              : 'Could not save the activity locally.'
          isSubmitting.value = false
          return
        }
      }
      // Other 4xx (auth, conflict) — surface message and stay open.
      formError.value = err.message
    } else {
      formError.value =
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
    }
    isSubmitting.value = false
  }
}

function close(): void {
  if (!props.open) return
  emit('update:open', false)
}

function onPanelKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && !isSubmitting.value) {
    event.preventDefault()
    close()
  }
}

const titleId = `${fieldId}-title`
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="pss-form__backdrop"
      role="presentation"
      @click.self="close"
    >
      <form
        class="pss-form__panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :data-pss-form-id="fieldId"
        @keydown="onPanelKeydown"
        @submit.prevent="onSubmit"
      >
        <!-- ── Header ─────────────────────────────────────────────── -->
        <header class="pss-form__header">
          <h2 :id="titleId" class="pss-form__title">Create New Activity</h2>
          <button
            type="button"
            class="pss-form__close"
            aria-label="Close form"
            :disabled="isSubmitting"
            @click="close"
          >
            <X :size="20" aria-hidden="true" />
          </button>
        </header>

        <!-- ── Top-of-form error banner ───────────────────────────── -->
        <div
          v-if="formError"
          class="pss-form__error"
          role="alert"
        >
          <AlertTriangle :size="18" aria-hidden="true" />
          <span>{{ formError }}</span>
        </div>

        <!-- ── Body ───────────────────────────────────────────────── -->
        <div class="pss-form__body">
          <!-- Name -->
          <div class="pss-form__field">
            <label :for="`${fieldId}-name`" class="pss-form__label">
              Name <span class="pss-form__required">*</span>
            </label>
            <input
              :id="`${fieldId}-name`"
              ref="nameInputEl"
              v-model="name"
              type="text"
              :maxlength="NAME_MAX"
              autocomplete="off"
              spellcheck="true"
              class="pss-form__input"
              :class="{ 'pss-form__input--error': fieldErrors.name }"
              :aria-invalid="!!fieldErrors.name"
              :aria-describedby="fieldErrors.name ? `${fieldId}-name-err` : undefined"
              :disabled="isSubmitting"
            />
            <p
              v-if="fieldErrors.name"
              :id="`${fieldId}-name-err`"
              class="pss-form__field-error"
            >
              {{ fieldErrors.name }}
            </p>
          </div>

          <!-- Description -->
          <div class="pss-form__field">
            <label :for="`${fieldId}-desc`" class="pss-form__label">
              Description <span class="pss-form__required">*</span>
            </label>
            <textarea
              :id="`${fieldId}-desc`"
              v-model="description"
              rows="4"
              spellcheck="true"
              class="pss-form__textarea"
              :class="{ 'pss-form__input--error': fieldErrors.description }"
              :aria-invalid="!!fieldErrors.description"
              :aria-describedby="fieldErrors.description ? `${fieldId}-desc-err` : undefined"
              :disabled="isSubmitting"
              placeholder="Facilitator instructions shown during the session…"
            />
            <p
              v-if="fieldErrors.description"
              :id="`${fieldId}-desc-err`"
              class="pss-form__field-error"
            >
              {{ fieldErrors.description }}
            </p>
          </div>

          <!-- Category (radio group) -->
          <fieldset
            class="pss-form__field pss-form__fieldset"
            :aria-invalid="!!fieldErrors.category"
            :aria-describedby="fieldErrors.category ? `${fieldId}-cat-err` : undefined"
          >
            <legend class="pss-form__label">
              Category <span class="pss-form__required">*</span>
            </legend>
            <div class="pss-form__radio-row">
              <label
                v-for="opt in CATEGORY_OPTIONS"
                :key="opt.value"
                class="pss-form__radio"
                :class="{ 'pss-form__radio--active': category === opt.value }"
              >
                <input
                  v-model="category"
                  type="radio"
                  name="category"
                  :value="opt.value"
                  :disabled="isSubmitting"
                  :aria-invalid="!!fieldErrors.category"
                />
                <span>{{ opt.label }}</span>
              </label>
            </div>
            <p
              v-if="fieldErrors.category"
              :id="`${fieldId}-cat-err`"
              class="pss-form__field-error"
            >
              {{ fieldErrors.category }}
            </p>
          </fieldset>

          <!-- Age group (single-select via styled radio chips) -->
          <fieldset
            class="pss-form__field pss-form__fieldset"
            :aria-invalid="!!fieldErrors.ageGroup"
            :aria-describedby="fieldErrors.ageGroup ? `${fieldId}-age-err` : undefined"
          >
            <legend class="pss-form__label">
              Age group <span class="pss-form__required">*</span>
            </legend>
            <div class="pss-form__chip-row">
              <label
                v-for="opt in AGE_GROUP_OPTIONS"
                :key="opt.value"
                class="pss-form__chip"
                :class="{ 'pss-form__chip--active': ageGroup === opt.value }"
              >
                <input
                  v-model="ageGroup"
                  type="radio"
                  name="ageGroup"
                  :value="opt.value"
                  :disabled="isSubmitting"
                  :aria-invalid="!!fieldErrors.ageGroup"
                />
                <span>{{ opt.label }}</span>
              </label>
            </div>
            <p
              v-if="fieldErrors.ageGroup"
              :id="`${fieldId}-age-err`"
              class="pss-form__field-error"
            >
              {{ fieldErrors.ageGroup }}
            </p>
          </fieldset>
        </div>

        <!-- ── Footer ─────────────────────────────────────────────── -->
        <footer class="pss-form__footer">
          <button
            type="button"
            class="pss-form__btn pss-form__btn--ghost"
            :disabled="isSubmitting"
            @click="close"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="pss-form__btn pss-form__btn--primary"
            :disabled="!isValid"
          >
            <Loader2
              v-if="isSubmitting"
              :size="16"
              class="pss-form__spin"
              aria-hidden="true"
            />
            <span>{{ isSubmitting ? 'Saving…' : 'Save' }}</span>
          </button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ───────────────────────────────────────────────────────────── */
.pss-form__backdrop {
  position: fixed;
  inset: 0;
  z-index: 1010;     /* above PssActivityPicker (1000) */
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.pss-form__panel {
  width: 100%;
  max-height: 92vh;
  background: #1a1a2e;
  color: #e5e7eb;
  border: 1px solid #27273a;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

@media (min-width: 768px) {
  .pss-form__backdrop {
    align-items: center;
    padding: 24px;
  }
  .pss-form__panel {
    max-width: 520px;
    max-height: 86vh;
    border-radius: 16px;
  }
}

/* ── Header ────────────────────────────────────────────────────────────── */
.pss-form__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 8px;
  border-bottom: 1px solid #27273a;
}

.pss-form__title {
  flex: 1;
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #f3f4f6;
}

.pss-form__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: transparent;
  color: #d1d5db;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  padding: 0;
}

.pss-form__close:hover:not(:disabled),
.pss-form__close:focus-visible {
  background: rgba(255, 255, 255, 0.06);
  border-color: #3a3a52;
  outline: none;
}

.pss-form__close:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Banner ────────────────────────────────────────────────────────────── */
.pss-form__error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin: 8px 16px;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(220, 38, 38, 0.4);
  border-radius: 8px;
  color: #fecaca;
  font-size: 13px;
}

/* ── Body / fields ─────────────────────────────────────────────────────── */
.pss-form__body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  -webkit-overflow-scrolling: touch;
}

.pss-form__field { display: flex; flex-direction: column; gap: 6px; }

.pss-form__fieldset {
  border: none;
  margin: 0;
  padding: 0;
}

.pss-form__label {
  font-size: 13px;
  font-weight: 600;
  color: #c7d2fe;
  letter-spacing: 0.01em;
}

.pss-form__required { color: #fca5a5; }

.pss-form__input,
.pss-form__textarea {
  width: 100%;
  background: #0f0f1a;
  color: #f3f4f6;
  border: 1px solid #27273a;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: vertical;
}

.pss-form__input { height: 44px; }
.pss-form__textarea { min-height: 96px; line-height: 1.4; }

.pss-form__input:focus,
.pss-form__textarea:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.4);
}

.pss-form__input::placeholder,
.pss-form__textarea::placeholder {
  color: #6b7280;
}

.pss-form__input--error {
  border-color: #b91c1c;
}

.pss-form__input--error:focus {
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.4);
}

.pss-form__input:disabled,
.pss-form__textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pss-form__field-error {
  margin: 0;
  font-size: 12px;
  color: #fca5a5;
}

/* ── Radio + chip groups ──────────────────────────────────────────────── */
.pss-form__radio-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.pss-form__chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pss-form__radio,
.pss-form__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 6px 10px;
  background: #0f0f1a;
  color: #d1d5db;
  border: 1px solid #27273a;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}

.pss-form__chip {
  /* Chips wrap freely; ensure they have a comfortable hit area. */
  flex: 1 1 auto;
  min-width: 88px;
}

.pss-form__radio input,
.pss-form__chip input {
  /* Visually hidden but keyboard-accessible. */
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.pss-form__radio:hover:not(:has(input:disabled)),
.pss-form__chip:hover:not(:has(input:disabled)) {
  background: #1f1f33;
  border-color: #3a3a52;
}

.pss-form__radio:has(input:focus-visible),
.pss-form__chip:has(input:focus-visible) {
  border-color: #818cf8;
  box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.4);
}

.pss-form__radio--active,
.pss-form__chip--active {
  background: #312e81;
  color: #ffffff;
  border-color: #818cf8;
}

.pss-form__radio:has(input:disabled),
.pss-form__chip:has(input:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Footer ────────────────────────────────────────────────────────────── */
.pss-form__footer {
  display: flex;
  gap: 8px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0));
  border-top: 1px solid #27273a;
  background: #14141f;
}

.pss-form__btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 44px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}

.pss-form__btn--ghost {
  background: transparent;
  color: #d1d5db;
  border-color: #3a3a52;
}

.pss-form__btn--ghost:hover:not(:disabled),
.pss-form__btn--ghost:focus-visible {
  background: rgba(255, 255, 255, 0.04);
  outline: none;
}

.pss-form__btn--primary {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
}

.pss-form__btn--primary:hover:not(:disabled),
.pss-form__btn--primary:focus-visible {
  background: #6366f1;
  outline: none;
}

.pss-form__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pss-form__spin {
  animation: pss-form-spin 1s linear infinite;
}

@keyframes pss-form-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Respect users that prefer no motion. */
@media (prefers-reduced-motion: reduce) {
  .pss-form__spin { animation: none; }
}

/* ── ≤360 px refinements ───────────────────────────────────────────────── */
@media (max-width: 360px) {
  .pss-form__title { font-size: 16px; }
  .pss-form__radio-row { grid-template-columns: 1fr; }
}
</style>
