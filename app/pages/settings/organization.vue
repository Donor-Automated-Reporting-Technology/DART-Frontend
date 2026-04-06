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
      <form v-else class="org-form" @submit.prevent="save">
        <!-- Org name -->
        <div class="form-section">
          <div class="section-label">Organisation info</div>
          <div class="section-card">
            <div class="field">
              <label class="field-label" for="org-name">Organisation name</label>
              <input
                id="org-name"
                v-model="form.name"
                type="text"
                class="field-input"
                :class="{ 'is-error': errors.name }"
                placeholder="Your organisation name"
              />
              <span v-if="errors.name" class="err-msg">{{ errors.name }}</span>
            </div>

            <div class="field">
              <label class="field-label" for="org-country">Country</label>
              <select
                id="org-country"
                v-model="form.country"
                class="field-input"
                :class="{ 'is-error': errors.country }"
              >
                <option value="" disabled>Select a country</option>
                <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
              </select>
              <span v-if="errors.country" class="err-msg">{{ errors.country }}</span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="form-section">
          <div class="section-label">About</div>
          <div class="section-card">
            <div class="field">
              <label class="field-label" for="org-desc">
                Description
                <span class="optional">optional</span>
              </label>
              <textarea
                id="org-desc"
                v-model="form.description"
                class="field-textarea"
                placeholder="Brief description of your organisation…"
                maxlength="1000"
                rows="3"
              />
              <div class="textarea-meta">
                <span class="char-count" :class="{ warn: (form.description?.length ?? 0) > 900 }">
                  {{ form.description?.length ?? 0 }}&thinsp;/&thinsp;1000
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- API error -->
        <div v-if="apiError" class="api-err">
          <AppIcon name="alert-circle" :size="14" />
          {{ apiError }}
        </div>

        <!-- Actions -->
        <div class="actions">
          <button type="submit" class="btn-primary" :disabled="isSaving">
            <span v-if="isSaving" class="btn-spinner" />
            {{ isSaving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>

        <!-- Success toast -->
        <Transition name="toast">
          <div v-if="showSuccess" class="toast-success">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            Organisation updated
          </div>
        </Transition>
      </form>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { fetchOnboardingStatus, updateOrgProfile } from '../../services/onboardingApi'
import { ApiError } from '../../services/api'

definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'program_manager'],
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
  max-width: 600px;
}

/* ═══ Page Header ═══ */
.page-header {
  margin-bottom: 24px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 750;
  color: var(--text-primary);
  margin: 0 0 2px;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
  min-height: 36px;
}
.btn-back:hover { border-color: var(--text-muted); color: var(--text-primary); }

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
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ═══ Form Sections ═══ */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 0.72rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding-left: 2px;
}

.section-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 18px;
}

/* ═══ Fields ═══ */
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 5px;
}

.optional {
  font-size: 0.65rem;
  font-weight: 400;
  color: var(--text-muted);
  opacity: 0.7;
}

.field-input,
.field-textarea {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.845rem;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.field-input:focus,
.field-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
}

.field-input.is-error,
.field-textarea.is-error {
  border-color: var(--error);
}

select.field-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 10px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 32px;
}

.field-textarea {
  resize: vertical;
  line-height: 1.5;
}

.textarea-meta {
  display: flex;
  justify-content: flex-end;
}

.char-count {
  font-size: 0.68rem;
  color: var(--text-muted);
  opacity: 0.6;
}

.char-count.warn { color: var(--error); opacity: 1; }

.err-msg {
  font-size: 0.72rem;
  color: var(--error);
}

.api-err {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--error);
  padding: 10px 14px;
  background: var(--error-bg);
  border: 1px solid rgba(248, 113, 113, 0.12);
  border-radius: 8px;
  margin: 0;
}

/* ═══ Actions ═══ */
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  font-family: inherit;
  min-height: 40px;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ═══ Toast ═══ */
.toast-success {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: color-mix(in srgb, var(--success) 10%, var(--bg-panel));
  border: 1px solid color-mix(in srgb, var(--success) 25%, transparent);
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--success);
}

.toast-enter-active { transition: all 0.2s ease-out; }
.toast-leave-active { transition: all 0.15s ease-in; }
.toast-enter-from { opacity: 0; transform: translateY(4px); }
.toast-leave-to { opacity: 0; }

/* ═══ Responsive ═══ */
@media (max-width: 640px) {
  .header-row { flex-direction: column; gap: 10px; }
  .btn-text { display: none; }
  .section-card { padding: 14px; }
}
</style>
