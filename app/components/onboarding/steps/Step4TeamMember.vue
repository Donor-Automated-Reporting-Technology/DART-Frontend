<template>
  <!--
    Step4TeamMember.vue — Onboarding Step 4
    Compact invite form: name + email/phone in a two-column row, role dropdown.
    Calls POST /api/v1/users on send. Skip marks step complete without an API call.
  -->
  <div class="s4-wrap">

    <!-- API error -->
    <p v-if="apiError" class="api-err">{{ apiError }}</p>

    <!-- Success -->
    <div v-if="successMsg" class="success-bar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      {{ successMsg }}
    </div>

    <!-- Form -->
    <form class="invite-form" novalidate @submit.prevent="send">

      <!-- Row: name + contact -->
      <div class="two-col">

        <!-- Full name -->
        <div class="field">
          <label class="field-label" for="s4-name">
            Full name <span class="req">*</span>
          </label>
          <input
            id="s4-name"
            v-model="form.full_name"
            type="text"
            class="field-input"
            :class="{ 'is-error': errors.full_name }"
            placeholder="e.g. Nyawelo Deng"
            autocomplete="name"
          />
          <span v-if="errors.full_name" class="err-msg">{{ errors.full_name }}</span>
        </div>

        <div class="field">
          <label class="field-label" for="s4-contact">
            Email address <span class="req">*</span>
          </label>
          <input
            id="s4-contact"
            v-model="form.email"
            type="email"
            class="field-input"
            :class="{ 'is-error': errors.email }"
            placeholder="email@organisation.org"
            autocomplete="email"
          />
          <span v-if="errors.email" class="err-msg">{{ errors.email }}</span>
        </div>

      </div>

      <!-- Role -->
      <div class="field">
        <label class="field-label" for="s4-role">
          Role <span class="req">*</span>
        </label>
        <div class="select-wrap">
          <select
            id="s4-role"
            v-model="form.role"
            class="field-select"
            :class="{ 'is-error': errors.role }"
          >
            <option value="" disabled>Select a role…</option>
            <option v-for="r in roleOptions" :key="r.value" :value="r.value">
              {{ r.label }}
            </option>
          </select>
          <!-- Custom chevron -->
          <svg class="select-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <span v-if="errors.role" class="err-msg">{{ errors.role }}</span>
        <span v-if="roleHint" class="field-hint">{{ roleHint }}</span>
      </div>

      <!-- Actions -->
      <div class="actions">

        <button
          type="button"
          class="btn-ghost"
          :disabled="isSending"
          @click="skip"
        >
          Skip for now
        </button>

        <button type="submit" class="btn-primary" :disabled="isSending">
          <span v-if="isSending" class="btn-spinner btn-spinner--dark" />
          <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          {{ isSending ? 'Sending…' : 'Send invitation' }}
        </button>

      </div>

    </form>

    <!-- Skip confirmation -->
    <div v-if="skipConfirmed" class="skip-note">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      You can add team members later in <strong>Settings › Team</strong>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useAuthStore }     from '../../../stores/auth'
import { createTeamMember } from '../../../services/onboardingApi'
import { ApiError }         from '../../../services/api'
import type {
  NewTeamMemberPayload,
  TeamMemberRole,
} from '../../../interfaces/onboarding'

// ── Emits ─────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  (e: 'complete'): void
  (e: 'skip'): void
}>()

// ── Auth ───────────────────────────────────────────────────────────────────────

const authStore = useAuthStore()

// ── Role options ──────────────────────────────────────────────────────────────

interface RoleOption {
  value: TeamMemberRole
  label: string
  hint: string
}

const roleOptions: RoleOption[] = [
  { value: 'program_manager',  label: 'Program Manager',  hint: 'Manages programmes and donor relationships' },
  { value: 'field_officer',    label: 'Field Officer',    hint: 'Collects data and implements activities in the field' },
  { value: 'facilitator',      label: 'Facilitator',      hint: 'Facilitates child-friendly space sessions and activities' },
  { value: 'case_worker',      label: 'Case Worker',      hint: 'Works directly with beneficiaries on individual cases' },
  { value: 'finance_officer',  label: 'Finance Officer',  hint: 'Manages budgets and financial reporting' },
]

// ── Form state ────────────────────────────────────────────────────────────────

const form = reactive<NewTeamMemberPayload>({
  full_name:      '',
  email:          '',
  role:           'program_manager',
})

const errors         = reactive<Partial<Record<keyof NewTeamMemberPayload, string>>>({})
const apiError       = ref('')
const successMsg     = ref('')
const isSending      = ref(false)
const skipConfirmed  = ref(false)

// ── Role hint ─────────────────────────────────────────────────────────────────

const roleHint = computed(
  () => roleOptions.find(r => r.value === form.role)?.hint ?? '',
)

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/

function validate(): boolean {
  Object.keys(errors).forEach(k => delete errors[k as keyof typeof errors])
  let ok = true

  if (!form.full_name.trim() || form.full_name.trim().length < 2) {
    errors.full_name = 'At least 2 characters required'
    ok = false
  }

  const contact = form.email.trim()
  if (!contact) {
    errors.email = 'Email is required'
    ok = false
  } else if (!EMAIL_RE.test(contact)) {
    errors.email = 'Enter a valid email address'
    ok = false
  }

  if (!form.role) {
    errors.role = 'Please select a role'
    ok = false
  }

  return ok
}

// ── Send invitation ───────────────────────────────────────────────────────────

async function send() {
  apiError.value  = ''
  successMsg.value = ''
  if (!validate()) return

  isSending.value = true
  try {
    await createTeamMember(
      {
        full_name: form.full_name.trim(),
        email:     form.email.trim(),
        password:  'TempP@ssw0rd123!',
        role:      form.role,
      },
      authStore.accessToken ?? undefined,
    )

    const label = roleOptions.find(r => r.value === form.role)?.label ?? form.role
    successMsg.value = `Invitation sent to ${form.full_name.trim()} as ${label}`
    await new Promise(r => setTimeout(r, 1200))
    emit('complete')
  } catch (e: any) {
    if (e instanceof ApiError && e.data?.errors) Object.assign(errors, e.data.errors)
    else apiError.value = e instanceof ApiError ? (e.message ?? 'Failed to send') : 'Connection error'
  } finally {
    isSending.value = false
  }
}

// ── Skip ──────────────────────────────────────────────────────────────────────

async function skip() {
  skipConfirmed.value = true
  await new Promise(r => setTimeout(r, 800))
  emit('skip')
  emit('complete')
}
</script>

<style scoped>
/* ── Wrapper ──────────────────────────────────────────────────────────────── */
.s4-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 560px;
}

/* ── Success / error banners ──────────────────────────────────────────────── */
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

.success-bar svg { flex-shrink: 0; color: var(--third); }

.api-err {
  margin: 0;
  padding: 9px 12px;
  background: var(--error-bg);
  border: 1px solid var(--error);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--error);
}

/* ── Form ─────────────────────────────────────────────────────────────────── */
.invite-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Two-column layout ────────────────────────────────────────────────────── */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 480px) {
  .two-col { grid-template-columns: 1fr; }
}

/* ── Field ────────────────────────────────────────────────────────────────── */
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.req { color: var(--error); font-weight: 500; }

/* ── Inputs ───────────────────────────────────────────────────────────────── */
.field-input,
.field-select {
  width: 100%;
  padding: 8px 11px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.845rem;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.field-input::placeholder { color: var(--text-muted); opacity: 0.65; }

.field-input:focus,
.field-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
}

.field-input.is-error,
.field-select.is-error { border-color: var(--error); }

/* ── Select wrapper ───────────────────────────────────────────────────────── */
.select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.field-select {
  padding-right: 32px;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.select-icon {
  position: absolute;
  right: 10px;
  pointer-events: none;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* ── Field meta ───────────────────────────────────────────────────────────── */
.field-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.4;
  min-height: 14px;
}

.err-msg {
  font-size: 0.72rem;
  color: var(--error);
}

/* ── Actions ──────────────────────────────────────────────────────────────── */
.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 2px;
  flex-wrap: wrap;
}

/* Ghost / skip button */
.btn-ghost {
  height: 36px;
  padding: 0 16px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.845rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  white-space: nowrap;
}

.btn-ghost:hover:not(:disabled) {
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

.btn-ghost:disabled { opacity: 0.45; cursor: not-allowed; }

/* Primary action */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 18px;
  background: var(--primary);
  border: none;
  border-radius: var(--radius-sm);
  color: #000;
  font-size: 0.845rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
  white-space: nowrap;
}

.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── Skip note ────────────────────────────────────────────────────────────── */
.skip-note {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  color: var(--text-muted);
}

.skip-note svg { flex-shrink: 0; color: var(--third); }

/* ── Spinner ──────────────────────────────────────────────────────────────── */
.btn-spinner {
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255,255,255,0.3);
  border-left-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

.btn-spinner--dark {
  border-color: rgba(0,0,0,0.2);
  border-left-color: #000;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
  .btn-ghost,
  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>
