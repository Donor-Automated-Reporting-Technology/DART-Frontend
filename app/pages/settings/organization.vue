<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Organisation', href: '/settings/organization', current: true },
    ]"
  >
    <div class="settings-org">

      <!-- ═══ Page Header ═══ -->
      <div class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Organisation</h1>
            <p class="page-subtitle">Update your organisation details</p>
          </div>
          <NuxtLink to="/settings" class="btn-back">
            <AppIcon name="arrow-left" :size="14" />
            <span class="btn-text">Settings</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="skeleton-field" />
        <div class="skeleton-field" />
        <div class="skeleton-field skeleton-field--lg" />
      </div>

      <!-- Form -->
      <form v-else class="ui-form org-form" novalidate @submit.prevent="save">
        <section class="ui-section" aria-labelledby="org-info-h">
          <div class="ui-section-head">
            <h2 id="org-info-h">Organisation profile</h2>
            <p>Shown on your reports and to the people you invite.</p>
          </div>

          <div class="ui-field">
            <label class="ui-label" for="org-name">Organisation name</label>
            <input
              id="org-name"
              v-model="form.name" placeholder="e.g. Hope for Children"
              name="name"
              type="text"
              class="ui-input"
              autocomplete="organization"
              :aria-invalid="errors.name ? 'true' : undefined"
              :aria-describedby="errors.name ? 'org-name-error' : undefined"
              @blur="bv.onBlur('name')"
            >
            <FieldError id="org-name-error" :message="errors.name" />
          </div>

          <div class="ui-field">
            <label class="ui-label" for="org-country">Country</label>
            <select
              id="org-country"
              v-model="form.country"
              name="country"
              class="ui-select"
              :aria-invalid="errors.country ? 'true' : undefined"
              :aria-describedby="errors.country ? 'org-country-error' : undefined"
              @blur="bv.onBlur('country')"
            >
              <option value="" disabled>Select a country</option>
              <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
            </select>
            <FieldError id="org-country-error" :message="errors.country" />
          </div>
        </section>

        <section class="ui-section" aria-labelledby="org-about-h">
          <div class="ui-section-head">
            <h2 id="org-about-h">About</h2>
            <p>A sentence or two on what your organisation does.</p>
          </div>

          <div class="ui-field">
            <label class="ui-label" for="org-desc">Description <span class="ui-optional">(optional)</span></label>
            <textarea
              id="org-desc"
              v-model="form.description" placeholder="What your organisation does, in a sentence or two"
              name="description"
              class="ui-textarea"
              maxlength="1000"
              rows="4"
              aria-describedby="org-desc-count"
            />
            <p id="org-desc-count" class="ui-help count">{{ form.description?.length ?? 0 }} / 1000</p>
          </div>
        </section>

        <p v-if="apiError" class="ui-alert" role="alert">
          <AppIcon name="alert-circle" :size="16" />
          <span>{{ apiError }}</span>
        </p>

        <div class="actions">
          <button
            type="submit"
            class="ui-btn ui-btn--primary"
            :class="{ 'ui-btn--done': showSuccess }"
            :disabled="isSaving"
            :aria-busy="isSaving ? 'true' : undefined"
          >
            <template v-if="isSaving"><span class="ui-spinner" aria-hidden="true" />Saving…</template>
            <template v-else-if="showSuccess">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              Saved
            </template>
            <template v-else>Save changes</template>
          </button>
          <p class="visually-hidden" aria-live="polite">{{ showSuccess ? 'Organisation updated' : '' }}</p>
        </div>
      </form>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { fetchOnboardingStatus, updateOrgProfile } from '../../services/onboardingApi'
import { ApiError } from '../../services/api'
import FieldError from '../../components/interfaces/FieldError.vue'
import { useBlurValidation } from '../../composables/useBlurValidation'

definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'program_manager'],
  permission: 'org.manage',
})

const authStore = useAuthStore()

const loading     = ref(true)
const isSaving    = ref(false)
const apiError    = ref('')
const showSuccess = ref(false)
const errors      = reactive<Record<string, string>>({})

const form = reactive({
  name: '',
  country: '',
  description: '',
})

const countries = [
  'Afghanistan', 'Bangladesh', 'Burkina Faso', 'Burundi', 'Cameroon',
  'Central African Republic', 'Chad', 'Colombia', 'DR Congo',
  'Ethiopia', 'Haiti', 'Iraq', 'Jordan', 'Kenya', 'Lebanon',
  'Libya', 'Mali', 'Mozambique', 'Myanmar', 'Niger', 'Nigeria',
  'Pakistan', 'Palestine', 'Philippines', 'Rwanda', 'Sierra Leone',
  'Somalia', 'South Sudan', 'Sri Lanka', 'Sudan', 'Syria',
  'Tanzania', 'Turkey', 'Uganda', 'Ukraine', 'Yemen', 'Zimbabwe',
]

onMounted(async () => {
  try {
    const status = await fetchOnboardingStatus()
    const org = (status as any).org_profile ?? (status as any).orgProfile ?? {}
    form.name = org.name ?? authStore.orgName ?? ''
    form.country = org.country ?? ''
    form.description = org.description ?? ''
  } catch {
    form.name = authStore.orgName ?? ''
  } finally {
    loading.value = false
  }
})

function validate(): boolean {
  Object.keys(errors).forEach(k => delete errors[k])
  let ok = true
  if (!form.name.trim()) { errors.name = 'Organisation name is required'; ok = false }
  if (!form.country) { errors.country = 'Country is required'; ok = false }
  return ok
}

const bv = useBlurValidation({
  get: () => errors,
  set: next => { Object.keys(errors).forEach(k => delete errors[k]); Object.assign(errors, next) },
  validate,
  value: f => (form as Record<string, string>)[f],
  fields: ['name', 'country'],
})

async function save() {
  apiError.value = ''
  showSuccess.value = false
  if (!validate()) return

  const orgId = authStore.orgId
  if (!orgId) { apiError.value = 'Organisation ID missing — please refresh'; return }

  isSaving.value = true
  try {
    await updateOrgProfile(orgId, {
      name: form.name.trim(),
      country: form.country,
      description: form.description?.trim() || undefined,
    } as any)
    authStore.setOrgName(form.name.trim())
    showSuccess.value = true
    setTimeout(() => { showSuccess.value = false }, 3000)
  } catch (e: any) {
    if (e instanceof ApiError && e.data?.errors) Object.assign(errors, e.data.errors)
    else apiError.value = e?.message ?? 'Save failed — please try again'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.settings-org {
  max-width: 640px;
}

/* ═══ Page Header ═══ */
.page-header {
  margin-bottom: 32px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--text-quiet);
  margin: 0;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 400;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 0.15s ease, color 0.15s ease;
  min-height: 40px;
}
.btn-back:hover { border-color: var(--primary); text-decoration: none; }

/* ═══ Loading Skeleton ═══ */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-field {
  height: 56px;
  background: var(--bg-card);
  border-radius: 8px;
  animation: pulse 1.6s ease-in-out infinite;
}

.skeleton-field--lg {
  height: 88px;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.3; }
}

/* ═══ Form ═══ */
.org-form {
  padding: 32px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 16px;
}
.count { text-align: right; }
.actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

/* ═══ Responsive ═══ */
@media (max-width: 640px) {
  .header-row { flex-direction: column; gap: 8px; }
  .btn-text { display: none; }
  .org-form { padding: 24px 16px; }
  .actions .ui-btn { width: 100%; }
}
</style>
