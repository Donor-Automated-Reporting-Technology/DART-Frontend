<template>
  <!--
    Step2Framework.vue — Onboarding Step 2
    Framework setup: type, project name, partner, reporting to, period.
    Calls POST /api/v1/onboarding/framework on save.
  -->
  <div class="s2-wrap">

    <!-- Success message -->
    <div v-if="successMsg" class="success-bar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      {{ successMsg }}
    </div>

    <!-- API error -->
    <p v-if="apiError" class="api-err">{{ apiError }}</p>

    <p class="hint">Set up your project framework. This determines which activities are available.</p>

    <form class="fw-form" novalidate @submit.prevent="save">

      <!-- Framework Type -->
      <div class="field">
        <label class="field-label" for="s2-type">
          Framework type <span class="req">*</span>
        </label>
        <div class="select-wrap">
          <select
            id="s2-type"
            v-model="form.framework_type"
            class="field-select"
            :class="{ 'is-error': errors.framework_type }"
          >
            <option value="" disabled>Select a framework…</option>
            <option v-for="ft in frameworkTypes" :key="ft.value" :value="ft.value">
              {{ ft.label }}
            </option>
          </select>
          <svg class="select-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <span v-if="errors.framework_type" class="err-msg">{{ errors.framework_type }}</span>
      </div>

      <!-- Project Name -->
      <div class="field">
        <label class="field-label" for="s2-project">
          Project name <span class="req">*</span>
        </label>
        <input
          id="s2-project"
          v-model="form.project_name"
          type="text"
          class="field-input"
          :class="{ 'is-error': errors.project_name }"
          placeholder="e.g. DRA SSJR 2024-2026"
        />
        <span v-if="errors.project_name" class="err-msg">{{ errors.project_name }}</span>
      </div>

      <!-- Two-column: Partner + Reporting To -->
      <div class="two-col">
        <div class="field">
          <label class="field-label" for="s2-partner">
            Partner name <span class="req">*</span>
          </label>
          <input
            id="s2-partner"
            v-model="form.partner_name"
            type="text"
            class="field-input"
            :class="{ 'is-error': errors.partner_name }"
            placeholder="e.g. SSWOCO"
          />
          <span v-if="errors.partner_name" class="err-msg">{{ errors.partner_name }}</span>
        </div>

        <div class="field">
          <label class="field-label" for="s2-reporting">
            Reporting to <span class="req">*</span>
          </label>
          <input
            id="s2-reporting"
            v-model="form.reporting_to"
            type="text"
            class="field-input"
            :class="{ 'is-error': errors.reporting_to }"
            placeholder="e.g. War Child Holland"
          />
          <span v-if="errors.reporting_to" class="err-msg">{{ errors.reporting_to }}</span>
        </div>
      </div>

      <!-- Two-column: Period Start + End -->
      <div class="two-col">
        <div class="field">
          <label class="field-label" for="s2-start">
            Period start <span class="req">*</span>
          </label>
          <input
            id="s2-start"
            v-model="form.period_start"
            type="date"
            class="field-input"
            :class="{ 'is-error': errors.period_start }"
          />
          <span v-if="errors.period_start" class="err-msg">{{ errors.period_start }}</span>
        </div>

        <div class="field">
          <label class="field-label" for="s2-end">
            Period end <span class="req">*</span>
          </label>
          <input
            id="s2-end"
            v-model="form.period_end"
            type="date"
            class="field-input"
            :class="{ 'is-error': errors.period_end }"
          />
          <span v-if="errors.period_end" class="err-msg">{{ errors.period_end }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button type="submit" class="btn-primary" :disabled="isSaving">
          <span v-if="isSaving" class="btn-spinner" />
          {{ isSaving ? 'Saving\u2026' : 'Save and continue' }}
          <svg v-if="!isSaving" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '../../../stores/auth'
import { setupFramework } from '../../../services/onboardingApi'
import { ApiError } from '../../../services/api'
import type { FrameworkType } from '../../../interfaces/framework'

const emit = defineEmits<{ (e: 'complete'): void }>()

const authStore = useAuthStore()

// \u2500\u2500 Framework type options \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const frameworkTypes: Array<{ value: FrameworkType; label: string }> = [
  { value: 'child_protection', label: 'Child Protection' },
  { value: 'education',        label: 'Education' },
  { value: 'health',           label: 'Health' },
  { value: 'wash',             label: 'WASH' },
  { value: 'livelihoods',      label: 'Livelihoods' },
]

// \u2500\u2500 Form state \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

interface FrameworkForm {
  framework_type: FrameworkType | ''
  project_name: string
  partner_name: string
  reporting_to: string
  period_start: string
  period_end: string
}

const form = reactive<FrameworkForm>({
  framework_type: '',
  project_name: '',
  partner_name: '',
  reporting_to: '',
  period_start: '',
  period_end: '',
})

const errors = reactive<Partial<Record<keyof FrameworkForm, string>>>({})
const apiError   = ref('')
const successMsg = ref('')
const isSaving   = ref(false)

// \u2500\u2500 Validation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function validate(): boolean {
  Object.keys(errors).forEach(k => delete errors[k as keyof typeof errors])
  let ok = true

  if (!form.framework_type) {
    errors.framework_type = 'Please select a framework type'
    ok = false
  }
  if (!form.project_name.trim()) {
    errors.project_name = 'Project name is required'
    ok = false
  }
  if (!form.partner_name.trim()) {
    errors.partner_name = 'Partner name is required'
    ok = false
  }
  if (!form.reporting_to.trim()) {
    errors.reporting_to = 'Reporting to is required'
    ok = false
  }
  if (!form.period_start) {
    errors.period_start = 'Start date is required'
    ok = false
  }
  if (!form.period_end) {
    errors.period_end = 'End date is required'
    ok = false
  }
  if (form.period_start && form.period_end && form.period_start >= form.period_end) {
    errors.period_end = 'End date must be after start date'
    ok = false
  }

  return ok
}

// \u2500\u2500 Save \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

async function save() {
  apiError.value   = ''
  successMsg.value = ''
  if (!validate()) return

  isSaving.value = true
  try {
    await setupFramework(
      {
        framework_type: form.framework_type as string,
        project_name: form.project_name.trim(),
        partner_name: form.partner_name.trim(),
        reporting_to: form.reporting_to.trim(),
        period_start: form.period_start,
        period_end: form.period_end,
      },
      authStore.accessToken ?? undefined,
    )
    successMsg.value = 'Framework created \u2014 activities loaded for configuration'
    await new Promise(r => setTimeout(r, 800))
    emit('complete')
  } catch (e: any) {
    if (e instanceof ApiError && e.data?.errors) {
      Object.assign(errors, e.data.errors)
    } else {
      apiError.value = e?.message ?? 'Failed to save framework \u2014 please try again'
    }
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.s2-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 600px;
}

.hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.fw-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 480px) { .two-col { grid-template-columns: 1fr; } }

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

.req { color: var(--error); font-weight: 500; }

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
.field-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }
.field-input.is-error { border-color: var(--error); }

.select-wrap {
  position: relative;
}

.field-select {
  width: 100%;
  padding: 7px 30px 7px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.82rem;
  appearance: none;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.field-select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }
.field-select.is-error { border-color: var(--error); }

.select-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.err-msg {
  font-size: 0.72rem;
  color: var(--error);
  margin-top: 1px;
}

.success-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  background: var(--success-bg);
  border: 1px solid var(--success);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--third);
}

.api-err {
  margin: 0;
  padding: 9px 12px;
  background: var(--error-bg);
  border: 1px solid var(--error);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--error);
}

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
