<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Beneficiaries', href: '/beneficiaries' },
      { title: fullName || 'Profile', href: `/beneficiaries/${id}`, current: true },
    ]"
  >
    <div class="profile">
      <div v-if="loading" class="card skeleton" aria-busy="true" aria-label="Loading profile" />

      <p v-else-if="loadError" class="ui-alert" role="alert">
        <AppIcon name="alert-circle" :size="16" />
        <span>{{ loadError }}</span>
      </p>

      <template v-else-if="b">
        <header class="head">
          <div>
            <h1 class="title">{{ fullName }}</h1>
            <p class="subtitle">
              {{ sexLabel(b.sex) }} · {{ b.age_at_registration }} years at registration<template v-if="b.cfs_location"> · {{ b.cfs_location.name }}</template>
            </p>
          </div>
          <button v-if="canEdit && !editing" type="button" class="ui-btn ui-btn--outline" @click="startEdit">Edit profile</button>
        </header>

        <p v-if="savedNote" class="ui-help" role="status">{{ savedNote }}</p>

        <!-- View -->
        <template v-if="!editing">
          <section class="card" aria-labelledby="id-h">
            <h2 id="id-h" class="section-title">Identity</h2>
            <dl class="facts">
              <div><dt>Personal name</dt><dd>{{ b.personal_name }}</dd></div>
              <div><dt>Father's name</dt><dd>{{ b.father_name }}</dd></div>
              <div><dt>Grandfather's name</dt><dd>{{ b.grandfather_name || '—' }}</dd></div>
              <div><dt>Family name</dt><dd>{{ b.family_name || '—' }}</dd></div>
              <div><dt>Age at registration</dt><dd>{{ b.age_at_registration }}</dd></div>
              <div><dt>Sex</dt><dd>{{ sexLabel(b.sex) }}</dd></div>
              <div><dt>Language</dt><dd>{{ b.language || '—' }}</dd></div>
              <div><dt>Disability</dt><dd>{{ optionLabel(DISABILITIES, b.disability_status) }}</dd></div>
            </dl>
          </section>

          <section class="card" aria-labelledby="gd-h">
            <h2 id="gd-h" class="section-title">Guardian</h2>
            <dl class="facts">
              <div><dt>Name</dt><dd>{{ b.guardian_name || '—' }}</dd></div>
              <div><dt>Phone</dt><dd>{{ b.guardian_phone || '—' }}</dd></div>
            </dl>
          </section>

          <section class="card" aria-labelledby="rg-h">
            <h2 id="rg-h" class="section-title">Registration</h2>
            <dl class="facts">
              <div><dt>Registered at</dt><dd>{{ b.cfs_location?.name ?? 'Not enrolled at a CFS' }}</dd></div>
              <div><dt>Registered on</dt><dd>{{ formatDate(b.registration_date) }}</dd></div>
              <div><dt>Primero case ID</dt><dd>{{ b.primero_case_id || '—' }}</dd></div>
              <div><dt>Beneficiary ID</dt><dd class="mono">{{ b.id }}</dd></div>
            </dl>
          </section>

          <section class="card" aria-labelledby="nt-h">
            <h2 id="nt-h" class="section-title">Notes</h2>
            <dl class="facts facts--wide">
              <div><dt>Known medical issues</dt><dd>{{ b.known_medical_issues || '—' }}</dd></div>
              <div><dt>Known learning difficulties</dt><dd>{{ b.known_learning_difficulties || '—' }}</dd></div>
              <div><dt>Additional notes</dt><dd>{{ b.additional_notes || '—' }}</dd></div>
            </dl>
          </section>
        </template>

        <!-- Edit -->
        <form v-else class="card ui-form" novalidate aria-labelledby="ed-h" @submit.prevent="save">
          <div class="ui-section-head">
            <h2 id="ed-h">Edit profile</h2>
            <p>Correct this person's details. Where they are registered is changed with a transfer, not here.</p>
          </div>

          <p v-if="alert" class="ui-alert" role="alert"><AppIcon name="alert-circle" :size="16" /><span>{{ alert }}</span></p>

          <div class="grid">
            <div class="ui-field">
              <label class="ui-label" for="bp-personal">Personal name</label>
              <input id="bp-personal" v-model="form.personal_name" class="ui-input" type="text" autocomplete="off" maxlength="255"
                :aria-invalid="errs.personal_name ? 'true' : undefined" :aria-describedby="errs.personal_name ? 'bp-personal-error' : undefined">
              <FieldError id="bp-personal-error" :message="errs.personal_name" />
            </div>
            <div class="ui-field">
              <label class="ui-label" for="bp-father">Father's name</label>
              <input id="bp-father" v-model="form.father_name" class="ui-input" type="text" autocomplete="off" maxlength="255"
                :aria-invalid="errs.father_name ? 'true' : undefined" :aria-describedby="errs.father_name ? 'bp-father-error' : undefined">
              <FieldError id="bp-father-error" :message="errs.father_name" />
            </div>
            <div class="ui-field">
              <label class="ui-label" for="bp-grandfather">Grandfather's name <span class="ui-optional">(optional)</span></label>
              <input id="bp-grandfather" v-model="form.grandfather_name" class="ui-input" type="text" autocomplete="off" maxlength="255">
            </div>
            <div class="ui-field">
              <label class="ui-label" for="bp-family">Family name <span class="ui-optional">(optional)</span></label>
              <input id="bp-family" v-model="form.family_name" class="ui-input" type="text" autocomplete="off" maxlength="255">
            </div>
            <div class="ui-field">
              <label class="ui-label" for="bp-age">Age at registration</label>
              <input id="bp-age" v-model="form.age_at_registration" class="ui-input" type="number" inputmode="numeric" min="0" max="120"
                :aria-invalid="errs.age_at_registration ? 'true' : undefined" :aria-describedby="errs.age_at_registration ? 'bp-age-error' : undefined">
              <FieldError id="bp-age-error" :message="errs.age_at_registration" />
            </div>
            <div class="ui-field">
              <label class="ui-label" for="bp-sex">Sex</label>
              <select id="bp-sex" v-model="form.sex" class="ui-select">
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div class="ui-field">
              <label class="ui-label" for="bp-language">Language</label>
              <select id="bp-language" v-model="form.language" class="ui-select">
                <option v-for="l in languageOptions" :key="l" :value="l">{{ l }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label class="ui-label" for="bp-disability">Disability</label>
              <select id="bp-disability" v-model="form.disability_status" class="ui-select">
                <option v-for="d in disabilityOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
              </select>
            </div>
            <div class="ui-field">
              <label class="ui-label" for="bp-guardian">Guardian name <span class="ui-optional">(optional)</span></label>
              <input id="bp-guardian" v-model="form.guardian_name" class="ui-input" type="text" autocomplete="off" maxlength="255">
            </div>
            <div class="ui-field">
              <label class="ui-label" for="bp-guardian-phone">Guardian phone <span class="ui-optional">(optional)</span></label>
              <input id="bp-guardian-phone" v-model="form.guardian_phone" class="ui-input" type="tel" inputmode="tel" autocomplete="off" maxlength="50">
            </div>
            <div class="ui-field">
              <label class="ui-label" for="bp-primero">Primero case ID <span class="ui-optional">(optional)</span></label>
              <input id="bp-primero" v-model="form.primero_case_id" class="ui-input" type="text" autocomplete="off" maxlength="100">
            </div>
          </div>

          <div class="ui-field">
            <label class="ui-label" for="bp-medical">Known medical issues <span class="ui-optional">(optional)</span></label>
            <textarea id="bp-medical" v-model="form.known_medical_issues" class="ui-textarea" rows="2" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="bp-learning">Known learning difficulties <span class="ui-optional">(optional)</span></label>
            <textarea id="bp-learning" v-model="form.known_learning_difficulties" class="ui-textarea" rows="2" />
          </div>
          <div class="ui-field">
            <label class="ui-label" for="bp-notes">Additional notes <span class="ui-optional">(optional)</span></label>
            <textarea id="bp-notes" v-model="form.additional_notes" class="ui-textarea" rows="3" />
          </div>

          <div class="actions">
            <button type="button" class="ui-btn ui-btn--outline" :disabled="saving" @click="editing = false">Cancel</button>
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="saving" :aria-busy="saving ? 'true' : undefined">
              {{ saving ? 'Saving…' : 'Save changes' }}
            </button>
          </div>
        </form>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { beneficiaryApi, type BeneficiaryProfile } from '../../services/beneficiaryApi'
import { ApiError } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import FieldError from '../../components/interfaces/FieldError.vue'

definePageMeta({ layout: false, middleware: ['auth'] })

const LANGUAGES = ['Arabic', 'English', 'Dinka', 'Nuer', 'Shilluk', 'Other']
const DISABILITIES = [
  { value: 'none', label: 'None' },
  { value: 'physical', label: 'Physical' },
  { value: 'visual', label: 'Visual' },
  { value: 'hearing', label: 'Hearing' },
  { value: 'intellectual', label: 'Intellectual' },
  { value: 'multiple', label: 'Multiple' },
]

const route = useRoute()
const auth = useAuthStore()
const id = computed(() => String(route.params.id))

const b = ref<BeneficiaryProfile | null>(null)
const loading = ref(true)
const loadError = ref('')

// Who may edit is set per role in Settings → Roles (beneficiaries.edit).
const canEdit = computed(() => auth.can('beneficiaries.edit'))

const fullName = computed(() =>
  b.value ? [b.value.personal_name, b.value.father_name, b.value.grandfather_name, b.value.family_name].filter(Boolean).join(' ') : '',
)
useHead({ title: () => `${fullName.value || 'Beneficiary'} · WellReach` })

const sexLabel = (sex: string) => (sex === 'female' ? 'Female' : sex === 'male' ? 'Male' : sex)
const optionLabel = (options: { value: string; label: string }[], value: string) =>
  options.find(o => o.value === value)?.label ?? value ?? '—'
const formatDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Edit ─────────────────────────────────────────────────────────────────────
const editing = ref(false)
const saving = ref(false)
const alert = ref('')
const savedNote = ref('')
const errs = reactive<Record<string, string>>({})
const form = reactive({
  personal_name: '', father_name: '', grandfather_name: '', family_name: '',
  age_at_registration: '' as string | number, sex: 'female', language: 'Arabic', disability_status: 'none',
  guardian_name: '', guardian_phone: '', primero_case_id: '',
  known_medical_issues: '', known_learning_difficulties: '', additional_notes: '',
})

// A saved value that is not in the standard list stays selectable.
const languageOptions = computed(() => (LANGUAGES.includes(form.language) ? LANGUAGES : [form.language, ...LANGUAGES]))
const disabilityOptions = computed(() =>
  DISABILITIES.some(d => d.value === form.disability_status)
    ? DISABILITIES
    : [{ value: form.disability_status, label: form.disability_status }, ...DISABILITIES],
)

function startEdit() {
  if (!b.value) return
  const p = b.value
  Object.assign(form, {
    personal_name: p.personal_name, father_name: p.father_name,
    grandfather_name: p.grandfather_name ?? '', family_name: p.family_name ?? '',
    age_at_registration: p.age_at_registration, sex: p.sex, language: p.language || 'Arabic',
    disability_status: p.disability_status || 'none',
    guardian_name: p.guardian_name ?? '', guardian_phone: p.guardian_phone ?? '', primero_case_id: p.primero_case_id ?? '',
    known_medical_issues: p.known_medical_issues ?? '', known_learning_difficulties: p.known_learning_difficulties ?? '',
    additional_notes: p.additional_notes ?? '',
  })
  Object.keys(errs).forEach(k => delete errs[k])
  alert.value = ''
  savedNote.value = ''
  editing.value = true
}

async function save() {
  Object.keys(errs).forEach(k => delete errs[k])
  alert.value = ''
  const age = Number(form.age_at_registration)
  if (!form.personal_name.trim()) errs.personal_name = 'Enter the personal name'
  if (!form.father_name.trim()) errs.father_name = "Enter the father's name"
  if (form.age_at_registration === '' || !Number.isInteger(age) || age < 0 || age > 120) errs.age_at_registration = 'Enter an age between 0 and 120'
  if (Object.keys(errs).length) return

  const optional = (v: string) => v.trim() || undefined
  saving.value = true
  try {
    b.value = await beneficiaryApi.update(id.value, {
      personal_name: form.personal_name.trim(),
      father_name: form.father_name.trim(),
      grandfather_name: optional(form.grandfather_name),
      family_name: optional(form.family_name),
      age_at_registration: age,
      sex: form.sex,
      language: form.language,
      disability_status: form.disability_status,
      guardian_name: form.guardian_name.trim(),
      guardian_phone: optional(form.guardian_phone),
      known_medical_issues: optional(form.known_medical_issues),
      known_learning_difficulties: optional(form.known_learning_difficulties),
      additional_notes: optional(form.additional_notes),
      primero_case_id: optional(form.primero_case_id),
    })
    editing.value = false
    savedNote.value = 'Profile saved.'
  } catch (e) {
    const fields = e instanceof ApiError ? (e.data?.errors as Record<string, string> | undefined) : undefined
    if (fields && Object.keys(fields).length) Object.assign(errs, fields)
    alert.value = e instanceof ApiError
      ? (e.status === 403 ? 'Your role cannot edit beneficiary profiles.' : fields ? 'Check the highlighted fields.' : e.message)
      : 'Connection failed — try again.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    b.value = await beneficiaryApi.get(id.value)
  } catch (e) {
    loadError.value = e instanceof ApiError && e.status === 404
      ? 'This beneficiary was not found, or is registered at a CFS you do not work with.'
      : e instanceof ApiError && e.status === 403
        ? 'You are not assigned to a CFS yet, so you cannot open beneficiary profiles.'
        : 'Could not load this profile. Check your connection and try again.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.profile { max-width: 760px; display: flex; flex-direction: column; gap: 24px; padding-bottom: 48px; }
.head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }
.subtitle { margin: 4px 0 0; font-size: 0.9375rem; color: var(--text-quiet); }

.card { padding: 32px; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; }
.skeleton { height: 240px; opacity: 0.6; }
.section-title { margin: 0 0 16px; font-size: 1.0625rem; font-weight: 400; color: var(--text-primary); }

.facts { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px 24px; }
.facts--wide { grid-template-columns: 1fr; }
.facts dt { font-size: 0.8125rem; color: var(--text-secondary); }
.facts dd { margin: 4px 0 0; font-size: 0.9375rem; color: var(--text-primary); overflow-wrap: anywhere; white-space: pre-wrap; }
.mono { font-variant-numeric: tabular-nums; font-size: 0.8125rem; }

.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; }
.actions { display: flex; justify-content: flex-end; gap: 16px; padding-top: 24px; border-top: 1px solid var(--border-color); }

@media (max-width: 640px) {
  .card { padding: 24px 16px; }
  .head { flex-direction: column; }
  .actions { flex-direction: column-reverse; }
  .actions .ui-btn { width: 100%; }
}
</style>
