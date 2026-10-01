<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="project-edit">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ project?.project_name || 'Project' }}</h1>
          <p class="page-subtitle">Configure project details and toggle activities.</p>
        </div>
        <NuxtLink to="/settings/projects" class="btn-back">
          <AppIcon name="arrow-left" :size="14" /> All projects
        </NuxtLink>
      </div>

      <!-- Sub-navigation -->
      <div class="sub-nav">
        <span class="sub-nav-item sub-nav-item--active">
          <AppIcon name="settings" :size="13" /> Project settings
        </span>
        <NuxtLink :to="`/settings/projects/${projectId}/logframe`" class="sub-nav-item">
          <AppIcon name="target" :size="13" /> M&E Logframe
        </NuxtLink>
      </div>

      <!-- Loading -->
      <div v-if="loading && !project" class="state state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>

      <!-- Not found -->
      <div v-else-if="loadError" class="state state--error">
        <AppIcon name="alert-circle" :size="18" /> {{ loadError }}
      </div>

      <template v-else-if="project">
        <!-- ─── Project details ─── -->
        <form class="form" @submit.prevent="saveProject">
          <div class="section-label">Project details</div>
          <div class="section-card">
            <div class="form-grid">
              <div class="field">
                <label class="field-label" for="pe-type">Framework type</label>
                <select id="pe-type" v-model="form.framework_type" class="field-input" disabled>
                  <option value="child_protection">Child Protection</option>
                  <option value="education">Education</option>
                  <option value="health">Health</option>
                  <option value="wash">WASH</option>
                  <option value="livelihoods">Livelihoods</option>
                </select>
                <span class="field-hint">Framework type is locked once configured.</span>
              </div>

              <div class="field">
                <label class="field-label" for="pe-name">Project name *</label>
                <input id="pe-name" v-model="form.project_name" type="text" class="field-input" />
              </div>

              <div class="field">
                <label class="field-label" for="pe-partner">Partner name</label>
                <input id="pe-partner" v-model="form.partner_name" type="text" class="field-input" />
              </div>

              <div class="field">
                <label class="field-label" for="pe-reporting">Reporting to</label>
                <input id="pe-reporting" v-model="form.reporting_to" type="text" class="field-input" />
              </div>

              <div class="field">
                <label class="field-label" for="pe-start">Period start *</label>
                <input id="pe-start" v-model="form.period_start" type="date" class="field-input" />
              </div>

              <div class="field">
                <label class="field-label" for="pe-end">Period end *</label>
                <input id="pe-end" v-model="form.period_end" type="date" class="field-input" />
              </div>
            </div>
          </div>

          <div v-if="fwError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ fwError }}</div>

          <div class="actions">
            <button type="submit" class="btn-primary" :disabled="fwSaving">
              <span v-if="fwSaving" class="btn-spinner" />
              {{ fwSaving ? 'Saving…' : 'Save details' }}
            </button>
          </div>

          <Transition name="toast">
            <div v-if="fwSuccess" class="toast-success">Project updated</div>
          </Transition>
        </form>

        <!-- ─── Project Target ─── -->
        <div class="activities-section">
          <div class="section-label">Project Target</div>
          <p class="section-hint">Overall beneficiary target for this project, broken down by gender and disability.</p>
          <div class="section-card">
            <div class="target-summary">
              <span class="target-total-label">Total target</span>
              <span class="target-total-value">{{ targetForm.target_girls + targetForm.target_boys }}</span>
            </div>
            <div class="form-grid">
              <div class="field">
                <label class="field-label" for="pt-girls">Girls *</label>
                <input id="pt-girls" v-model.number="targetForm.target_girls" type="number" min="0" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label" for="pt-boys">Boys *</label>
                <input id="pt-boys" v-model.number="targetForm.target_boys" type="number" min="0" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label" for="pt-girls-d">Girls with disability</label>
                <input id="pt-girls-d" v-model.number="targetForm.target_girls_disability" type="number" min="0" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label" for="pt-boys-d">Boys with disability</label>
                <input id="pt-boys-d" v-model.number="targetForm.target_boys_disability" type="number" min="0" class="field-input" />
              </div>
            </div>
          </div>

          <div v-if="ptError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ ptError }}</div>

          <div class="actions">
            <Transition name="toast">
              <span v-if="ptSuccess" class="save-feedback save-feedback--ok"><AppIcon name="check-circle" :size="14" /> Saved</span>
            </Transition>
            <button class="btn-primary" :disabled="ptSaving" @click="saveProjectTarget">
              <span v-if="ptSaving" class="btn-spinner" />
              {{ ptSaving ? 'Saving…' : 'Save project target' }}
            </button>
          </div>
        </div>

        <!-- ─── Activities ─── -->
        <div class="activities-section">
          <div class="section-label">Activities</div>
          <p class="section-hint">Toggle activities on or off and set their targets.</p>

          <div v-if="!activities.length" class="empty-inline">No activities found for this framework type.</div>

          <div class="activities-list">
            <ActivityTargetRow
              v-for="fa in activities"
              :key="fa.id"
              :name="fa.template?.name ?? 'Activity'"
              :description="fa.template?.description"
              :model-active="fa.is_active"
              :target-count="fa.target_count"
              :target-unit="fa.target_unit || 'children'"
              :target-girls="(fa as any).target_girls ?? 0"
              :target-boys="(fa as any).target_boys ?? 0"
              :target-girls-disability="(fa as any).target_girls_disability ?? 0"
              :target-boys-disability="(fa as any).target_boys_disability ?? 0"
              @update:model-active="handleToggle(fa.id, $event)"
              @update:target-count="handleTargetCount(fa.id, $event, fa.target_unit || 'children')"
              @update:target-unit="handleTargetUnit(fa.id, fa.target_count, $event)"
              @update:breakdown="handleBreakdown(fa.id, $event)"
            />
          </div>

          <div v-if="atError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ atError }}</div>

          <div class="actions">
            <Transition name="toast">
              <span v-if="atSuccess" class="save-feedback save-feedback--ok"><AppIcon name="check-circle" :size="14" /> Saved</span>
            </Transition>
            <button class="btn-primary" :disabled="atSaving || !activities.length" @click="saveActivityTargets">
              <span v-if="atSaving" class="btn-spinner" />
              {{ atSaving ? 'Saving…' : 'Save activity targets' }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { frameworkApi } from '../../../../services/frameworkApi'
// cfsApi import removed — grant targets deprecated in favour of project targets
import { ApiError } from '../../../../services/api'
import { useAuthStore } from '../../../../stores/auth'
import type { Framework, FrameworkActivity, FrameworkType } from '../../../../interfaces/framework'
import ActivityTargetRow from '../../../../components/settings/ActivityTargetRow.vue'

definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'program_manager'],
})

const route = useRoute()
const projectId = route.params.id as string
const authStore = useAuthStore()

const project = ref<Framework | null>(null)
const activities = ref<FrameworkActivity[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)

const breadcrumbs = computed(() => [
  { title: 'Settings', href: '/settings' },
  { title: 'Projects', href: '/settings/projects' },
  { title: project.value?.project_name ?? 'Project', href: `/settings/projects/${projectId}`, current: true },
])

const form = reactive({
  framework_type: 'child_protection' as FrameworkType,
  project_name: '',
  partner_name: '',
  reporting_to: '',
  period_start: '',
  period_end: '',
})

const fwSaving = ref(false)
const fwError = ref('')
const fwSuccess = ref(false)

function seedForm() {
  if (!project.value) return
  form.framework_type = project.value.framework_type
  form.project_name = project.value.project_name ?? ''
  form.partner_name = project.value.partner_name ?? ''
  form.reporting_to = project.value.reporting_to ?? ''
  form.period_start = project.value.period_start?.slice(0, 10) ?? ''
  form.period_end = project.value.period_end?.slice(0, 10) ?? ''
  // Hydrate project target
  targetForm.target_girls = project.value.target_girls ?? 0
  targetForm.target_boys = project.value.target_boys ?? 0
  targetForm.target_girls_disability = project.value.target_girls_disability ?? 0
  targetForm.target_boys_disability = project.value.target_boys_disability ?? 0
}

async function fetchProject() {
  loading.value = true
  loadError.value = null
  try {
    const res = await frameworkApi.listFrameworks()
    project.value = (res.frameworks ?? []).find((f) => f.id === projectId) ?? null
    if (!project.value) { loadError.value = 'Project not found'; return }
    seedForm()
    await fetchActivities()
    // Grant targets deprecated — project-level targets used instead
  } catch (e: any) {
    loadError.value = e?.message ?? 'Failed to load project'
  } finally {
    loading.value = false
  }
}

async function fetchActivities() {
  if (!project.value) return
  const res = await frameworkApi.getActivities(project.value.id)
  const raw = (res as any).activities ?? []
  activities.value = raw.map((item: any) => ({
    id: item.id,
    framework_id: project.value!.id,
    activity_template_id: item.activity_template_id ?? '',
    is_active: item.is_active ?? false,
    target_count: item.target_count ?? 0,
    target_unit: item.target_unit ?? 'children',
    target_girls: item.target_girls ?? 0,
    target_boys: item.target_boys ?? 0,
    target_girls_disability: item.target_girls_disability ?? 0,
    target_boys_disability: item.target_boys_disability ?? 0,
    custom_config: item.custom_config ?? item.default_config ?? null,
    created_at: item.created_at ?? '',
    updated_at: item.updated_at ?? '',
    template: item.template ?? {
      id: item.activity_template_id ?? '',
      framework_type: project.value!.framework_type,
      name: item.activity_name ?? item.name ?? 'Activity',
      code: item.activity_code ?? item.code ?? '',
      description: item.description ?? '',
      pattern_type: item.pattern_type ?? 'daily_attendance',
      default_config: item.default_config ?? null,
      created_at: item.created_at ?? '',
    },
  }))
}

async function saveProject() {
  fwError.value = ''
  fwSuccess.value = false
  if (!form.project_name.trim()) { fwError.value = 'Project name is required'; return }
  if (!form.period_start || !form.period_end) { fwError.value = 'Period start and end are required'; return }
  if (form.period_end < form.period_start) { fwError.value = 'End date must be after start date'; return }

  fwSaving.value = true
  try {
    await frameworkApi.updateFramework(projectId, {
      project_name: form.project_name.trim(),
      partner_name: form.partner_name.trim(),
      reporting_to: form.reporting_to.trim(),
      period_start: form.period_start,
      period_end: form.period_end,
    })
    await fetchProject()
    fwSuccess.value = true
    setTimeout(() => { fwSuccess.value = false }, 3000)
  } catch (e: any) {
    fwError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Save failed')
  } finally {
    fwSaving.value = false
  }
}

// Activity toggling / targets

// Project-level target
const targetForm = reactive({
  target_girls: 0,
  target_boys: 0,
  target_girls_disability: 0,
  target_boys_disability: 0,
})
const ptSaving = ref(false)
const ptError = ref('')
const ptSuccess = ref(false)

async function saveProjectTarget() {
  ptError.value = ''
  ptSuccess.value = false

  if (targetForm.target_girls + targetForm.target_boys === 0) {
    ptError.value = 'Total target (girls + boys) must be greater than zero'
    return
  }
  if (targetForm.target_girls_disability > targetForm.target_girls) {
    ptError.value = 'Girls with disability cannot exceed total girls'
    return
  }
  if (targetForm.target_boys_disability > targetForm.target_boys) {
    ptError.value = 'Boys with disability cannot exceed total boys'
    return
  }

  ptSaving.value = true
  try {
    await frameworkApi.setProjectTarget(projectId, {
      target_girls: targetForm.target_girls,
      target_boys: targetForm.target_boys,
      target_girls_disability: targetForm.target_girls_disability,
      target_boys_disability: targetForm.target_boys_disability,
    })
    await fetchProject()
    ptSuccess.value = true
    setTimeout(() => { ptSuccess.value = false }, 3000)
  } catch (e: any) {
    ptError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Save failed')
  } finally {
    ptSaving.value = false
  }
}

async function handleToggle(activityId: string, isActive: boolean) {
  await frameworkApi.toggleActivity(projectId, activityId, { is_active: isActive })
  await fetchActivities()
  authStore.setFrameworkActivities(activities.value)
}

function handleTargetCount(activityId: string, count: number, _unit: string) {
  const fa = activities.value.find((a) => a.id === activityId) as any
  if (fa) fa.target_count = count
}

function handleTargetUnit(activityId: string, _count: number, unit: string) {
  const fa = activities.value.find((a) => a.id === activityId) as any
  if (fa) fa.target_unit = unit
}

function handleBreakdown(activityId: string, breakdown: { target_girls: number; target_boys: number; target_girls_disability: number; target_boys_disability: number }) {
  const fa = activities.value.find((a) => a.id === activityId) as any
  if (fa) {
    fa.target_girls = breakdown.target_girls
    fa.target_boys = breakdown.target_boys
    fa.target_girls_disability = breakdown.target_girls_disability
    fa.target_boys_disability = breakdown.target_boys_disability
    fa.target_count = breakdown.target_girls + breakdown.target_boys
  }
}

// Activity batch save
const atSaving = ref(false)
const atError = ref('')
const atSuccess = ref(false)

async function saveActivityTargets() {
  atError.value = ''
  atSuccess.value = false
  atSaving.value = true
  try {
    const active = activities.value.filter((fa) => fa.is_active)
    for (const fa of active) {
      await frameworkApi.setTarget(projectId, fa.id, {
        target_count: fa.target_count,
        target_unit: fa.target_unit || 'children',
        target_girls: (fa as any).target_girls ?? 0,
        target_boys: (fa as any).target_boys ?? 0,
        target_girls_disability: (fa as any).target_girls_disability ?? 0,
        target_boys_disability: (fa as any).target_boys_disability ?? 0,
      })
    }
    await fetchActivities()
    atSuccess.value = true
    setTimeout(() => { atSuccess.value = false }, 3000)
  } catch (e: any) {
    atError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Save failed')
  } finally {
    atSaving.value = false
  }
}

// Grant targets — DEPRECATED (replaced by project-level targets above)

onMounted(fetchProject)
</script>

<style scoped>
.project-edit { max-width: 760px; padding-bottom: 48px; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  margin-bottom: 24px;
}
.page-title { font-size: 1.35rem; font-weight: 750; margin: 0 0 2px; }
.page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin: 0; }.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-decoration: none;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.sub-nav {
  display: flex;
  gap: 4px;
  margin: 18px 0 4px;
  border-bottom: 1px solid var(--border-color);
}
.sub-nav-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.sub-nav-item:hover {
  color: var(--text-primary);
}
.sub-nav-item--active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.section-label {
  font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-muted); margin: 24px 0 6px; padding-left: 2px;
}
.section-hint { font-size: 0.78rem; color: var(--text-muted); margin: -2px 0 10px; padding-left: 2px; }

.section-card {
  background: var(--bg-panel); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 18px;
}
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); }
.field-input {
  width: 100%; padding: 8px 10px; font-size: 0.85rem;
  background: var(--bg-input); border: 1px solid var(--border-color);
  border-radius: 6px;
}
.field-input:disabled { background: var(--bg-surface); color: var(--text-muted); cursor: not-allowed; }
.field-hint { font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }

.api-err {
  display: flex; align-items: center; gap: 6px; margin-top: 16px;
  padding: 10px 12px; font-size: 0.82rem; color: var(--error);
  background: var(--error-bg); border-radius: 6px;
}

.actions { display: flex; justify-content: flex-end; margin-top: 14px; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; font-size: 0.82rem; font-weight: 600;
  background: var(--accent); color: white; border: none; border-radius: 8px;
  cursor: pointer;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-spinner {
  width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.toast-success {
  margin-top: 10px; padding: 8px 12px; font-size: 0.78rem;
  background: var(--success-bg); color: var(--success); border-radius: 6px; display: inline-block;
}
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; }

.activities-section { margin-top: 12px; }
.activities-list { display: flex; flex-direction: column; gap: 8px; }

.target-summary {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0 14px; margin-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}
.target-total-label { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
.target-total-value { font-size: 1.2rem; font-weight: 750; color: var(--primary); }

.empty-inline {
  padding: 14px; font-size: 0.82rem; color: var(--text-muted);
  background: var(--bg-surface); border-radius: 8px;
}

.state { padding: 40px; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-muted); }
.state--error { color: var(--error); }
.pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); animation: pulse 1.4s infinite; }
.pulse-dot:nth-child(2) { animation-delay: 0.2s; }
.pulse-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }

/* ── Inline save feedback ── */
.save-feedback {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  font-weight: 500;
}
.save-feedback--ok { color: var(--success); }
</style>
