<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="ps-page impact-page">
      <!-- Header -->
      <header class="page-header">
        <div class="page-header-text">
          <span class="page-eyebrow">{{ levelLabel }}</span>
          <h1 class="page-title">{{ impact?.title ?? levelLabel }}</h1>
          <p class="page-subtitle">
            <template v-if="parentLevel">Part of {{ typeLabel(parentLevel.level_type).toLowerCase() }} “{{ parentLevel.title }}”. </template>
            Indicator, numerical targets and the activities that feed them.
          </p>
        </div>
        <NuxtLink :to="backLink.to" class="btn-back">&larr; {{ backLink.label }}</NuxtLink>
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
                <input id="im-ty" v-model.number="form.target_year" placeholder="e.g. 2026" type="number" min="1900" max="2100" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label" for="im-bv">Baseline value</label>
                <input id="im-bv" v-model.number="form.baseline_value" placeholder="e.g. 120" type="number" step="any" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label" for="im-by">Baseline year</label>
                <input id="im-by" v-model.number="form.baseline_year" placeholder="e.g. 2024" type="number" min="1900" max="2100" class="field-input" />
              </div>
            </div>

            <div v-if="years.length" class="year-targets">
              <div class="year-targets-head">
                <h3 class="view-subtitle">Targets by year</h3>
                <span class="year-targets-sum" :class="{ 'year-targets-sum--off': yearSumMismatch }">
                  Years add up to {{ yearSum.toLocaleString() }}<template v-if="form.target_value != null"> · overall target {{ form.target_value.toLocaleString() }}</template>
                </span>
              </div>
              <p class="card-hint">One target per project year. Extending the project end date adds a year here.</p>
              <div class="form-grid">
                <div v-for="y in years" :key="y.year" class="field">
                  <label class="field-label" :for="`im-yt-${y.year}`">{{ yearLabel(y, true) }}</label>
                  <input :id="`im-yt-${y.year}`" v-model.number="form.year_targets[y.year]" type="number" step="any" min="0" class="field-input" placeholder="—" />
                </div>
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

            <template v-if="years.length">
              <h3 class="view-subtitle">Targets by year</h3>
              <dl class="view-grid">
                <div v-for="y in years" :key="y.year" class="view-item">
                  <dt>{{ yearLabel(y, true) }}</dt>
                  <dd>{{ display(form.year_targets[y.year]) }}<span v-if="form.year_targets[y.year] != null && form.unit" class="view-unit"> {{ form.unit }}</span></dd>
                </div>
              </dl>
            </template>

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

        <!-- ═══ Outcomes & outputs ═══ -->
        <section v-if="childTypes.length" class="section-card">
          <div class="card-head">
            <div class="card-head-text">
              <h2 class="card-title">{{ childSectionTitle }}</h2>
              <p class="card-hint">{{ childSectionHint }}</p>
            </div>
            <button v-if="canManage && !showAddChild" class="btn-add" @click="openAddChild">
              + Add {{ childTypes.length > 1 ? 'outcome or output' : typeLabel(childTypes[0]!).toLowerCase() }}
            </button>
          </div>

          <form v-if="showAddChild" class="add-activity" @submit.prevent="saveChild">
            <div class="form-grid">
              <div v-if="childTypes.length > 1" class="field">
                <label class="field-label" for="ch-type">Type *</label>
                <select id="ch-type" v-model="childForm.level_type" class="field-input">
                  <option v-for="t in childTypes" :key="t" :value="t">{{ typeLabel(t) }}</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label class="field-label" for="ch-title">{{ typeLabel(childForm.level_type) }} statement *</label>
              <textarea
                id="ch-title"
                v-model="childForm.title"
                rows="2"
                class="field-input"
                :placeholder="childForm.level_type === 'output'
                  ? 'e.g. 1,200 children attend structured PSS sessions'
                  : 'e.g. Children show improved psychosocial wellbeing'"
              ></textarea>
            </div>
            <div v-if="childError" class="api-err">{{ childError }}</div>
            <div class="actions">
              <button type="button" class="btn-ghost" @click="showAddChild = false">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="childSaving">
                <span v-if="childSaving" class="btn-spinner" /> Add {{ typeLabel(childForm.level_type).toLowerCase() }}
              </button>
            </div>
          </form>

          <div v-if="children.length" class="list">
            <div v-for="c in children" :key="c.id" class="child-row">
              <NuxtLink :to="`/settings/projects/${projectId}/impacts/${c.id}`" class="list-row child-link">
                <span class="list-row-body">
                  <span class="child-type" :class="`child-type--${c.level_type}`">{{ typeLabel(c.level_type) }}</span>
                  <span class="list-row-title">{{ c.title }}</span>
                  <span class="list-row-meta">{{ childMeta(c.id) }}</span>
                </span>
                <span class="list-row-go">Open →</span>
              </NuxtLink>
              <button
                v-if="canManage"
                type="button"
                class="icon-btn icon-btn--danger"
                :title="`Delete ${typeLabel(c.level_type).toLowerCase()}`"
                :disabled="deletingChild === c.id"
                @click="deleteChild(c)"
              >&times;</button>
            </div>
          </div>
          <p v-else-if="!showAddChild" class="view-empty">
            No {{ childTypes.length > 1 ? 'outcomes or outputs' : 'outputs' }} yet.
          </p>
          <div v-if="childListError" class="api-err">{{ childListError }}</div>
        </section>

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
                  <option value="teamup">TeamUp — 20-session group programme for children</option>
                  <option value="parenting">Parenting — sessions with caregivers</option>
                  <option value="community_dialogue">Community Dialogue — sessions with community members</option>
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
  YEAR_TARGETS_KEY,
  type CustomFields,
  type LogframeIndicator,
  type LogframeIndicatorRequest,
  type LogframeLevel,
  type LogframeLevelType,
  type LogframeTargetField,
  type LogframeYearTarget,
} from '../../../../../interfaces/logframe'
import { projectYears, yearLabel } from '../../../../../utils/projectDashboard'

definePageMeta({
  layout: false,
  // Remount when moving between levels (impact → outcome → output).
  key: (r) => r.fullPath,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'data_manager', 'program_manager', 'supervisor', 'case_worker', 'facilitator', 'director'],
  permission: 'logframe.view',
})

const route = useRoute()
const projectId = route.params.id as string
const impactId = route.params.impactId as string
const authStore = useAuthStore()

const MANAGE_ROLES = ['org_admin', 'data_manager', 'program_manager', 'supervisor']
// Editing follows the role's logframe.edit permission (system role until /me loads).
const canManage = computed(() => authStore.orgRole ? authStore.can('logframe.edit') : MANAGE_ROLES.includes(authStore.userRole ?? ''))

const project = ref<Framework | null>(null)
const impact = ref<LogframeLevel | null>(null)
const indicator = ref<LogframeIndicator | null>(null)
const allLevels = ref<LogframeLevel[]>([])
const allIndicators = ref<LogframeIndicator[]>([])
const activities = ref<any[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

// ─── Hierarchy (impact → outcome → output) ───

const TYPE_LABELS: Record<string, string> = {
  goal: 'Goal', impact: 'Impact', outcome: 'Outcome', output: 'Output', result: 'Result', activity: 'Activity',
}
function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}
/** Which child levels each level type can hold. */
const CHILD_TYPES: Record<string, LogframeLevelType[]> = {
  impact: ['outcome', 'output'],
  outcome: ['output'],
}

const levelLabel = computed(() => typeLabel(impact.value?.level_type ?? 'impact'))
const parentLevel = computed(() =>
  allLevels.value.find((l) => l.id === impact.value?.parent_id) ?? null,
)
const ancestors = computed(() => {
  const chain: LogframeLevel[] = []
  let current = parentLevel.value
  while (current && chain.length < 10) {
    chain.unshift(current)
    current = allLevels.value.find((l) => l.id === current!.parent_id) ?? null
  }
  return chain
})
const backLink = computed(() =>
  parentLevel.value
    ? { to: `/settings/projects/${projectId}/impacts/${parentLevel.value.id}`, label: `Back to ${typeLabel(parentLevel.value.level_type).toLowerCase()}` }
    : { to: `/settings/projects/${projectId}/logframe`, label: 'Back to logframe' },
)

const childTypes = computed(() => CHILD_TYPES[impact.value?.level_type ?? ''] ?? [])
const children = computed(() =>
  allLevels.value
    .filter((l) => l.parent_id === impactId)
    .sort((a, b) =>
      // Outcomes first, then outputs; each in the order they were added.
      Number(a.level_type === 'output') - Number(b.level_type === 'output') || a.sort_order - b.sort_order,
    ),
)
const childSectionTitle = computed(() => (childTypes.value.length > 1 ? 'Outcomes & outputs' : 'Outputs'))
const childSectionHint = computed(() =>
  childTypes.value.length > 1
    ? 'Break this impact down into the outcomes and outputs that deliver it. Each one gets its own indicator, targets and activities.'
    : 'The outputs that deliver this outcome. Each one gets its own indicator, targets and activities.',
)
function childMeta(levelId: string): string {
  const inds = allIndicators.value.filter((i) => i.level_id === levelId)
  const ind = inds[0]
  const parts = [`${inds.length} indicator${inds.length === 1 ? '' : 's'}`]
  if (ind?.target_value != null) parts.push(`target ${ind.target_value}${ind.unit ? ' ' + ind.unit : ''}`)
  const grandchildren = allLevels.value.filter((l) => l.parent_id === levelId).length
  if (grandchildren) parts.push(`${grandchildren} output${grandchildren === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

const showAddChild = ref(false)
const childSaving = ref(false)
const childError = ref('')
const childListError = ref('')
const deletingChild = ref<string | null>(null)
const childForm = reactive({ level_type: 'outcome' as LogframeLevelType, title: '' })

function openAddChild() {
  childError.value = ''
  childForm.level_type = childTypes.value[0] ?? 'output'
  childForm.title = ''
  showAddChild.value = true
}

async function refreshLevels() {
  const data = await logframeApi.getLogframe(projectId)
  allLevels.value = data.levels ?? []
  allIndicators.value = data.indicators ?? []
}

async function saveChild() {
  childError.value = ''
  if (!childForm.title.trim()) { childError.value = 'A statement is required'; return }
  childSaving.value = true
  try {
    const siblings = allLevels.value.filter((l) => l.parent_id === impactId)
    await logframeApi.createLevel(projectId, {
      level_type: childForm.level_type,
      parent_id: impactId,
      title: childForm.title.trim(),
      sort_order: siblings.reduce((max, l) => Math.max(max, l.sort_order), 0) + 1,
    })
    await refreshLevels()
    showAddChild.value = false
  } catch (e: any) {
    childError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to add')
  } finally {
    childSaving.value = false
  }
}

async function deleteChild(level: LogframeLevel) {
  const label = typeLabel(level.level_type).toLowerCase()
  if (!confirm(`Delete this ${label} and its indicator? This cannot be undone.`)) return
  childListError.value = ''
  deletingChild.value = level.id
  try {
    await logframeApi.deleteLevel(projectId, level.id)
    await refreshLevels()
  } catch (e: any) {
    const msg = e instanceof ApiError ? e.message : (e?.message ?? '')
    childListError.value = e?.status === 409
      ? `Remove the outputs under this ${label} first.`
      : (msg || `Failed to delete ${label}`)
  } finally {
    deletingChild.value = null
  }
}

const breadcrumbs = computed(() => {
  const short = (t: string) => (t.length > 30 ? t.substring(0, 30) + '…' : t)
  return [
    { title: 'Settings', href: '/settings' },
    { title: 'Projects', href: '/settings/projects' },
    { title: project.value?.project_name ?? 'Project', href: `/settings/projects/${projectId}` },
    { title: 'Logframe', href: `/settings/projects/${projectId}/logframe` },
    ...ancestors.value.map((l) => ({ title: short(l.title), href: `/settings/projects/${projectId}/impacts/${l.id}` })),
    { title: short(impact.value?.title ?? levelLabel.value), href: `/settings/projects/${projectId}/impacts/${impactId}`, current: true },
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
  /** Target per project year, keyed by year number. */
  year_targets: {} as Record<number, number | null>,
  custom_fields: {} as CustomFields,
})

// Project years from the project period; they grow when the end date is extended.
const years = computed(() => projectYears(project.value?.period_start, project.value?.period_end))
const yearSum = computed(() =>
  years.value.reduce((sum, y) => sum + (typeof form.year_targets[y.year] === 'number' ? form.year_targets[y.year]! : 0), 0),
)
const yearSumMismatch = computed(() =>
  form.target_value != null && yearSum.value > 0 && yearSum.value !== form.target_value,
)

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

  const storedYears = custom[YEAR_TARGETS_KEY]
  form.year_targets = {}
  if (Array.isArray(storedYears)) {
    for (const t of storedYears as LogframeYearTarget[]) {
      if (t && typeof t.year === 'number' && typeof t.value === 'number') form.year_targets[t.year] = t.value
    }
  }
  delete custom[YEAR_TARGETS_KEY]
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
    allLevels.value = data.levels ?? []
    allIndicators.value = data.indicators ?? []
    impact.value = allLevels.value.find((l) => l.id === impactId) ?? null
    if (!impact.value) { loadError.value = 'Level not found'; return }
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
  // Year targets outside the current period (after shortening it) are kept.
  const yearTargets: LogframeYearTarget[] = Object.entries(form.year_targets)
    .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
    .map(([year, value]) => ({ year: Number(year), value: value as number }))
    .sort((a, b) => a.year - b.year)
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
      ...(yearTargets.length ? { [YEAR_TARGETS_KEY]: yearTargets } : {}),
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
/* Shared look comes from assets/css/project-settings.css (.ps-page). */
.impact-page { max-width: 860px; }

.add-activity { margin-bottom: 18px; padding: 18px; background: var(--ps-tile); border-radius: 10px; }
.card-hint--note { margin: 0 0 12px; }

/* Outcomes & outputs */
.child-row { display: flex; align-items: center; gap: 8px; }
.child-link { flex: 1; min-width: 0; }
.child-type {
  align-self: flex-start; padding: 2px 9px; font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase; border-radius: 999px;
  color: #fff; background: var(--brand);
}
.child-type--output { color: var(--ps-text); background: var(--brand-soft); }

.activity-list { display: flex; flex-direction: column; gap: 10px; }
.activity-list--disabled { opacity: 0.55; pointer-events: none; }
.activity-row {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 16px; background: var(--ps-tile); border-radius: 10px;
}
.activity-info { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.activity-name { font-size: 0.92rem; font-weight: 600; color: var(--ps-text); overflow-wrap: anywhere; }
.activity-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.activity-tag {
  padding: 2px 9px; font-size: 0.74rem; font-weight: 600;
  color: var(--ps-text); background: var(--ps-card); border-radius: 6px;
}
.activity-tag--on { color: #fff; background: var(--brand); }

/* Switch */
.switch { position: relative; flex-shrink: 0; cursor: pointer; }
.switch--disabled { cursor: not-allowed; }
.switch-input { position: absolute; opacity: 0; width: 0; height: 0; }
.switch-track {
  display: block; position: relative; width: 42px; height: 24px;
  background: var(--ps-switch-off); border-radius: 12px; transition: background 0.2s;
}
.switch-input:checked + .switch-track { background: var(--brand); }
.switch-input:focus-visible + .switch-track { box-shadow: 0 0 0 3px var(--brand-soft); }
.switch-thumb {
  position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
  background: #fff; border-radius: 50%; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.switch-input:checked + .switch-track .switch-thumb { transform: translateX(18px); }

.save-ok { align-self: flex-end; }
</style>
