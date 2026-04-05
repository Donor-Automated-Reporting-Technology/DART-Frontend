<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Organisation', href: '/settings/organization', current: true },
    ]"
  >
    <div class="settings-org">
      <div class="page-header">
        <h1 class="page-title">Organisation</h1>
        <p class="page-subtitle">Update your organisation details.</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-msg">Loading organisation data…</div>

      <!-- Form -->
      <form v-else class="org-form" @submit.prevent="save">
        <!-- Org name -->
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

        <!-- Country -->
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

        <!-- Description -->
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

        <!-- API error -->
        <p v-if="apiError" class="api-err">{{ apiError }}</p>

        <!-- Actions -->
        <div class="actions">
          <NuxtLink to="/settings" class="btn-secondary">Back</NuxtLink>
          <button type="submit" class="btn-primary" :disabled="isSaving">
            <span v-if="isSaving" class="btn-spinner" />
            {{ isSaving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>

        <!-- Success toast -->
        <div v-if="showSuccess" class="toast-success">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Organisation updated
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
  max-width: 540px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
}

.loading-msg {
  font-size: 0.84rem;
  color: var(--text-muted);
  padding: 24px 0;
}

.org-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ── Fields ───────────────────────────────────────────────────────────────── */
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

.field-input,
.field-textarea {
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
  background-position: right 8px center;
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
  font-size: 0.78rem;
  color: var(--error);
  padding: 8px 12px;
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border-radius: var(--radius-sm);
  margin: 0;
}

/* ── Actions ──────────────────────────────────────────────────────────────── */
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.btn-secondary:hover {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Toast ────────────────────────────────────────────────────────────────── */
.toast-success {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: color-mix(in srgb, var(--success) 12%, var(--bg-panel));
  border: 1px solid var(--success);
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--success);
}
</style>
