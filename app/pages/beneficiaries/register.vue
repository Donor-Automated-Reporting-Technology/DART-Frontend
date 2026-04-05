<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Beneficiaries', href: '/beneficiaries' },
      { title: 'Register', href: '/beneficiaries/register', current: true },
    ]"
  >
    <div class="register-page">
      <div class="page-header">
        <h1 class="page-title">Register Beneficiary</h1>
        <p class="page-subtitle">Add a new beneficiary to the registry.</p>
      </div>

      <form class="reg-form" @submit.prevent="submit">
        <!-- Personal section -->
        <fieldset class="section">
          <legend class="section-title">Personal Information</legend>
          <div class="form-grid">
            <div class="field">
              <label class="field-label" for="reg-personal">Personal name <span class="req">*</span></label>
              <input id="reg-personal" v-model="form.personal_name" type="text" class="field-input" :class="{ 'is-error': errors.personal_name }" placeholder="First name" />
              <span v-if="errors.personal_name" class="err-msg">{{ errors.personal_name }}</span>
            </div>
            <div class="field">
              <label class="field-label" for="reg-father">Father name <span class="req">*</span></label>
              <input id="reg-father" v-model="form.father_name" type="text" class="field-input" :class="{ 'is-error': errors.father_name }" placeholder="Father name" />
              <span v-if="errors.father_name" class="err-msg">{{ errors.father_name }}</span>
            </div>
            <div class="field">
              <label class="field-label" for="reg-gf">Grandfather name <span class="optional">optional</span></label>
              <input id="reg-gf" v-model="form.grandfather_name" type="text" class="field-input" placeholder="Grandfather name" />
            </div>
            <div class="field">
              <label class="field-label" for="reg-family">Family name <span class="optional">optional</span></label>
              <input id="reg-family" v-model="form.family_name" type="text" class="field-input" placeholder="Family / tribe name" />
            </div>
            <div class="field">
              <label class="field-label" for="reg-age">Age <span class="req">*</span></label>
              <input id="reg-age" v-model.number="form.age_at_registration" type="number" class="field-input" :class="{ 'is-error': errors.age }" min="0" max="120" placeholder="Age" />
              <span v-if="errors.age" class="err-msg">{{ errors.age }}</span>
            </div>
            <div class="field">
              <label class="field-label" for="reg-sex">Gender <span class="req">*</span></label>
              <select id="reg-sex" v-model="form.sex" class="field-input" :class="{ 'is-error': errors.sex }">
                <option value="" disabled>Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <span v-if="errors.sex" class="err-msg">{{ errors.sex }}</span>
            </div>
            <div class="field">
              <label class="field-label" for="reg-lang">Language</label>
              <input id="reg-lang" v-model="form.language" type="text" class="field-input" placeholder="e.g. Arabic" />
            </div>
            <div class="field">
              <label class="field-label" for="reg-disability">Disability</label>
              <select id="reg-disability" v-model="form.disability_status" class="field-input">
                <option value="none">None</option>
                <option value="physical">Physical</option>
                <option value="visual">Visual</option>
                <option value="hearing">Hearing</option>
                <option value="intellectual">Intellectual</option>
                <option value="multiple">Multiple</option>
              </select>
            </div>
          </div>
        </fieldset>

        <!-- Guardian section -->
        <fieldset class="section">
          <legend class="section-title">
            Guardian Information
            <span class="req">*</span>
          </legend>
          <div class="form-grid">
            <div class="field">
              <label class="field-label" for="reg-guardian">Guardian name</label>
              <input id="reg-guardian" v-model="form.guardian_name" type="text" class="field-input" :class="{ 'is-error': errors.guardian_name }" placeholder="Guardian full name" />
              <span v-if="errors.guardian_name" class="err-msg">{{ errors.guardian_name }}</span>
            </div>
            <div class="field">
              <label class="field-label" for="reg-phone">Guardian phone</label>
              <input id="reg-phone" v-model="form.guardian_phone" type="tel" class="field-input" placeholder="+211 xxx xxx xxx" />
            </div>
          </div>
        </fieldset>

        <!-- Optional section -->
        <fieldset class="section">
          <legend class="section-title">Additional <span class="optional">optional</span></legend>
          <div class="form-grid">
            <div class="field span-2">
              <label class="field-label" for="reg-medical">Known medical issues</label>
              <textarea id="reg-medical" v-model="form.known_medical_issues" class="field-textarea" rows="2" placeholder="Any relevant medical conditions…" />
            </div>
            <div class="field span-2">
              <label class="field-label" for="reg-notes">Additional notes</label>
              <textarea id="reg-notes" v-model="form.additional_notes" class="field-textarea" rows="2" placeholder="Any other notes…" />
            </div>
          </div>
        </fieldset>

        <!-- API error -->
        <p v-if="apiError" class="api-err">{{ apiError }}</p>

        <!-- Actions -->
        <div class="actions">
          <NuxtLink to="/beneficiaries" class="btn-secondary">Cancel</NuxtLink>
          <button type="submit" class="btn-primary" :disabled="saving">
            <span v-if="saving" class="btn-spinner" />
            {{ saving ? 'Registering…' : 'Register Beneficiary' }}
          </button>
        </div>
      </form>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { beneficiaryApi } from '../../services/beneficiaryApi'
import { ApiError } from '../../services/api'

definePageMeta({
  layout: false,
  middleware: ['auth'],
})

const router = useRouter()
const saving = ref(false)
const apiError = ref('')
const errors = reactive<Record<string, string>>({})

const form = reactive({
  personal_name: '',
  father_name: '',
  grandfather_name: '',
  family_name: '',
  age_at_registration: null as number | null,
  sex: '',
  language: '',
  disability_status: 'none',
  guardian_name: '',
  guardian_phone: '',
  known_medical_issues: '',
  additional_notes: '',
})

function validate(): boolean {
  Object.keys(errors).forEach(k => delete errors[k])
  let ok = true
  if (!form.personal_name.trim()) { errors.personal_name = 'Required'; ok = false }
  if (!form.father_name.trim()) { errors.father_name = 'Required'; ok = false }
  if (!form.age_at_registration || form.age_at_registration < 0) { errors.age = 'Valid age required'; ok = false }
  if (!form.sex) { errors.sex = 'Required'; ok = false }
  if (!form.guardian_name.trim()) { errors.guardian_name = 'Required'; ok = false }
  return ok
}

async function submit() {
  apiError.value = ''
  if (!validate()) return

  saving.value = true
  try {
    await beneficiaryApi.register({
      personal_name: form.personal_name.trim(),
      father_name: form.father_name.trim(),
      grandfather_name: form.grandfather_name.trim() || undefined,
      family_name: form.family_name.trim() || undefined,
      age_at_registration: form.age_at_registration!,
      sex: form.sex,
      language: form.language.trim() || 'Arabic',
      disability_status: form.disability_status,
      guardian_name: form.guardian_name.trim(),
      guardian_phone: form.guardian_phone.trim() || undefined,
      known_medical_issues: form.known_medical_issues.trim() || undefined,
      additional_notes: form.additional_notes.trim() || undefined,
    })
    router.push('/beneficiaries')
  } catch (e: any) {
    if (e instanceof ApiError && e.data?.errors) Object.assign(errors, e.data.errors)
    else apiError.value = e?.message ?? 'Registration failed'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.register-page { max-width: 680px; }

.page-header { margin-bottom: 24px; }
.page-title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.page-subtitle { font-size: 0.82rem; color: var(--text-muted); margin: 0; }

.reg-form { display: flex; flex-direction: column; gap: 22px; }

/* Type toggle */
.type-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
  width: fit-content;
}

.type-btn {
  padding: 8px 24px;
  background: var(--bg-input);
  border: none;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.type-btn--active {
  background: var(--primary);
  color: #fff;
}

/* Sections */
.section {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 16px;
  margin: 0;
}

.section-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding: 0 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 12px;
}

.span-2 { grid-column: span 2; }

@media (max-width: 560px) { .form-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; } }

/* Fields */
.field { display: flex; flex-direction: column; gap: 4px; }

.field-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}

.req { color: var(--error); font-weight: 500; }
.optional { font-size: 0.65rem; font-weight: 400; text-transform: none; letter-spacing: 0; opacity: 0.7; }

.field-input, .field-textarea {
  width: 100%;
  padding: 9px 11px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.845rem;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.field-input:focus, .field-textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }
.field-input.is-error { border-color: var(--error); }
.field-textarea { resize: vertical; line-height: 1.5; }

select.field-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 32px;
}

.err-msg { font-size: 0.72rem; color: var(--error); }

.api-err {
  font-size: 0.78rem;
  color: var(--error);
  padding: 8px 12px;
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border-radius: var(--radius-sm);
  margin: 0;
}

/* Actions */
.actions { display: flex; gap: 10px; padding-top: 4px; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px;
  background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm);
  font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-secondary {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px;
  background: transparent; color: var(--text-muted); border: 1px solid var(--border-color);
  border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 500; text-decoration: none; cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.btn-secondary:hover { border-color: var(--text-primary); color: var(--text-primary); }

.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
