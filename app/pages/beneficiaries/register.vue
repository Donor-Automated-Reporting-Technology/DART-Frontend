<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Beneficiaries', href: '/beneficiaries' },
      { title: 'Register', href: '/beneficiaries/register', current: true },
    ]"
  >
    <div class="reg-page">
      <!-- Header -->
      <div class="reg-header">
        <NuxtLink to="/beneficiaries" class="reg-back" aria-label="Back to beneficiaries">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15l-5-5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </NuxtLink>
        <div>
          <h1 class="reg-title">Register Beneficiary</h1>
          <p class="reg-subtitle">{{ stepDescriptions[step] }}</p>
        </div>
      </div>

      <!-- Stepper -->
      <BeneficiariesFormStepper :steps="stepLabels" :current="step" @go="goToStep" />

      <!-- Card -->
      <div class="reg-card">
        <form @submit.prevent="onSubmit">
          <!-- Animated stage wrapper -->
          <Transition :name="slideDir" mode="out-in">
            <!-- Stage 0: Identity -->
            <div v-if="step === 0" key="identity" class="stage">
              <div class="stage__grid">
                <BeneficiariesFloatingInput
                  v-model="form.personal_name"
                  label="Personal Name"
                  :required="true"
                  :error="errors.personal_name"
                  :success="!!form.personal_name.trim() && !errors.personal_name"
                />
                <BeneficiariesFloatingInput
                  v-model="form.father_name"
                  label="Father Name"
                  :required="true"
                  :error="errors.father_name"
                  :success="!!form.father_name.trim() && !errors.father_name"
                />
                <BeneficiariesFloatingInput
                  v-model="form.grandfather_name"
                  label="Grandfather Name"
                  :optional="true"
                />
                <BeneficiariesFloatingInput
                  v-model="form.family_name"
                  label="Family / Tribe Name"
                  :optional="true"
                />
                <BeneficiariesFloatingInput
                  v-model="form.age_at_registration"
                  label="Age at Registration"
                  type="number"
                  :min="0"
                  :max="120"
                  :required="true"
                  :error="errors.age"
                  :success="!!form.age_at_registration && Number(form.age_at_registration) > 0 && !errors.age"
                />
              </div>

              <BeneficiariesSelectionTiles
                v-model="form.sex"
                label="Gender"
                :required="true"
                :error="errors.sex"
                :options="[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                ]"
              />
            </div>

            <!-- Stage 1: Background -->
            <div v-else-if="step === 1" key="background" class="stage">
              <BeneficiariesSelectionTiles
                v-model="form.language"
                label="Primary Language"
                :options="[
                  { value: 'Arabic', label: 'Arabic' },
                  { value: 'English', label: 'English' },
                  { value: 'Dinka', label: 'Dinka' },
                  { value: 'Nuer', label: 'Nuer' },
                  { value: 'Other', label: 'Other' },
                ]"
              />

              <BeneficiariesSelectionTiles
                v-model="form.disability_status"
                label="Disability Status"
                :options="[
                  { value: 'none', label: 'None' },
                  { value: 'physical', label: 'Physical' },
                  { value: 'visual', label: 'Visual' },
                  { value: 'hearing', label: 'Hearing' },
                  { value: 'intellectual', label: 'Intellectual' },
                  { value: 'multiple', label: 'Multiple' },
                ]"
              />
            </div>

            <!-- Stage 2: Guardian -->
            <div v-else-if="step === 2" key="guardian" class="stage">
              <div class="stage__grid">
                <BeneficiariesFloatingInput
                  v-model="form.guardian_name"
                  label="Guardian Full Name"
                  :required="true"
                  :error="errors.guardian_name"
                  :success="!!form.guardian_name.trim() && !errors.guardian_name"
                />
                <BeneficiariesFloatingInput
                  v-model="form.guardian_phone"
                  label="Guardian Phone"
                  type="tel"
                  :optional="true"
                />
              </div>

              <BeneficiariesFloatingInput
                v-model="form.known_medical_issues"
                label="Known Medical Issues"
                :textarea="true"
                :rows="2"
                :optional="true"
              />

              <BeneficiariesFloatingInput
                v-model="form.additional_notes"
                label="Additional Notes"
                :textarea="true"
                :rows="2"
                :optional="true"
              />
            </div>

            <!-- Stage 3: Review -->
            <div v-else key="review" class="stage">
              <BeneficiariesSummaryBento :groups="summaryGroups" />
            </div>
          </Transition>

          <!-- API error -->
          <Transition name="err-fade">
            <p v-if="apiError" class="reg-api-err">{{ apiError }}</p>
          </Transition>

          <!-- Footer actions -->
          <div class="reg-actions">
            <button
              v-if="step > 0"
              type="button"
              class="reg-btn reg-btn--ghost"
              @click="prev"
            >
              Back
            </button>
            <NuxtLink
              v-else
              to="/beneficiaries"
              class="reg-btn reg-btn--ghost"
            >
              Cancel
            </NuxtLink>

            <button
              v-if="step < 3"
              type="button"
              class="reg-btn reg-btn--primary"
              @click="next"
            >
              Continue
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M7.5 5l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button
              v-else
              type="submit"
              class="reg-btn reg-btn--primary"
              :disabled="saving"
            >
              <span v-if="saving" class="reg-spinner" />
              {{ saving ? 'Registering…' : 'Register Beneficiary' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { beneficiaryApi } from '../../services/beneficiaryApi'
import { ApiError } from '../../services/api'
import type { BentoGroup } from '../../components/beneficiaries/SummaryBento.vue'

definePageMeta({
  layout: false,
  middleware: ['auth'],
})

const router = useRouter()

/* ── Steps ── */
const stepLabels = ['Identity', 'Background', 'Guardian', 'Review']
const stepDescriptions = [
  'Enter the beneficiary\'s personal details.',
  'Select language and disability status.',
  'Provide guardian contact and medical info.',
  'Review everything before submitting.',
]
const step = ref(0)
const slideDir = ref<'slide-left' | 'slide-right'>('slide-left')

/* ── Form ── */
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
  language: 'Arabic',
  disability_status: 'none',
  guardian_name: '',
  guardian_phone: '',
  known_medical_issues: '',
  additional_notes: '',
})

/* ── Stage validation ── */
function clearErrors() {
  Object.keys(errors).forEach(k => delete errors[k])
}

function validateStep(s: number): boolean {
  clearErrors()
  let ok = true

  if (s === 0) {
    if (!form.personal_name.trim()) { errors.personal_name = 'Personal name is required'; ok = false }
    if (!form.father_name.trim()) { errors.father_name = 'Father name is required'; ok = false }
    if (!form.age_at_registration || Number(form.age_at_registration) <= 0) { errors.age = 'Please enter a valid age'; ok = false }
    if (!form.sex) { errors.sex = 'Please select a gender'; ok = false }
  }

  if (s === 2) {
    if (!form.guardian_name.trim()) { errors.guardian_name = 'Guardian name is required'; ok = false }
  }

  return ok
}

/* ── Navigation ── */
function next() {
  if (!validateStep(step.value)) return
  slideDir.value = 'slide-left'
  step.value++
  apiError.value = ''
}

function prev() {
  clearErrors()
  slideDir.value = 'slide-right'
  step.value--
  apiError.value = ''
}

function goToStep(i: number) {
  if (i < step.value) {
    clearErrors()
    slideDir.value = 'slide-right'
    step.value = i
    apiError.value = ''
  }
}

/* ── Summary ── */
const sexLabel = computed(() => form.sex === 'male' ? 'Male' : form.sex === 'female' ? 'Female' : '')

const summaryGroups = computed<BentoGroup[]>(() => [
  {
    title: 'Identity',
    items: [
      { label: 'Personal Name', value: form.personal_name },
      { label: 'Father Name', value: form.father_name },
      { label: 'Grandfather', value: form.grandfather_name || '—' },
      { label: 'Family Name', value: form.family_name || '—' },
      { label: 'Age', value: form.age_at_registration ? String(form.age_at_registration) : '—' },
      { label: 'Gender', value: sexLabel.value },
    ],
  },
  {
    title: 'Background',
    items: [
      { label: 'Language', value: form.language || 'Arabic' },
      { label: 'Disability', value: form.disability_status === 'none' ? 'None' : form.disability_status },
    ],
  },
  {
    title: 'Guardian',
    items: [
      { label: 'Guardian Name', value: form.guardian_name },
      { label: 'Phone', value: form.guardian_phone || '—' },
    ],
  },
  {
    title: 'Additional',
    wide: true,
    items: [
      { label: 'Medical Issues', value: form.known_medical_issues || '—' },
      { label: 'Notes', value: form.additional_notes || '—' },
    ],
  },
])

/* ── Submit ── */
async function onSubmit() {
  apiError.value = ''
  if (!validateStep(0) || !validateStep(2)) {
    apiError.value = 'Some required fields are missing. Go back and check.'
    return
  }

  saving.value = true
  try {
    await beneficiaryApi.register({
      personal_name: form.personal_name.trim(),
      father_name: form.father_name.trim(),
      grandfather_name: form.grandfather_name.trim() || undefined,
      family_name: form.family_name.trim() || undefined,
      age_at_registration: Number(form.age_at_registration)!,
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
    else apiError.value = e?.message ?? 'Registration failed. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ── Page ── */
.reg-page {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Header ── */
.reg-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.reg-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  color: #86868B;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  transition: all 0.2s;
  flex-shrink: 0;
  text-decoration: none;
}

.reg-back:hover {
  color: var(--text-primary);
  border-color: var(--text-secondary);
}

.reg-title {
  font-size: 1.15rem;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
}

.reg-subtitle {
  font-size: 0.8rem;
  color: #6E6E73;
  margin: 2px 0 0;
}

/* ── Card ── */
.reg-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 32px;
}

/* ── Stages ── */
.stage {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stage__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* ── Slide transitions ── */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.15, 1);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(40px);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-40px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-40px);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

/* ── API error ── */
.reg-api-err {
  font-size: 0.82rem;
  color: var(--error);
  padding: 10px 14px;
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border-radius: 12px;
  margin: 16px 0 0;
}

.err-fade-enter-active { animation: err-in 0.25s ease; }
.err-fade-leave-active { animation: err-in 0.15s ease reverse; }

@keyframes err-in {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Actions ── */
.reg-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.reg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  font-size: 0.85rem;
  font-weight: 500;
  font-family: inherit;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  text-decoration: none;
}

.reg-btn--primary {
  background: var(--primary);
  color: #fff;
  border: none;
}

.reg-btn--primary:hover {
  opacity: 0.88;
}

.reg-btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reg-btn--ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.reg-btn--ghost:hover {
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

.reg-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .reg-card {
    padding: 24px 18px;
    border-radius: 12px;
  }

  .stage__grid {
    grid-template-columns: 1fr;
  }

  .reg-actions {
    flex-direction: column-reverse;
    gap: 10px;
  }

  .reg-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
