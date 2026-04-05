<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Framework', href: '/settings/framework', current: true },
    ]"
  >
    <div class="settings-fw">
      <div class="page-header">
        <h1 class="page-title">Framework</h1>
        <p class="page-subtitle">Configure your project framework and activities.</p>
      </div>

      <!-- Loading -->
      <div v-if="store.loading && !store.currentFramework" class="loading-msg">Loading framework…</div>

      <!-- No framework yet -->
      <div v-else-if="!store.currentFramework" class="empty-state">
        <p>No framework configured yet. Complete onboarding or create one below.</p>
        <button class="btn-primary" @click="showCreateForm = true" v-if="!showCreateForm">
          Create Framework
        </button>
      </div>

      <!-- Framework form -->
      <form
        v-if="store.currentFramework || showCreateForm"
        class="fw-form"
        @submit.prevent="saveFramework"
      >
        <div class="section-title">Project Details</div>

        <div class="form-grid">
          <!-- Framework type -->
          <div class="field">
            <label class="field-label" for="fw-type">Framework type</label>
            <select id="fw-type" v-model="form.framework_type" class="field-input">
              <option value="child_protection">Child Protection</option>
              <option value="education">Education</option>
              <option value="health">Health</option>
              <option value="wash">WASH</option>
              <option value="livelihoods">Livelihoods</option>
            </select>
          </div>

          <!-- Project name -->
          <div class="field">
            <label class="field-label" for="fw-project">Project name</label>
            <input
              id="fw-project"
              v-model="form.project_name"
              type="text"
              class="field-input"
              placeholder="e.g. DRA SSJR 2024-2026"
            />
          </div>

          <!-- Partner name -->
          <div class="field">
            <label class="field-label" for="fw-partner">Partner name</label>
            <input
              id="fw-partner"
              v-model="form.partner_name"
              type="text"
              class="field-input"
              placeholder="e.g. SSWOCO"
            />
          </div>

          <!-- Reporting to -->
          <div class="field">
            <label class="field-label" for="fw-reporting">Reporting to</label>
            <input
              id="fw-reporting"
              v-model="form.reporting_to"
              type="text"
              class="field-input"
              placeholder="e.g. War Child Holland"
            />
          </div>

          <!-- Period start -->
          <div class="field">
            <label class="field-label" for="fw-start">Period start</label>
            <input
              id="fw-start"
              v-model="form.period_start"
              type="date"
              class="field-input"
            />
          </div>

          <!-- Period end -->
          <div class="field">
            <label class="field-label" for="fw-end">Period end</label>
            <input
              id="fw-end"
              v-model="form.period_end"
              type="date"
              class="field-input"
            />
          </div>
        </div>

        <!-- API error -->
        <p v-if="fwError" class="api-err">{{ fwError }}</p>

        <div class="actions">
          <NuxtLink to="/settings" class="btn-secondary">Back</NuxtLink>
          <button type="submit" class="btn-primary" :disabled="fwSaving">
            <span v-if="fwSaving" class="btn-spinner" />
            {{ fwSaving ? 'Saving…' : 'Save project details' }}
          </button>
        </div>

        <!-- Success toast -->
        <div v-if="fwSuccess" class="toast-success">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Framework updated
        </div>
      </form>

      <!-- Activities section -->
      <div v-if="store.currentFramework" class="activities-section">
        <div class="section-title">Activities</div>
        <p class="section-desc">Toggle activities on or off. Set a target count for each active activity.</p>

        <div v-if="store.frameworkActivities.length === 0 && !store.loading" class="empty-state">
          <p>No activities found for this framework type.</p>
        </div>

        <div class="activities-list">
          <ActivityTargetRow
            v-for="fa in store.frameworkActivities"
            :key="fa.id"
            :name="fa.template?.name ?? 'Activity'"
            :description="fa.template?.description"
            :model-active="fa.is_active"
            :target-count="fa.target_count"
            :target-unit="fa.target_unit || 'children'"
            @update:model-active="handleToggle(fa.id, $event)"
            @update:target-count="handleTargetCount(fa.id, $event, fa.target_unit || 'children')"
            @update:target-unit="handleTargetUnit(fa.id, fa.target_count, $event)"
          />
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useFrameworkStore } from '../../stores/framework'
import { useAuthStore } from '../../stores/auth'
import { frameworkApi } from '../../services/frameworkApi'
import { ApiError } from '../../services/api'
import type { FrameworkType } from '../../interfaces/framework'
import ActivityTargetRow from '../../components/settings/ActivityTargetRow.vue'

definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'program_manager'],
})

const store = useFrameworkStore()
const authStore = useAuthStore()

const showCreateForm = ref(false)
const fwSaving = ref(false)
const fwError = ref('')
const fwSuccess = ref(false)

const form = reactive({
  framework_type: 'child_protection' as FrameworkType,
  project_name: '',
  partner_name: '',
  reporting_to: '',
  period_start: '',
  period_end: '',
})

// Seed form from current framework
function seedForm() {
  const fw = store.currentFramework
  if (!fw) return
  form.framework_type = fw.framework_type
  form.project_name = fw.project_name ?? ''
  form.partner_name = fw.partner_name ?? ''
  form.reporting_to = fw.reporting_to ?? ''
  form.period_start = fw.period_start?.slice(0, 10) ?? ''
  form.period_end = fw.period_end?.slice(0, 10) ?? ''
}

watch(() => store.currentFramework, seedForm)

onMounted(async () => {
  await store.fetchFramework()
  seedForm()
  if (store.currentFramework) {
    await store.fetchActivities()
  }
})

async function saveFramework() {
  fwError.value = ''
  fwSuccess.value = false

  if (!form.project_name.trim()) { fwError.value = 'Project name is required'; return }
  if (!form.period_start || !form.period_end) { fwError.value = 'Period start and end are required'; return }
  if (form.period_end < form.period_start) { fwError.value = 'End date must be after start date'; return }

  fwSaving.value = true
  try {
    if (store.currentFramework) {
      await frameworkApi.updateFramework(store.currentFramework.id, {
        framework_type: form.framework_type,
        project_name: form.project_name.trim(),
        partner_name: form.partner_name.trim(),
        reporting_to: form.reporting_to.trim(),
        period_start: form.period_start,
        period_end: form.period_end,
      })
    } else {
      await frameworkApi.createFramework({
        framework_type: form.framework_type,
        project_name: form.project_name.trim(),
        partner_name: form.partner_name.trim(),
        reporting_to: form.reporting_to.trim(),
        period_start: form.period_start,
        period_end: form.period_end,
      })
    }
    await store.fetchFramework()
    if (store.currentFramework) {
      await store.fetchActivities()
      // Sync sidebar
      authStore.setFrameworkActivities(store.frameworkActivities)
    }
    showCreateForm.value = false
    fwSuccess.value = true
    setTimeout(() => { fwSuccess.value = false }, 3000)
  } catch (e: any) {
    fwError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Save failed')
  } finally {
    fwSaving.value = false
  }
}

// Debounce target saves
let targetTimer: ReturnType<typeof setTimeout> | null = null

async function handleToggle(activityId: string, isActive: boolean) {
  await store.toggleActivity(activityId, isActive)
  authStore.setFrameworkActivities(store.frameworkActivities)
}

function handleTargetCount(activityId: string, count: number, unit: string) {
  if (targetTimer) clearTimeout(targetTimer)
  targetTimer = setTimeout(() => {
    store.setTarget(activityId, count, unit)
  }, 600)
}

function handleTargetUnit(activityId: string, count: number, unit: string) {
  if (targetTimer) clearTimeout(targetTimer)
  targetTimer = setTimeout(() => {
    store.setTarget(activityId, count, unit)
  }, 300)
}
</script>

<style scoped>
.settings-fw {
  max-width: 680px;
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

.empty-state {
  padding: 20px 0;
}

.empty-state p {
  font-size: 0.84rem;
  color: var(--text-muted);
  margin: 0 0 12px;
}

/* ── Section ──────────────────────────────────────────────────────────────── */
.section-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.section-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: -8px 0 14px;
}

/* ── Form ─────────────────────────────────────────────────────────────────── */
.fw-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

@media (max-width: 560px) {
  .form-grid { grid-template-columns: 1fr; }
}

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
}

.field-input {
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

.field-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-dim);
}

select.field-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 32px;
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

/* ── Activities ───────────────────────────────────────────────────────────── */
.activities-section {
  margin-top: 8px;
}

.activities-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
