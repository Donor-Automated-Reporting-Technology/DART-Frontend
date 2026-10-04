<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="impact-page">
      <!-- Header -->
      <header class="page-header">
        <div class="page-header-text">
          <span class="page-eyebrow">Impact</span>
          <h1 class="page-title">{{ impact?.title ?? 'Impact' }}</h1>
          <p class="page-subtitle">Indicator, numerical targets and the activities that feed them.</p>
        </div>
        <NuxtLink :to="`/settings/projects/${projectId}/logframe`" class="btn-back">
          &larr; Back to logframe
        </NuxtLink>
      </header>

      <!-- Loading / error -->
      <div v-if="loading" class="state state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>
      <div v-else-if="loadError" class="state state--error">
        {{ loadError }}
      </div>

      <template v-else-if="impact">
        <!-- ═══ Indicator card ═══ -->
        <div class="section-label">Indicator</div>
        <div class="section-card indicator-card">
          <div class="indicator-head">
            <span v-if="indicator?.code" class="indicator-code">{{ indicator.code }}</span>
            <span v-else class="indicator-code indicator-code--muted">new</span>
            <span class="indicator-status">
              {{ hasIndicator ? 'Saved' : 'Not saved yet' }}
            </span>
          </div>

          <div class="field">
            <label class="field-label" for="im-ind">Indicator statement *</label>
            <textarea
              id="im-ind"
              v-model="form.indicator"
              rows="2"
              class="field-input"
              placeholder="e.g. % of targeted persons reporting an increased sense of safety & well-being"
            ></textarea>
          </div>

          <div class="form-grid">
            <div class="field">
              <label class="field-label" for="im-code">Code</label>
              <input id="im-code" v-model="form.code" type="text" class="field-input" placeholder="e.g. PRO-RO1" />
            </div>
            <div class="field">
              <label class="field-label" for="im-def">Definition</label>
              <input id="im-def" v-model="form.definition" type="text" class="field-input" placeholder="How to measure" />
            </div>
          </div>
        </div>

        <!-- ═══ Customisable targets ═══ -->
        <div class="section-label">Customise targets</div>
        <p class="section-hint">Add input fields for the target (and any extra fields you need), then save.</p>
        <div class="section-card">
          <div class="form-grid">
            <div class="field">
              <label class="field-label" for="im-tv">Target value</label>
              <input id="im-tv" v-model.number="form.target_value" type="number" step="any" class="field-input" placeholder="e.g. 1200" />
            </div>
            <div class="field">
              <label class="field-label" for="im-unit">Unit</label>
              <input id="im-unit" v-model="form.unit" type="text" class="field-input" placeholder="e.g. persons, %" />
            </div>
            <div class="field">
              <label class="field-label" for="im-ty">Target year</label>
              <input id="im-ty" v-model.number="form.target_year" type="number" min="1900" max="2100" class="field-input" />
            </div>
            <div class="field">
              <label class="field-label" for="im-bv">Baseline value</label>
              <input id="im-bv" v-model.number="form.baseline_value" type="number" step="any" class="field-input" />
            </div>
            <div class="field">
              <label class="field-label" for="im-by">Baseline year</label>
              <input id="im-by" v-model.number="form.baseline_year" type="number" min="1900" max="2100" class="field-input" />
            </div>
          </div>

          <TargetFieldsEditor
            v-model="form.target_fields"
            label="Target fields"
            hint="Add as many fields as you need — e.g. Girls, Boys, Persons with disability — each with its own value type and unit."
          />

          <CustomFieldsEditor
            v-model="form.custom_fields"
            label="Other custom fields"
            hint="Any extra key/value data not covered above."
          />

          <div v-if="saveError" class="api-err">{{ saveError }}</div>
          <div class="actions">
            <Transition name="fade">
              <span v-if="saveSuccess" class="save-ok">Saved</span>
            </Transition>
            <button class="btn-primary" :disabled="saving" @click="saveIndicator">
              <span v-if="saving" class="btn-spinner" /> {{ hasIndicator ? 'Save' : 'Create indicator' }}
            </button>
          </div>
        </div>

        <!-- ═══ Activities ═══ -->
        <div class="section-head">
          <div>
            <div class="section-label">Activities</div>
            <p class="section-hint">Activities belong to this project's logframe. Add the ones from your own logframe, then switch on the ones that feed this indicator.</p>
          </div>
          <button v-if="canManage && !showAddActivity" class="btn-secondary" @click="openAddActivity">
            Add activity
          </button>
        </div>

        <!-- Add a hand-entered activity (from an external logframe) -->
        <div v-if="showAddActivity" class="section-card add-activity">
          <div class="form-grid">
            <div class="field">
              <label class="field-label" for="aa-name">Activity name *</label>
              <input id="aa-name" v-model="addForm.name" type="text" class="field-input" placeholder="e.g. Community sensitisation sessions" />
            </div>
            <div class="field">
              <label class="field-label" for="aa-code">Code</label>
              <input id="aa-code" v-model="addForm.code" type="text" class="field-input" placeholder="e.g. COMM_SENS" />
            </div>
            <div class="field">
              <label class="field-label" for="aa-module">Module *</label>
              <select id="aa-module" v-model="addForm.module" class="field-input">
                <option value="pss">PSS — Psychosocial Support</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label class="field-label" for="aa-desc">Description</label>
            <textarea id="aa-desc" v-model="addForm.description" rows="2" class="field-input" placeholder="Optional"></textarea>
          </div>
          <div v-if="addError" class="api-err">{{ addError }}</div>
          <div class="actions">
            <button type="button" class="btn-ghost" @click="showAddActivity = false">Cancel</button>
            <button type="button" class="btn-primary" :disabled="addSaving" @click="saveActivity">
              <span v-if="addSaving" class="btn-spinner" /> {{ addSaving ? 'Adding…' : 'Add activity' }}
            </button>
          </div>
        </div>

        <div v-if="!activities.length" class="empty-inline">
          No activities yet — use “Add activity” to enter the ones from your logframe.
        </div>

        <p v-if="activities.length && !hasIndicator" class="section-hint">Save the indicator to switch activities on.</p>

        <div v-if="activities.length" class="activity-list" :class="{ 'activity-list--disabled': !hasIndicator }">
          <div v-for="a in activities" :key="a.id" class="activity-row">
            <span class="activity-info">
              <span class="activity-name">{{ activityName(a) }}</span>
              <span class="activity-code">{{ activityCode(a) }}</span>
              <span v-if="a.is_custom" class="activity-custom">{{ (a.module || 'custom').toUpperCase() }}</span>
              <span v-if="a.is_active" class="activity-live">project: on</span>
              <span v-else class="activity-off">project: off</span>
            </span>

            <label class="switch" :class="{ 'switch--disabled': !hasIndicator }">
              <input
                type="checkbox"
                class="switch-input"
                :checked="isLinked(a.id)"
                :disabled="!hasIndicator || toggling[a.id]"
                @change="toggleActivity(a.id, ($event.target as HTMLInputElement).checked)"
              />
              <span class="switch-track"><span class="switch-thumb" /></span>
            </label>
          </div>
        </div>

        <div v-if="toggleError" class="api-err">{{ toggleError }}</div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TargetFieldsEditor from '../../../../../components/settings/TargetFieldsEditor.vue'
import CustomFieldsEditor from '../../../../../components/settings/CustomFieldsEditor.vue'
import { frameworkApi } from '../../../../../services/frameworkApi'
import { logframeApi } from '../../../../../services/logframeApi'
import { ApiError } from '../../../../../services/api'
import { useAuthStore } from '../../../../../stores/auth'
import type { Framework } from '../../../../../interfaces/framework'
import {
  TARGET_FIELDS_KEY,
  type CustomFields,
  type LogframeIndicator,
  type LogframeIndicatorRequest,
  type LogframeLevel,
  type LogframeTargetField,
} from '../../../../../interfaces/logframe'

definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'data_manager', 'program_manager', 'supervisor', 'case_worker', 'facilitator', 'director'],
})

const route = useRoute()
const projectId = route.params.id as string
const impactId = route.params.impactId as string
const authStore = useAuthStore()

const MANAGE_ROLES = ['org_admin', 'data_manager', 'program_manager', 'supervisor']
const canManage = computed(() => MANAGE_ROLES.includes(authStore.userRole ?? ''))

const project = ref<Framework | null>(null)
const impact = ref<LogframeLevel | null>(null)
const indicator = ref<LogframeIndicator | null>(null)
const activities = ref<any[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

const breadcrumbs = computed(() => {
  let impactTitle = impact.value?.title ?? 'Impact'
  if (impactTitle.length > 30) impactTitle = impactTitle.substring(0, 30) + '…'
  return [
    { title: 'Settings', href: '/settings' },
    { title: 'Projects', href: '/settings/projects' },
    { title: project.value?.project_name ?? 'Project', href: `/settings/projects/${projectId}` },
    { title: 'Logframe', href: `/settings/projects/${projectId}/logframe` },
    { title: impactTitle, href: `/settings/projects/${projectId}/impacts/${impactId}`, current: true },
  ]
})

const hasIndicator = computed(() => !!indicator.value)
const linkedIds = computed(() => new Set(indicator.value?.activity_ids ?? []))
function isLinked(activityId: string): boolean {
  return linkedIds.value.has(activityId)
}

function activityName(a: any): string {
  return a?.template?.name ?? a?.activity_name ?? a?.name ?? 'Activity'
}
function activityCode(a: any): string {
  return a?.template?.code ?? a?.activity_code ?? a?.code ?? ''
}

// ─── Form ───

const form = reactive({
  code: '',
  indicator: '',
  definition: '',
  unit: '',
  target_value: null as number | null,
  target_year: null as number | null,
  baseline_value: null as number | null,
  baseline_year: null as number | null,
  target_fields: [] as LogframeTargetField[],
  custom_fields: {} as CustomFields,
})

const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

function seedForm() {
  const ind = indicator.value
  form.code = ind?.code ?? ''
  form.indicator = ind?.indicator ?? ''
  form.definition = ind?.definition ?? ''
  form.unit = ind?.unit ?? ''
  form.target_value = ind?.target_value ?? null
  form.target_year = ind?.target_year ?? null
  form.baseline_value = ind?.baseline_value ?? null
  form.baseline_year = ind?.baseline_year ?? null

  // Target fields are persisted inside custom_fields under a reserved key but
  // edited separately, so split them out when seeding the form.
  const custom = { ...(ind?.custom_fields ?? {}) }
  const stored = custom[TARGET_FIELDS_KEY]
  form.target_fields = Array.isArray(stored) ? (stored as LogframeTargetField[]) : []
  delete custom[TARGET_FIELDS_KEY]
  form.custom_fields = custom
}

/** Target fields with a name, merged back into custom_fields on save. */
function cleanTargetFields(): LogframeTargetField[] {
  return form.target_fields.filter((f) => f.label.trim() !== '')
}

async function fetchAll() {
  loading.value = true
  loadError.value = null
  try {
    const [frameworks, data, activitiesRes] = await Promise.all([
      frameworkApi.listFrameworks(),
      logframeApi.getLogframe(projectId),
      frameworkApi.getActivities(projectId).catch(() => null),
    ])
    project.value = (frameworks.frameworks ?? []).find((f) => f.id === projectId) ?? null
    impact.value = (data.levels ?? []).find((l) => l.id === impactId) ?? null
    if (!impact.value) { loadError.value = 'Impact not found'; return }
    indicator.value = (data.indicators ?? []).find((i) => i.level_id === impactId) ?? null
    activities.value = (activitiesRes as any)?.activities ?? []
    seedForm()
  } catch (e: any) {
    loadError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to load impact')
  } finally {
    loading.value = false
  }
}

function buildPayload(): LogframeIndicatorRequest {
  const ind = indicator.value
  const targetFields = cleanTargetFields()
  return {
    level_id: impactId,
    code: form.code.trim() || null,
    indicator: form.indicator.trim(),
    definition: form.definition.trim() || null,
    unit: form.unit.trim() || null,
    baseline_value: form.baseline_value,
    baseline_year: form.baseline_year,
    baseline_notes: ind?.baseline_notes ?? null,
    target_value: form.target_value,
    target_year: form.target_year,
    means_of_verification: ind?.means_of_verification ?? null,
    assumptions: ind?.assumptions ?? null,
    disaggregation: ind?.disaggregation ?? [],
    data_source: ind?.data_source ?? null,
    external_links: ind?.external_links ?? [],
    sort_order: ind?.sort_order ?? 0,
    custom_fields: {
      ...form.custom_fields,
      ...(targetFields.length ? { [TARGET_FIELDS_KEY]: targetFields } : {}),
    },
  }
}

async function saveIndicator() {
  saveError.value = ''
  saveSuccess.value = false
  if (!form.indicator.trim()) { saveError.value = 'Indicator statement is required'; return }
  saving.value = true
  try {
    const payload = buildPayload()
    if (indicator.value) {
      await logframeApi.updateIndicator(projectId, indicator.value.id, payload)
    } else {
      await logframeApi.createIndicator(projectId, payload)
    }
    const refreshed = await logframeApi.getLogframe(projectId)
    indicator.value = (refreshed.indicators ?? []).find((i) => i.level_id === impactId) ?? null
    seedForm()
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (e: any) {
    saveError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to save indicator')
  } finally {
    saving.value = false
  }
}

// ─── Activity toggles ───

const toggling = reactive<Record<string, boolean>>({})
const toggleError = ref('')

async function toggleActivity(activityId: string, on: boolean) {
  if (!indicator.value) return
  toggleError.value = ''
  toggling[activityId] = true
  try {
    if (on) {
      await logframeApi.linkActivity(projectId, indicator.value.id, { framework_activity_id: activityId })
    } else {
      await logframeApi.unlinkActivity(projectId, indicator.value.id, activityId)
    }
    const refreshed = await logframeApi.getLogframe(projectId)
    indicator.value = (refreshed.indicators ?? []).find((i) => i.level_id === impactId) ?? indicator.value
  } catch (e: any) {
    toggleError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to update activity')
  } finally {
    toggling[activityId] = false
  }
}

// ─── Add activity (hand-entered, from an external logframe) ───

const showAddActivity = ref(false)
const addSaving = ref(false)
const addError = ref('')
const addForm = reactive({
  name: '',
  code: '',
  description: '',
  module: 'pss',
})

function openAddActivity() {
  addError.value = ''
  addForm.name = ''
  addForm.code = ''
  addForm.description = ''
  addForm.module = 'pss'
  showAddActivity.value = true
}

async function saveActivity() {
  addError.value = ''
  if (!addForm.name.trim()) {
    addError.value = 'Activity name is required'
    return
  }
  addSaving.value = true
  try {
    const created = await frameworkApi.addActivity(projectId, {
      name: addForm.name.trim(),
      code: addForm.code.trim() || null,
      description: addForm.description.trim() || null,
      module: addForm.module,
    })
    // Refresh the project activity list.
    const res = await frameworkApi.getActivities(projectId).catch(() => null)
    activities.value = (res as any)?.activities ?? []
    // Link the new activity to the indicator we're editing, so it becomes part
    // of the logframe straight away (and can be switched off again).
    const newId = (created as any)?.activity?.id
    if (newId && indicator.value) {
      await logframeApi.linkActivity(projectId, indicator.value.id, { framework_activity_id: newId })
      const refreshed = await logframeApi.getLogframe(projectId)
      indicator.value = (refreshed.indicators ?? []).find((i) => i.level_id === impactId) ?? indicator.value
    }
    showAddActivity.value = false
  } catch (e: any) {
    addError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to add activity')
  } finally {
    addSaving.value = false
  }
}

onMounted(fetchAll)
</script>

<style scoped>
.impact-page { max-width: 860px; padding-bottom: 48px; }

.page-header {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  flex-wrap: wrap; margin-bottom: 28px; padding: 20px 22px;
  background: var(--bg-panel); border: 1px solid var(--border-color);
  border-left: 3px solid #a78bfa; border-radius: 12px;
}
.page-header-text { min-width: 0; flex: 1; }
.page-eyebrow {
  display: block; margin-bottom: 4px;
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  color: #a78bfa;
}
.page-title { font-size: 1.35rem; font-weight: 750; line-height: 1.3; margin: 0 0 4px; color: var(--text-primary); }
.page-subtitle { font-size: 0.85rem; color: var(--text-secondary); margin: 0; }

.btn-back {
  display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
  font-size: 0.82rem; font-weight: 600; color: var(--text-primary); text-decoration: none;
  padding: 8px 14px; background: var(--bg-input);
  border: 1px solid var(--border-color); border-radius: 8px;
  transition: border-color 0.15s, color 0.15s;
}
.btn-back:hover { border-color: var(--accent); color: var(--accent); }
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; font-size: 0.82rem; font-weight: 600;
  background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-spinner {
  width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.section-label {
  font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-secondary); margin: 28px 0 6px; padding-left: 2px;
}
.section-hint { font-size: 0.8rem; color: var(--text-secondary); margin: -2px 0 10px; padding-left: 2px; }
.section-card {
  background: var(--bg-panel); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 18px;
}
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.field-label { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); }
.field-input {
  width: 100%; padding: 8px 10px; font-size: 0.85rem;
  background: var(--bg-input); border: 1px solid var(--border-color);
  border-radius: 6px; color: var(--text-primary); font-family: inherit;
}
.actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 14px; }
.save-ok { display: inline-flex; align-items: center; gap: 5px; font-size: 0.78rem; color: var(--success); }

.section-head {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
  margin-top: 24px; flex-wrap: wrap;
}
.section-head .section-label { margin: 0 0 6px; }
.section-head .section-hint { margin: 0; max-width: 620px; }
.btn-secondary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 12px; font-size: 0.8rem; font-weight: 600;
  background: var(--bg-surface); color: var(--text-primary);
  border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer;
}
.btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 12px; font-size: 0.8rem; font-weight: 600;
  background: transparent; color: var(--text-secondary);
  border: 1px solid transparent; border-radius: 8px; cursor: pointer;
}
.btn-ghost:hover { color: var(--text-primary); }
.add-activity { margin-bottom: 12px; border-left: 3px solid var(--accent); }
.activity-custom {
  font-size: 0.62rem; font-weight: 700; letter-spacing: 0.03em;
  color: var(--accent); background: var(--bg-surface);
  border: 1px solid var(--border-color); border-radius: 5px; padding: 1px 6px;
}

/* Indicator card */
.indicator-card { border-left: 3px solid #a78bfa; }
.indicator-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.indicator-code {
  padding: 2px 8px; font-size: 0.72rem; font-weight: 700;
  background: var(--bg-surface); border: 1px solid var(--border-color);
  border-radius: 5px; color: var(--accent);
}
.indicator-code--muted { color: var(--text-secondary); }
.indicator-status { font-size: 0.74rem; color: var(--text-secondary); }

/* Activities */
.activity-list { display: flex; flex-direction: column; gap: 8px; }
.activity-list--disabled { opacity: 0.5; pointer-events: none; }
.activity-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 14px; background: var(--bg-panel);
  border: 1px solid var(--border-color); border-radius: 10px;
}
.activity-info { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; }
.activity-name { font-size: 0.85rem; font-weight: 600; }
.activity-code {
  font-size: 0.7rem; color: var(--text-secondary);
  background: var(--bg-surface); border: 1px solid var(--border-color);
  border-radius: 5px; padding: 1px 6px;
}
.activity-live { font-size: 0.7rem; color: var(--success); }
.activity-off { font-size: 0.7rem; color: var(--text-secondary); }

/* Switch */
.switch { position: relative; flex-shrink: 0; cursor: pointer; }
.switch--disabled { cursor: not-allowed; }
.switch-input { position: absolute; opacity: 0; width: 0; height: 0; }
.switch-track {
  display: block; width: 40px; height: 22px;
  background: var(--border-color); border-radius: 11px;
  transition: background 0.2s; position: relative;
}
.switch-input:checked + .switch-track { background: var(--accent); }
.switch-thumb {
  position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
  background: #fff; border-radius: 50%;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
.switch-input:checked + .switch-track .switch-thumb { transform: translateX(18px); }

.api-err {
  display: flex; align-items: center; gap: 6px; margin-top: 12px;
  padding: 10px 12px; font-size: 0.82rem; color: var(--error);
  background: var(--error-bg); border-radius: 6px;
}
.empty-inline { padding: 14px; font-size: 0.82rem; color: var(--text-secondary); background: var(--bg-surface); border-radius: 8px; }

.state { padding: 40px; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-secondary); }
.state--error { color: var(--error); }
.pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); animation: pulse 1.4s infinite; }
.pulse-dot:nth-child(2) { animation-delay: 0.2s; }
.pulse-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
