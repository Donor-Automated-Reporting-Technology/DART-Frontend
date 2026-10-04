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
        <section class="section-card">
          <div class="card-head">
            <div class="card-head-text">
              <h2 class="card-title">Indicator</h2>
              <span class="card-status" :class="{ 'card-status--saved': hasIndicator }">
                {{ hasIndicator ? 'Saved' : 'Not saved yet' }}
              </span>
            </div>
            <button v-if="canManage && hasIndicator && !editingIndicator" class="btn-edit" @click="startEdit('indicator')">
              Edit
            </button>
          </div>

          <!-- Edit mode -->
          <template v-if="editingIndicator">
            <div class="field">
              <label class="field-label" for="im-ind">Indicator statement *</label>
              <textarea
                id="im-ind"
                v-model="form.indicator"
                rows="3"
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

            <div v-if="saveError && savingSection === 'indicator'" class="api-err">{{ saveError }}</div>
            <div class="actions">
              <button v-if="hasIndicator" type="button" class="btn-ghost" @click="cancelEdit('indicator')">Cancel</button>
              <button class="btn-primary" :disabled="saving" @click="saveIndicator('indicator')">
                <span v-if="saving && savingSection === 'indicator'" class="btn-spinner" />
                {{ hasIndicator ? 'Save' : 'Create indicator' }}
              </button>
            </div>
          </template>

          <!-- View mode -->
          <template v-else-if="hasIndicator">
            <p class="view-statement">{{ form.indicator }}</p>
            <dl class="view-grid">
              <div class="view-item">
                <dt>Code</dt>
                <dd>{{ display(form.code) }}</dd>
              </div>
              <div class="view-item view-item--wide">
                <dt>Definition</dt>
                <dd>{{ display(form.definition) }}</dd>
              </div>
            </dl>
          </template>

          <p v-else class="view-empty">No indicator has been set for this impact yet.</p>
        </section>

        <!-- ═══ Targets card ═══ -->
        <section class="section-card">
          <div class="card-head">
            <div class="card-head-text">
              <h2 class="card-title">Targets</h2>
              <p class="card-hint">Numerical targets for this indicator, plus any extra fields you need.</p>
            </div>
            <button v-if="canManage && hasIndicator && !editingTargets" class="btn-edit" @click="startEdit('targets')">
              Edit
            </button>
          </div>

          <!-- Edit mode -->
          <template v-if="editingTargets">
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

            <div v-if="saveError && savingSection === 'targets'" class="api-err">{{ saveError }}</div>
            <div class="actions">
              <button v-if="hasIndicator" type="button" class="btn-ghost" @click="cancelEdit('targets')">Cancel</button>
              <button class="btn-primary" :disabled="saving" @click="saveIndicator('targets')">
                <span v-if="saving && savingSection === 'targets'" class="btn-spinner" />
                {{ hasIndicator ? 'Save' : 'Create indicator' }}
              </button>
            </div>
          </template>

          <!-- View mode -->
          <template v-else-if="hasIndicator">
            <dl class="view-grid">
              <div class="view-item">
                <dt>Target value</dt>
                <dd>{{ display(form.target_value) }}<span v-if="form.target_value != null && form.unit" class="view-unit"> {{ form.unit }}</span></dd>
              </div>
              <div class="view-item">
                <dt>Target year</dt>
                <dd>{{ display(form.target_year) }}</dd>
              </div>
              <div class="view-item">
                <dt>Baseline value</dt>
                <dd>{{ display(form.baseline_value) }}<span v-if="form.baseline_value != null && form.unit" class="view-unit"> {{ form.unit }}</span></dd>
              </div>
              <div class="view-item">
                <dt>Baseline year</dt>
                <dd>{{ display(form.baseline_year) }}</dd>
              </div>
            </dl>

            <template v-if="savedTargetFields.length">
              <h3 class="view-subtitle">Target fields</h3>
              <dl class="view-grid">
                <div v-for="(tf, i) in savedTargetFields" :key="i" class="view-item">
                  <dt>{{ tf.label }}</dt>
                  <dd>{{ displayTargetField(tf) }}<span v-if="tf.unit" class="view-unit"> {{ tf.unit }}</span></dd>
                </div>
              </dl>
            </template>

            <template v-if="savedCustomFields.length">
              <h3 class="view-subtitle">Other custom fields</h3>
              <dl class="view-grid">
                <div v-for="[key, value] in savedCustomFields" :key="key" class="view-item">
                  <dt>{{ key }}</dt>
                  <dd>{{ display(value) }}</dd>
                </div>
              </dl>
            </template>
          </template>

          <p v-else class="view-empty">Save the indicator first, then set its targets.</p>
        </section>

        <Transition name="fade">
          <div v-if="saveSuccess" class="save-ok">Changes saved</div>
        </Transition>

        <!-- ═══ Activities ═══ -->
        <section class="section-card">
          <div class="card-head">
            <div class="card-head-text">
              <h2 class="card-title">Activities</h2>
              <p class="card-hint">Activities belong to this project's logframe. Add the ones from your own logframe, then switch on the ones that feed this indicator.</p>
            </div>
            <button v-if="canManage && !showAddActivity" class="btn-add" @click="openAddActivity">
              + Add activity
            </button>
          </div>

          <!-- Add a hand-entered activity (from an external logframe) -->
          <div v-if="showAddActivity" class="add-activity">
            <h3 class="view-subtitle view-subtitle--first">New activity</h3>
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

          <p v-if="!activities.length" class="view-empty">
            No activities yet — use “Add activity” to enter the ones from your logframe.
          </p>

          <p v-if="activities.length && !hasIndicator" class="card-hint card-hint--note">Save the indicator to switch activities on.</p>

          <div v-if="activities.length" class="activity-list" :class="{ 'activity-list--disabled': !hasIndicator }">
            <div v-for="a in activities" :key="a.id" class="activity-row">
              <div class="activity-info">
                <span class="activity-name">{{ activityName(a) }}</span>
                <span class="activity-tags">
                  <span v-if="activityCode(a)" class="activity-tag">{{ activityCode(a) }}</span>
                  <span v-if="a.is_custom" class="activity-tag">{{ (a.module || 'custom').toUpperCase() }}</span>
                  <span class="activity-tag" :class="a.is_active ? 'activity-tag--on' : ''">
                    Project: {{ a.is_active ? 'on' : 'off' }}
                  </span>
                </span>
              </div>

              <label class="switch" :class="{ 'switch--disabled': !hasIndicator }" :title="isLinked(a.id) ? 'Feeds this indicator' : 'Not linked'">
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
        </section>
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

// Each card shows its saved values until "Edit" is pressed. Before the
// indicator exists, the indicator card opens straight in edit mode.
type Section = 'indicator' | 'targets'
const editingIndicator = ref(false)
const editingTargets = ref(false)
const savingSection = ref<Section | null>(null)

function startEdit(section: Section) {
  saveError.value = ''
  if (section === 'indicator') editingIndicator.value = true
  else editingTargets.value = true
}

/** Drop unsaved changes in one card without touching the other. */
function cancelEdit(section: Section) {
  saveError.value = ''
  if (section === 'indicator') {
    seedIndicatorFields()
    editingIndicator.value = false
  } else {
    seedTargetFields()
    editingTargets.value = false
  }
}

function seedForm() {
  seedIndicatorFields()
  seedTargetFields()
}

function seedIndicatorFields() {
  const ind = indicator.value
  form.code = ind?.code ?? ''
  form.indicator = ind?.indicator ?? ''
  form.definition = ind?.definition ?? ''
}

function seedTargetFields() {
  const ind = indicator.value
  form.unit = ind?.unit ?? ''
  form.target_value = ind?.target_value ?? null
  form.target_year = ind?.target_year ?? null
  form.baseline_value = ind?.baseline_value ?? null
  form.baseline_year = ind?.baseline_year ?? null

  // Target fields are persisted inside custom_fields under a reserved key but
  // edited separately, so split them out when seeding the form.
  const custom = { ...(ind?.custom_fields ?? {}) }
  const stored = custom[TARGET_FIELDS_KEY]
  form.target_fields = Array.isArray(stored) ? (stored as LogframeTargetField[]).map((f) => ({ ...f })) : []
  delete custom[TARGET_FIELDS_KEY]
  form.custom_fields = custom
}

// ─── Read-only display ───

function display(value: unknown): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function displayTargetField(f: LogframeTargetField): string {
  return f.type === 'boolean' ? display(!!f.value) : display(f.value)
}

const savedTargetFields = computed(() => form.target_fields.filter((f) => f.label.trim() !== ''))
const savedCustomFields = computed(() => Object.entries(form.custom_fields))

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
    editingIndicator.value = !indicator.value && canManage.value
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

async function saveIndicator(section: Section) {
  saveError.value = ''
  saveSuccess.value = false
  savingSection.value = section
  if (!form.indicator.trim()) { saveError.value = 'Indicator statement is required'; return }
  saving.value = true
  const creating = !indicator.value
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
    // The whole indicator is saved at once, so both cards return to view mode.
    // A freshly created indicator opens its targets straight away.
    editingIndicator.value = false
    editingTargets.value = creating && canManage.value
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
/* Page palette: brand teal instead of the light-green accent, and stronger
   secondary text so small labels stay readable on grey backgrounds. These
   cascade into the field editors rendered inside the page. */
.impact-page {
  --brand: #077163;
  --brand-soft: rgba(7, 113, 99, 0.12);
  --accent: var(--brand);
  --success: var(--brand);
  --brand-text: #4fbfae;
  --ip-text-2: #c4c4cc;
  --text-muted: var(--ip-text-2);
  --text-secondary: var(--ip-text-2);
  max-width: 860px; padding-bottom: 48px;
  display: flex; flex-direction: column; gap: 20px;
}
:global([data-theme="light"]) .impact-page { --ip-text-2: #4b5563; --brand-text: var(--brand); }

/* Header */
.page-header {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  flex-wrap: wrap; padding: 22px 24px;
  background: var(--bg-panel); border-radius: 12px;
}
.page-header-text { min-width: 0; flex: 1; }
.page-eyebrow {
  display: block; margin-bottom: 6px;
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--brand-text);
}
.page-title { font-size: 1.35rem; font-weight: 750; line-height: 1.3; margin: 0 0 6px; color: var(--text-primary); overflow-wrap: anywhere; }
.page-subtitle { font-size: 0.86rem; color: var(--ip-text-2); margin: 0; }

/* Buttons */
.btn-back {
  display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
  font-size: 0.82rem; font-weight: 600; color: var(--text-primary); text-decoration: none;
  padding: 9px 14px; background: var(--bg-input); border-radius: 8px;
  transition: background 0.15s, color 0.15s;
}
.btn-back:hover { background: var(--brand-soft); color: var(--brand-text); }
.btn-primary, .btn-add {
  display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
  padding: 9px 16px; font-size: 0.84rem; font-weight: 600;
  background: var(--brand); color: #fff; border: none; border-radius: 8px; cursor: pointer;
  transition: filter 0.15s;
}
.btn-primary:hover:not(:disabled), .btn-add:hover { filter: brightness(1.12); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-edit {
  flex-shrink: 0; padding: 7px 16px; font-size: 0.82rem; font-weight: 600;
  background: var(--brand-soft); color: var(--text-primary);
  border: none; border-radius: 8px; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.btn-edit:hover { background: var(--brand); color: #fff; }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 14px; font-size: 0.84rem; font-weight: 600;
  background: transparent; color: var(--ip-text-2);
  border: none; border-radius: 8px; cursor: pointer;
}
.btn-ghost:hover { color: var(--text-primary); background: var(--bg-input); }
.btn-spinner {
  width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Cards */
.section-card { background: var(--bg-panel); border-radius: 12px; padding: 22px 24px; }
.card-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  margin-bottom: 18px;
}
.card-head-text { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.card-title { font-size: 1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.card-hint { font-size: 0.82rem; line-height: 1.5; color: var(--ip-text-2); margin: 0; max-width: 600px; }
.card-hint--note { margin: 0 0 12px; }
.card-status { font-size: 0.78rem; font-weight: 600; color: var(--ip-text-2); }
.card-status--saved { color: var(--brand-text); }

/* Read-only view */
.view-statement {
  margin: 0 0 18px; font-size: 0.98rem; font-weight: 600; line-height: 1.55;
  color: var(--text-primary); white-space: pre-wrap; overflow-wrap: anywhere;
}
.view-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px; margin: 0;
}
.view-item {
  min-width: 0; padding: 12px 14px; background: var(--bg-input); border-radius: 8px;
}
.view-item--wide { grid-column: span 2; }
.view-item dt {
  font-size: 0.74rem; font-weight: 600; color: var(--ip-text-2);
  margin-bottom: 4px; overflow-wrap: anywhere;
}
.view-item dd {
  margin: 0; font-size: 0.92rem; font-weight: 600; line-height: 1.45;
  color: var(--text-primary); white-space: pre-wrap; overflow-wrap: anywhere;
}
.view-unit { font-weight: 500; color: var(--ip-text-2); }
.view-subtitle {
  font-size: 0.8rem; font-weight: 700; color: var(--text-primary);
  margin: 20px 0 10px;
}
.view-subtitle--first { margin-top: 0; }
.view-empty {
  margin: 0; padding: 14px 16px; font-size: 0.84rem; color: var(--ip-text-2);
  background: var(--bg-input); border-radius: 8px;
}

/* Form */
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0 16px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field-label { font-size: 0.78rem; font-weight: 600; color: var(--text-primary); }
.field-input {
  width: 100%; padding: 10px 12px; font-size: 0.88rem; line-height: 1.45;
  background: var(--bg-input); border: 1px solid transparent;
  border-radius: 8px; color: var(--text-primary); font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
textarea.field-input { resize: vertical; }
.field-input::placeholder { color: var(--ip-text-2); opacity: 0.75; }
.field-input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-soft); }
.actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.save-ok {
  align-self: flex-end; padding: 8px 14px; font-size: 0.82rem; font-weight: 600;
  color: #fff; background: var(--brand); border-radius: 8px;
}

/* Activities */
.add-activity {
  margin-bottom: 18px; padding: 18px; background: var(--bg-input); border-radius: 10px;
}
.add-activity .field-input { background: var(--bg-panel); }
.activity-list { display: flex; flex-direction: column; gap: 10px; }
.activity-list--disabled { opacity: 0.55; pointer-events: none; }
.activity-row {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 16px; background: var(--bg-input); border-radius: 10px;
}
.activity-info { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.activity-name { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); overflow-wrap: anywhere; }
.activity-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.activity-tag {
  font-size: 0.72rem; font-weight: 600; color: var(--ip-text-2);
  background: var(--bg-panel); border-radius: 6px; padding: 2px 8px;
}
.activity-tag--on { color: #fff; background: var(--brand); }

/* Switch */
.switch { position: relative; flex-shrink: 0; cursor: pointer; }
.switch--disabled { cursor: not-allowed; }
.switch-input { position: absolute; opacity: 0; width: 0; height: 0; }
.switch-track {
  display: block; width: 40px; height: 22px;
  background: var(--ip-text-2); opacity: 0.55; border-radius: 11px;
  transition: background 0.2s, opacity 0.2s; position: relative;
}
.switch-input:checked + .switch-track { background: var(--brand); opacity: 1; }
.switch-input:focus-visible + .switch-track { box-shadow: 0 0 0 3px var(--brand-soft); }
.switch-thumb {
  position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
  background: #fff; border-radius: 50%;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
.switch-input:checked + .switch-track .switch-thumb { transform: translateX(18px); }

.api-err {
  margin-top: 12px; padding: 10px 12px; font-size: 0.84rem; color: var(--error);
  background: var(--error-bg); border-radius: 8px;
}

.state { padding: 40px; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--ip-text-2); }
.state--error { color: var(--error); }
.pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ip-text-2); animation: pulse 1.4s infinite; }
.pulse-dot:nth-child(2) { animation-delay: 0.2s; }
.pulse-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 600px) {
  .page-header, .section-card { padding: 18px 16px; }
  .view-item--wide { grid-column: auto; }
}
</style>
