<template>
  <!--
    Step1OrgProfile.vue — Onboarding Step 1
    Organisation profile: read-only name/country + editable description + locations.
    Calls PUT /api/v1/organisations/:id on save.
  -->
  <div class="s1-wrap">

    <!-- Read-only org info -->
    <div class="readonly-row">
      <div class="readonly-field">
        <span class="ro-label">Organisation name</span>
        <span class="ro-value">{{ orgProfile?.name || authStore.orgName || '—' }}</span>
      </div>
      <div class="readonly-field">
        <span class="ro-label">Country</span>
        <span class="ro-value">{{ orgProfile?.country ?? '—' }}</span>
      </div>
    </div>

    <!-- Description -->
    <div class="field">
      <label class="field-label" for="s1-desc">
        Description
        <span class="optional">optional</span>
      </label>
      <textarea
        id="s1-desc"
        v-model="description"
        class="field-textarea"
        :class="{ 'is-error': errors.description }"
        placeholder="Brief description of your organisation…"
        maxlength="1000"
        rows="3"
      />
      <div class="textarea-meta">
        <span v-if="errors.description" class="err-msg">{{ errors.description }}</span>
        <span v-else class="char-count" :class="{ warn: description.length > 900 }">
          {{ description.length }}&thinsp;/&thinsp;1000
        </span>
      </div>
    </div>

    <!-- Operating locations -->
    <div class="field">
      <div class="locations-hd">
        <label class="field-label">
          Operating locations
          <span class="required">*</span>
        </label>
        <button type="button" class="add-loc-btn" @click="addLocation">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add location
        </button>
      </div>
      <span v-if="errors.locations" class="err-msg">{{ errors.locations }}</span>

      <div v-if="locations.length === 0" class="loc-empty">
        No locations yet — click <strong>Add location</strong> to start.
      </div>

      <div v-for="(loc, i) in locations" :key="i" class="loc-row">
        <div class="loc-inputs">
          <input
            v-model="loc.name"
            type="text"
            class="field-input loc-name"
            :class="{ 'is-error': locationErrors[i]?.name }"
            placeholder="Location name *"
          />
          <input
            v-model="loc.sector"
            type="text"
            class="field-input"
            placeholder="Sector"
          />
          <input
            v-model="loc.geographic_area"
            type="text"
            class="field-input"
            placeholder="Area"
          />
        </div>
        <span v-if="locationErrors[i]?.name" class="err-msg err-sm">{{ locationErrors[i].name }}</span>
        <button type="button" class="del-btn" @click="removeLocation(i)" aria-label="Remove location">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>

    <!-- API error -->
    <p v-if="apiError" class="api-err">{{ apiError }}</p>

    <!-- Actions -->
    <div class="actions">
      <button type="button" class="btn-primary" :disabled="isSaving" @click="save">
        <span v-if="isSaving" class="btn-spinner" />
        {{ isSaving ? 'Saving…' : 'Save and continue' }}
        <svg v-if="!isSaving" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useOnboardingStore } from '../../../stores/onboarding'
import { useAuthStore }       from '../../../stores/auth'
import { updateOrgProfile }   from '../../../services/onboardingApi'
import { ApiError }           from '../../../services/api'
import type { OperatingLocation } from '../../../interfaces/onboarding'

const emit = defineEmits<{ (e: 'complete'): void }>()

const onboardingStore = useOnboardingStore()
const authStore       = useAuthStore()
const orgProfile      = computed(() => onboardingStore.orgProfile)

// ── Form state ────────────────────────────────────────────────────────────────

const description     = ref('')
const locations       = reactive<OperatingLocation[]>([])
const errors          = reactive<Record<string, string>>({})
const locationErrors  = reactive<Record<number, Record<string, string>>>({})
const apiError        = ref('')
const isSaving        = ref(false)

// ── Seed from store ───────────────────────────────────────────────────────────

function seed() {
  if (!orgProfile.value) return
  description.value = orgProfile.value.description ?? ''
  locations.splice(0)
  for (const l of orgProfile.value.operating_locations ?? []) {
    locations.push({ id: l.id, name: l.name, sector: l.sector ?? '', geographic_area: l.geographic_area ?? '' })
  }
}

onMounted(seed)
watch(orgProfile, seed)

// ── Helpers ───────────────────────────────────────────────────────────────────

function addLocation() {
  locations.push({ name: '', sector: '', geographic_area: '' })
}

function removeLocation(i: number) {
  const l = locations[i]
  if ((l.name || l.sector || l.geographic_area) && !confirm('Remove this location?')) return
  locations.splice(i, 1)
  delete locationErrors[i]
}

// ── Validate ──────────────────────────────────────────────────────────────────

function validate(): boolean {
  Object.keys(errors).forEach(k => delete errors[k])
  Object.keys(locationErrors).forEach(k => delete locationErrors[Number(k)])
  let ok = true

  if (description.value.length > 1000) {
    errors.description = 'Must be 1 000 characters or fewer'
    ok = false
  }
  if (!locations.length) {
    errors.locations = 'At least one operating location is required'
    ok = false
  }
  locations.forEach((l, i) => {
    if (!l.name.trim()) {
      locationErrors[i] = { name: 'Name is required' }
      ok = false
    }
  })
  return ok
}

// ── Save ──────────────────────────────────────────────────────────────────────

async function save() {
  apiError.value = ''
  if (!validate()) return

  const orgId = authStore.orgId
  if (!orgId) { apiError.value = 'Organisation ID missing — please refresh'; return }

  isSaving.value = true
  try {
    await updateOrgProfile(orgId, {
      description: description.value || undefined,
      locations: locations.map(({ name, sector, geographic_area }) => ({
        name: name.trim(),
        sector: sector?.trim() || undefined,
        geographic_area: geographic_area?.trim() || undefined,
      })),
    })
    emit('complete')
  } catch (e: any) {
    if (e instanceof ApiError && e.data?.errors) Object.assign(errors, e.data.errors)
    else apiError.value = e?.message ?? 'Save failed — please try again'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
/* ── Wrapper ──────────────────────────────────────────────────────────────── */
.s1-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 580px;
}

/* ── Read-only row ────────────────────────────────────────────────────────── */
.readonly-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 480px) { .readonly-row { grid-template-columns: 1fr; } }

.readonly-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.ro-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.ro-value {
  font-size: 0.845rem;
  color: var(--text-muted);
  font-weight: 500;
}

/* ── Field ────────────────────────────────────────────────────────────────── */
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 5px;
}

.optional {
  font-size: 0.65rem;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-muted);
  opacity: 0.7;
}

.required { color: var(--error); font-weight: 500; }

/* ── Textarea ─────────────────────────────────────────────────────────────── */
.field-textarea {
  width: 100%;
  padding: 9px 11px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.845rem;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
  font-family: inherit;
}

.field-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
}

.field-textarea.is-error { border-color: var(--error); }

.textarea-meta {
  display: flex;
  justify-content: flex-end;
  min-height: 16px;
}

.char-count { font-size: 0.68rem; color: var(--text-muted); }
.char-count.warn { color: var(--warning); }

/* ── Locations header ─────────────────────────────────────────────────────── */
.locations-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.add-loc-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--primary-dim);
  border: 1px solid var(--primary);
  border-radius: var(--radius-sm);
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.add-loc-btn:hover { background: var(--primary-hover); }

/* ── Location empty ───────────────────────────────────────────────────────── */
.loc-empty {
  padding: 10px 12px;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  color: var(--text-muted);
  text-align: center;
}

/* ── Location row ─────────────────────────────────────────────────────────── */
.loc-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 6px;
}

.loc-inputs {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 6px;
  align-items: center;
}

@media (max-width: 560px) {
  .loc-inputs {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
  }
  .loc-name { grid-column: 1; }
}

/* ── Text input ───────────────────────────────────────────────────────────── */
.field-input {
  width: 100%;
  padding: 7px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.82rem;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
  font-family: inherit;
}

.field-input::placeholder { color: var(--text-muted); opacity: 0.7; }

.field-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
}

.field-input.is-error { border-color: var(--error); }

/* ── Delete button ────────────────────────────────────────────────────────── */
.del-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.del-btn:hover { color: var(--error); border-color: var(--error); }

/* ── Errors ───────────────────────────────────────────────────────────────── */
.err-msg {
  font-size: 0.72rem;
  color: var(--error);
  margin-top: 1px;
}

.err-sm { font-size: 0.68rem; }

.api-err {
  margin: 0;
  padding: 9px 12px;
  background: var(--error-bg);
  border: 1px solid var(--error);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--error);
}

/* ── Actions ──────────────────────────────────────────────────────────────── */
.actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 18px;
  height: 36px;
  background: var(--primary);
  border: none;
  border-radius: var(--radius-sm);
  color: #000;
  font-size: 0.845rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
}

.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(0,0,0,0.2);
  border-left-color: #000;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
