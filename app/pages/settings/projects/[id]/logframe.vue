<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="ps-page logframe-page">
      <!-- Header -->
      <header class="page-header">
        <div class="page-header-text">
          <span class="page-eyebrow">M&E</span>
          <h1 class="page-title">Logframe</h1>
          <p class="page-subtitle">
            Theory of change, indicators and donor alignment for {{ project?.project_name ?? 'this project' }}.
          </p>
        </div>
        <div class="header-actions">
          <button v-if="canManage" class="btn-secondary" :disabled="!templates.length" @click="showImport = true">
            Import donor template
          </button>
        </div>
      </header>

      <!-- Sub-navigation -->
      <nav class="sub-nav">
        <NuxtLink :to="`/settings/projects/${projectId}`" class="sub-nav-item">Project settings</NuxtLink>
        <span class="sub-nav-item sub-nav-item--active">M&E logframe</span>
      </nav>

      <!-- Loading -->
      <div v-if="loading && !logframe" class="state state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>

      <!-- Error -->
      <div v-else-if="loadError" class="state state--error">{{ loadError }}</div>

      <template v-else>
        <!-- ═══ Empty state: no logframe yet ═══ -->
        <template v-if="!logframe">
          <section class="section-card">
            <h2 class="card-title">No logframe yet</h2>
            <p class="card-hint">Create an empty logframe, or import a donor template (e.g. ECHO DRA protection) to scaffold outcomes and indicators automatically.</p>
          </section>

          <div class="empty-grid">
            <!-- Create empty -->
            <section class="section-card">
              <div class="card-head">
                <h2 class="card-title">Create empty logframe</h2>
              </div>
              <div class="field">
                <label class="field-label" for="lf-name">Logframe name *</label>
                <input id="lf-name" v-model="createForm.name" type="text" class="field-input" placeholder="e.g. SSWOCO Child Protection Logframe" />
              </div>
              <div class="field">
                <label class="field-label" for="lf-desc">Description</label>
                <textarea id="lf-desc" v-model="createForm.description" rows="2" class="field-input" placeholder="Optional description"></textarea>
              </div>
              <div class="field">
                <label class="field-label" for="lf-donor">Donor framework</label>
                <input id="lf-donor" v-model="createForm.donor_framework" type="text" class="field-input" placeholder="e.g. ECHO DRA 2025" />
              </div>
              <div v-if="createError" class="api-err">{{ createError }}</div>
              <div class="actions">
                <button class="btn-primary" :disabled="creating" @click="createLogframe">
                  <span v-if="creating" class="btn-spinner" /> Create logframe
                </button>
              </div>
            </section>

            <!-- Import template -->
            <section class="section-card">
              <div class="card-head">
                <div class="card-head-text">
                  <h2 class="card-title">Import donor template</h2>
                  <p class="card-hint">Available templates for this project.</p>
                </div>
              </div>
              <div v-if="templatesLoading" class="empty-inline">Loading templates…</div>
              <div v-else-if="!templates.length" class="empty-inline">No donor templates available.</div>
              <div v-else class="list">
                <div v-for="t in templates" :key="t.id" class="list-row">
                  <div class="list-row-body">
                    <span class="list-row-title">{{ t.name }}</span>
                    <span class="list-row-meta">{{ t.donor }} · {{ t.indicator_count }} indicators</span>
                    <span v-if="t.description" class="list-row-meta">{{ t.description }}</span>
                  </div>
                  <button class="btn-secondary" :disabled="importing" @click="importTemplate(t)">Import</button>
                </div>
              </div>
              <div v-if="importError" class="api-err">{{ importError }}</div>
            </section>
          </div>
        </template>

        <!-- ═══ Existing logframe ═══ -->
        <template v-else>
          <!-- Metadata -->
          <section class="section-card">
            <div class="card-head">
              <div class="card-head-text">
                <h2 class="card-title">Logframe</h2>
                <p class="card-hint">Name, donor and status of this project's logframe.</p>
              </div>
              <button v-if="canManage && !editingMeta" class="btn-edit" @click="startEditMeta">Edit</button>
            </div>

            <div v-if="!editingMeta">
              <p class="view-statement">{{ logframe.name }}</p>
              <dl class="view-grid">
                <div v-if="logframe.description" class="view-item view-item--wide">
                  <dt>Description</dt>
                  <dd>{{ logframe.description }}</dd>
                </div>
                <div class="view-item">
                  <dt>Donor framework</dt>
                  <dd>{{ logframe.donor_framework || '—' }}</dd>
                </div>
                <div class="view-item">
                  <dt>Status</dt>
                  <dd class="capitalize">{{ logframe.status }}</dd>
                </div>
                <div class="view-item">
                  <dt>Version</dt>
                  <dd>v{{ logframe.version }}</dd>
                </div>
                <div class="view-item">
                  <dt>Contents</dt>
                  <dd>{{ levelCount }} levels · {{ indicatorCount }} indicators</dd>
                </div>
              </dl>
            </div>
            <form v-else @submit.prevent="saveMeta">
              <div class="field">
                <label class="field-label" for="lfem-name">Logframe name *</label>
                <input id="lfem-name" v-model="metaForm.name" type="text" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label" for="lfem-desc">Description</label>
                <textarea id="lfem-desc" v-model="metaForm.description" rows="2" class="field-input"></textarea>
              </div>
              <div class="field">
                <label class="field-label" for="lfem-donor">Donor framework</label>
                <input id="lfem-donor" v-model="metaForm.donor_framework" type="text" class="field-input" />
              </div>
              <CustomFieldsEditor v-model="metaForm.custom_fields" label="Custom fields" hint="Add your own logframe-level fields." />
              <div v-if="metaError" class="api-err">{{ metaError }}</div>
              <div class="actions">
                <button type="button" class="btn-ghost" @click="editingMeta = false">Cancel</button>
                <button type="submit" class="btn-primary" :disabled="metaSaving"><span v-if="metaSaving" class="btn-spinner" /> Save</button>
              </div>
            </form>
          </section>

          <!-- ═══ Impacts ═══ -->
          <section class="section-card">
            <div class="card-head">
              <div class="card-head-text">
                <h2 class="card-title">Impacts</h2>
                <p class="card-hint">Open an impact to write its indicator, set numerical targets and toggle the activities that feed it.</p>
              </div>
              <button v-if="canManage" class="btn-primary" @click="openImpactModal">+ Add impact</button>
            </div>

            <div v-if="impacts.length" class="list">
              <NuxtLink
                v-for="imp in impacts"
                :key="imp.id"
                :to="`/settings/projects/${projectId}/impacts/${imp.id}`"
                class="list-row"
              >
                <span class="list-row-body">
                  <span class="list-row-title">{{ imp.title }}</span>
                  <span class="list-row-meta">{{ indicatorCountByLevel(imp.id) }} indicator{{ indicatorCountByLevel(imp.id) === 1 ? '' : 's' }}</span>
                </span>
                <span class="list-row-go">Open →</span>
              </NuxtLink>
            </div>
            <p v-else class="empty-inline">
              No impacts yet — add one to start building the theory of change.
            </p>
          </section>
        </template>
      </template>

      <!-- ═══ Add impact modal ═══ -->
      <div v-if="impactModal.open" class="modal-overlay" @click.self="impactModal.open = false">
        <div class="modal">
          <div class="modal-head">
            <h3>Add impact</h3>
            <button class="icon-btn" aria-label="Close" @click="impactModal.open = false">&times;</button>
          </div>
          <p class="modal-hint">An impact is a top-level statement of change (e.g. “Children feel safer and more resilient”).</p>
          <form class="modal-form" @submit.prevent="saveImpact">
            <div class="field">
              <label class="field-label" for="imp-title">Impact statement *</label>
              <textarea id="imp-title" v-model="impactForm.title" rows="2" class="field-input" placeholder="e.g. Children in supported communities feel safer and more resilient"></textarea>
            </div>
            <div v-if="impactError" class="api-err">{{ impactError }}</div>
            <div class="actions">
              <button type="button" class="btn-ghost" @click="impactModal.open = false">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="impactSaving"><span v-if="impactSaving" class="btn-spinner" /> Add impact</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ═══ Import modal ═══ -->
      <div v-if="showImport" class="modal-overlay" @click.self="showImport = false">
        <div class="modal">
          <div class="modal-head">
            <h3>Import donor template</h3>
            <button class="icon-btn" aria-label="Close" @click="showImport = false">&times;</button>
          </div>
          <p class="modal-hint">Imports all indicators from the template as outcome → result levels. Baselines and targets are left empty for tailoring.</p>
          <div v-if="importing" class="empty-inline">Importing…</div>
          <div v-else>
            <div class="list">
              <div v-for="t in templates" :key="t.id" class="list-row">
                <div class="list-row-body">
                  <span class="list-row-title">{{ t.name }}</span>
                  <span class="list-row-meta">{{ t.donor }} · {{ t.indicator_count }} indicators</span>
                  <span v-if="t.description" class="list-row-meta">{{ t.description }}</span>
                </div>
                <button class="btn-primary" @click="importTemplate(t)">Import</button>
              </div>
            </div>
            <div v-if="importError" class="api-err">{{ importError }}</div>
          </div>
        </div>
      </div>



      <!-- ═══ Indicator create/edit modal ═══ -->
      <div v-if="indicatorModal.open" class="modal-overlay" @click.self="indicatorModal.open = false">
        <div class="modal modal--wide">
          <div class="modal-head">
            <h3>{{ indicatorModal.editing ? 'Edit indicator' : 'Add indicator' }}</h3>
            <button class="icon-btn" aria-label="Close" @click="indicatorModal.open = false">&times;</button>
          </div>
          <form class="modal-form" @submit.prevent="saveIndicator">
            <div class="field">
              <label class="field-label" for="lfi-level">Level *</label>
              <select id="lfi-level" v-model="indicatorForm.level_id" class="field-input" :disabled="!!indicatorModal.editing">
                <option v-for="l in impacts" :key="l.id" :value="l.id">
                  {{ l.level_type }}: {{ l.title }}
                </option>
              </select>
            </div>
            <div class="form-grid">
              <div class="field">
                <label class="field-label" for="lfi-code">Code</label>
                <input id="lfi-code" v-model="indicatorForm.code" type="text" class="field-input" placeholder="e.g. DRA-1.2" />
              </div>
              <div class="field">
                <label class="field-label" for="lfi-unit">Unit</label>
                <input id="lfi-unit" v-model="indicatorForm.unit" type="text" class="field-input" placeholder="e.g. children, %, sessions" />
              </div>
            </div>
            <div class="field">
              <label class="field-label" for="lfi-indicator">Indicator *</label>
              <textarea id="lfi-indicator" v-model="indicatorForm.indicator" rows="2" class="field-input" placeholder="e.g. Number of children with improved psychosocial wellbeing scores"></textarea>
            </div>
            <div class="field">
              <label class="field-label" for="lfi-def">Definition</label>
              <textarea id="lfi-def" v-model="indicatorForm.definition" rows="2" class="field-input"></textarea>
            </div>
            <div class="form-grid">
              <div class="field">
                <label class="field-label" for="lfi-bv">Baseline value</label>
                <input id="lfi-bv" v-model.number="indicatorForm.baseline_value" type="number" step="any" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label" for="lfi-by">Baseline year</label>
                <input id="lfi-by" v-model.number="indicatorForm.baseline_year" type="number" min="1900" max="2100" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label" for="lfi-tv">Target value</label>
                <input id="lfi-tv" v-model.number="indicatorForm.target_value" type="number" step="any" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label" for="lfi-ty">Target year</label>
                <input id="lfi-ty" v-model.number="indicatorForm.target_year" type="number" min="1900" max="2100" class="field-input" />
              </div>
            </div>
            <div class="field">
              <label class="field-label" for="lfi-bn">Baseline notes</label>
              <textarea id="lfi-bn" v-model="indicatorForm.baseline_notes" rows="2" class="field-input"></textarea>
            </div>
            <div class="field">
              <label class="field-label" for="lfi-mov">Means of verification</label>
              <textarea id="lfi-mov" v-model="indicatorForm.means_of_verification" rows="2" class="field-input"></textarea>
            </div>
            <div class="field">
              <label class="field-label" for="lfi-ass">Assumptions</label>
              <textarea id="lfi-ass" v-model="indicatorForm.assumptions" rows="2" class="field-input"></textarea>
            </div>
            <div class="field">
              <label class="field-label" for="lfi-ds">Data source</label>
              <input id="lfi-ds" v-model="indicatorForm.data_source" type="text" class="field-input" placeholder="e.g. PSS session records, caregiver survey" />
            </div>
            <div class="field">
              <span class="field-label">Disaggregation</span>
              <div class="checkbox-row">
                <label v-for="d in disaggregationOptions" :key="d.value" class="checkbox-item">
                  <input type="checkbox" :value="d.value" v-model="indicatorForm.disaggregation" />
                  <span>{{ d.label }}</span>
                </label>
              </div>
            </div>
            <TargetFieldsEditor v-model="indicatorForm.target_fields" label="Target fields" hint="Add as many fields as you need — e.g. Girls, Boys, Persons with disability — each with its own value type and unit." />
            <CustomFieldsEditor v-model="indicatorForm.custom_fields" label="Other custom fields" hint="Any extra key/value data not covered above." />
            <div class="field">
              <span class="field-label">External references</span>
              <div v-for="(link, i) in indicatorForm.external_links" :key="i" class="link-row">
                <input v-model="link.label" type="text" class="field-input" placeholder="Label" />
                <input v-model="link.url" type="url" class="field-input" placeholder="https://…" />
                <button type="button" class="icon-btn icon-btn--danger" @click="indicatorForm.external_links.splice(i, 1)">&times;</button>
              </div>
              <button type="button" class="btn-ghost" @click="indicatorForm.external_links.push({ label: '', url: '' })">
                + Add reference
              </button>
            </div>
            <div v-if="indicatorError" class="api-err">{{ indicatorError }}</div>
            <div class="actions">
              <button type="button" class="btn-ghost" @click="indicatorModal.open = false">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="indicatorSaving"><span v-if="indicatorSaving" class="btn-spinner" /> {{ indicatorModal.editing ? 'Save' : 'Add indicator' }}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ═══ Link activity modal ═══ -->
      <div v-if="linkModal.open" class="modal-overlay" @click.self="linkModal.open = false">
        <div class="modal">
          <div class="modal-head">
            <h3>Link activity</h3>
            <button class="icon-btn" aria-label="Close" @click="linkModal.open = false">&times;</button>
          </div>
          <p class="modal-hint">Connect a project activity whose data feeds “{{ linkModal.indicator?.indicator }}”.</p>
          <div v-if="linkLoading" class="empty-inline">Loading activities…</div>
          <div v-else-if="!linkableActivities.length" class="empty-inline">No unlinked activities available in this project.</div>
          <div v-else class="link-list">
            <label v-for="a in linkableActivities" :key="a.id" class="link-option">
              <input type="radio" :value="a.id" v-model="linkForm.framework_activity_id" />
              <span>{{ activityName(a.id) }}<span v-if="a.template?.code" class="link-code">{{ a.template.code }}</span></span>
            </label>
          </div>
          <div v-if="linkError" class="api-err">{{ linkError }}</div>
          <div class="actions">
            <button class="btn-ghost" @click="linkModal.open = false">Cancel</button>
            <button class="btn-primary" :disabled="linkSaving || !linkForm.framework_activity_id" @click="saveLink">
              <span v-if="linkSaving" class="btn-spinner" /> Link activity
            </button>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import CustomFieldsEditor from '../../../../components/settings/CustomFieldsEditor.vue'
import TargetFieldsEditor from '../../../../components/settings/TargetFieldsEditor.vue'
import { frameworkApi } from '../../../../services/frameworkApi'
import { logframeApi } from '../../../../services/logframeApi'
import { ApiError } from '../../../../services/api'
import { useAuthStore } from '../../../../stores/auth'
import type { Framework } from '../../../../interfaces/framework'
import { TARGET_FIELDS_KEY } from '../../../../interfaces/logframe'
import type {
  Logframe,
  LogframeLevel,
  LogframeLevelType,
  LogframeIndicator,
  LogframeTemplateInfo,
  LogframeDisaggregation,
  LogframeLink,
  CustomFields,
  LogframeTargetField,
} from '../../../../interfaces/logframe'

definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'data_manager', 'program_manager', 'supervisor', 'case_worker', 'facilitator', 'director'],
})

const route = useRoute()
const projectId = route.params.id as string
const authStore = useAuthStore()

/** Roles allowed to mutate the logframe (mirrors backend logframeManageRoles). */
const MANAGE_ROLES = ['org_admin', 'data_manager', 'program_manager', 'supervisor']
const canManage = computed(() => MANAGE_ROLES.includes(authStore.userRole ?? ''))

const project = ref<Framework | null>(null)
const logframe = ref<Logframe | null>(null)
const levels = ref<LogframeLevel[]>([])
const indicators = ref<LogframeIndicator[]>([])
const templates = ref<LogframeTemplateInfo[]>([])
const frameworkActivities = ref<any[]>([])

const loading = ref(true)
const loadError = ref<string | null>(null)
const templatesLoading = ref(false)

const breadcrumbs = computed(() => [
  { title: 'Settings', href: '/settings' },
  { title: 'Projects', href: '/settings/projects' },
  { title: project.value?.project_name ?? 'Project', href: `/settings/projects/${projectId}` },
  { title: 'M&E Logframe', href: `/settings/projects/${projectId}/logframe`, current: true },
])

const levelCount = computed(() => levels.value.length)
const indicatorCount = computed(() => indicators.value.length)

/** Top-level impact tiers — the entry points into the impact detail pages. */
const impacts = computed(() => levels.value.filter((l) => l.level_type === 'impact'))
function indicatorCountByLevel(levelId: string): number {
  return indicators.value.filter((i) => i.level_id === levelId).length
}

const impactModal = reactive({ open: false })
const impactForm = reactive({ title: '' })
const impactSaving = ref(false)
const impactError = ref('')

function openImpactModal() {
  impactError.value = ''
  impactForm.title = ''
  impactModal.open = true
}

async function saveImpact() {
  impactError.value = ''
  if (!impactForm.title.trim()) { impactError.value = 'Impact statement is required'; return }
  impactSaving.value = true
  try {
    await logframeApi.createLevel(projectId, {
      level_type: 'impact',
      title: impactForm.title.trim(),
      parent_id: null,
    })
    impactModal.open = false
    await fetchAll()
  } catch (e: any) {
    impactError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to add impact')
  } finally {
    impactSaving.value = false
  }
}

/** Activity ID → display name. */
const activityNames = computed(() => {
  const map = new Map<string, string>()
  for (const a of frameworkActivities.value) {
    map.set(a.id, a.template?.name ?? a.activity_name ?? 'Activity')
  }
  return map
})
function activityName(id: string): string {
  return activityNames.value.get(id) ?? 'Activity'
}

/** Framework activities not yet linked to the indicator being edited in the link modal. */
const linkableActivities = computed(() => {
  const linked = new Set(linkModal.indicator?.activity_ids ?? [])
  return frameworkActivities.value.filter((a) => !linked.has(a.id))
})

const DISAGGREGATION_OPTIONS: { value: LogframeDisaggregation; label: string }[] = [
  { value: 'age_group', label: 'Age group' },
  { value: 'gender', label: 'Gender' },
  { value: 'disability', label: 'Disability' },
  { value: 'other', label: 'Other' },
]
const disaggregationOptions = DISAGGREGATION_OPTIONS
function disaggregationLabel(d: string): string {
  return DISAGGREGATION_OPTIONS.find((o) => o.value === d)?.label ?? d
}

// ─── Data loading ───

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
    logframe.value = data.logframe
    levels.value = data.levels ?? []
    indicators.value = data.indicators ?? []
    frameworkActivities.value = (activitiesRes as any)?.activities ?? []
  } catch (e: any) {
    loadError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to load logframe')
  } finally {
    loading.value = false
  }
}

async function fetchTemplates() {
  templatesLoading.value = true
  try {
    templates.value = await logframeApi.listTemplates(projectId)
  } catch {
    templates.value = []
  } finally {
    templatesLoading.value = false
  }
}

// ─── Metadata ───

const createForm = reactive({ name: '', description: '', donor_framework: '', custom_fields: {} as CustomFields })
const creating = ref(false)
const createError = ref('')

async function createLogframe() {
  createError.value = ''
  if (!createForm.name.trim()) { createError.value = 'Logframe name is required'; return }
  creating.value = true
  try {
    await logframeApi.upsertLogframe(projectId, {
      name: createForm.name.trim(),
      description: createForm.description.trim() || null,
      donor_framework: createForm.donor_framework.trim() || null,
      custom_fields: createForm.custom_fields,
    })
    await fetchAll()
  } catch (e: any) {
    createError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to create logframe')
  } finally {
    creating.value = false
  }
}

const editingMeta = ref(false)
const metaForm = reactive({ name: '', description: '', donor_framework: '', custom_fields: {} as CustomFields })
const metaSaving = ref(false)
const metaError = ref('')

function startEditMeta() {
  if (!logframe.value) return
  metaForm.name = logframe.value.name
  metaForm.description = logframe.value.description ?? ''
  metaForm.donor_framework = logframe.value.donor_framework ?? ''
  metaForm.custom_fields = { ...(logframe.value.custom_fields ?? {}) }
  editingMeta.value = true
}

async function saveMeta() {
  metaError.value = ''
  if (!metaForm.name.trim()) { metaError.value = 'Logframe name is required'; return }
  metaSaving.value = true
  try {
    await logframeApi.upsertLogframe(projectId, {
      name: metaForm.name.trim(),
      description: metaForm.description.trim() || null,
      donor_framework: metaForm.donor_framework.trim() || null,
      custom_fields: metaForm.custom_fields,
    })
    editingMeta.value = false
    await fetchAll()
  } catch (e: any) {
    metaError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to save logframe')
  } finally {
    metaSaving.value = false
  }
}

// ─── Import ───

const showImport = ref(false)
const importing = ref(false)
const importError = ref('')

async function importTemplate(t: LogframeTemplateInfo) {
  importError.value = ''
  importing.value = true
  try {
    const data = await logframeApi.importTemplate(projectId, { template: t.id })
    logframe.value = data.logframe
    levels.value = data.levels ?? []
    indicators.value = data.indicators ?? []
    showImport.value = false
    if (!templates.value.length) await fetchTemplates()
  } catch (e: any) {
    importError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Import failed')
  } finally {
    importing.value = false
  }
}

// ─── Levels (managed via impact detail pages only) ───

// ─── Indicators ───

const indicatorModal = reactive({ open: false, editing: false, id: '' })
const indicatorForm = reactive({
  level_id: '',
  code: '',
  indicator: '',
  definition: '',
  unit: '',
  baseline_value: null as number | null,
  baseline_year: null as number | null,
  baseline_notes: '',
  target_value: null as number | null,
  target_year: null as number | null,
  means_of_verification: '',
  assumptions: '',
  disaggregation: [] as LogframeDisaggregation[],
  data_source: '',
  external_links: [] as LogframeLink[],
  target_fields: [] as LogframeTargetField[],
  custom_fields: {} as CustomFields,
})
const indicatorSaving = ref(false)
const indicatorError = ref('')

function resetIndicatorForm() {
  indicatorForm.level_id = ''
  indicatorForm.code = ''
  indicatorForm.indicator = ''
  indicatorForm.definition = ''
  indicatorForm.unit = ''
  indicatorForm.baseline_value = null
  indicatorForm.baseline_year = null
  indicatorForm.baseline_notes = ''
  indicatorForm.target_value = null
  indicatorForm.target_year = null
  indicatorForm.means_of_verification = ''
  indicatorForm.assumptions = ''
  indicatorForm.disaggregation = []
  indicatorForm.data_source = ''
  indicatorForm.external_links = []
  indicatorForm.target_fields = []
  indicatorForm.custom_fields = {}
}

function openIndicatorModal(level: LogframeLevel, editing: LogframeIndicator | null = null) {
  indicatorError.value = ''
  resetIndicatorForm()
  if (editing) {
    indicatorModal.open = true
    indicatorModal.editing = true
    indicatorModal.id = editing.id
    indicatorForm.level_id = editing.level_id
    indicatorForm.code = editing.code ?? ''
    indicatorForm.indicator = editing.indicator
    indicatorForm.definition = editing.definition ?? ''
    indicatorForm.unit = editing.unit ?? ''
    indicatorForm.baseline_value = editing.baseline_value ?? null
    indicatorForm.baseline_year = editing.baseline_year ?? null
    indicatorForm.baseline_notes = editing.baseline_notes ?? ''
    indicatorForm.target_value = editing.target_value ?? null
    indicatorForm.target_year = editing.target_year ?? null
    indicatorForm.means_of_verification = editing.means_of_verification ?? ''
    indicatorForm.assumptions = editing.assumptions ?? ''
    indicatorForm.disaggregation = [...(editing.disaggregation ?? [])]
    indicatorForm.data_source = editing.data_source ?? ''
    indicatorForm.external_links = (editing.external_links ?? []).map((l) => ({ label: l.label, url: l.url }))
    // Target fields ride inside custom_fields; split them out for editing.
    const custom = { ...(editing.custom_fields ?? {}) }
    const stored = custom[TARGET_FIELDS_KEY]
    indicatorForm.target_fields = Array.isArray(stored) ? (stored as LogframeTargetField[]) : []
    delete custom[TARGET_FIELDS_KEY]
    indicatorForm.custom_fields = custom
  } else {
    indicatorModal.open = true
    indicatorModal.editing = false
    indicatorModal.id = ''
    indicatorForm.level_id = level.id
  }
}

async function saveIndicator() {
  indicatorError.value = ''
  if (!indicatorForm.indicator.trim()) { indicatorError.value = 'Indicator text is required'; return }
  indicatorSaving.value = true
  try {
    const payload = {
      level_id: indicatorForm.level_id,
      code: indicatorForm.code.trim() || null,
      indicator: indicatorForm.indicator.trim(),
      definition: indicatorForm.definition.trim() || null,
      unit: indicatorForm.unit.trim() || null,
      baseline_value: indicatorForm.baseline_value,
      baseline_year: indicatorForm.baseline_year,
      baseline_notes: indicatorForm.baseline_notes.trim() || null,
      target_value: indicatorForm.target_value,
      target_year: indicatorForm.target_year,
      means_of_verification: indicatorForm.means_of_verification.trim() || null,
      assumptions: indicatorForm.assumptions.trim() || null,
      disaggregation: indicatorForm.disaggregation,
      data_source: indicatorForm.data_source.trim() || null,
      external_links: indicatorForm.external_links.filter((l) => l.label.trim() && l.url.trim()),
      custom_fields: {
        ...indicatorForm.custom_fields,
        ...(indicatorForm.target_fields.some((f) => f.label.trim())
          ? { [TARGET_FIELDS_KEY]: indicatorForm.target_fields.filter((f) => f.label.trim()) }
          : {}),
      },
    }
    if (indicatorModal.editing) {
      await logframeApi.updateIndicator(projectId, indicatorModal.id, payload)
    } else {
      await logframeApi.createIndicator(projectId, payload)
    }
    indicatorModal.open = false
    await fetchAll()
  } catch (e: any) {
    indicatorError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to save indicator')
  } finally {
    indicatorSaving.value = false
  }
}

const confirmIndicatorId = ref<string | null>(null)

function requestDeleteIndicator(ind: LogframeIndicator) {
  if (confirmIndicatorId.value === ind.id) {
    deleteIndicator(ind)
  } else {
    confirmIndicatorId.value = ind.id
    setTimeout(() => { if (confirmIndicatorId.value === ind.id) confirmIndicatorId.value = null }, 3000)
  }
}

async function deleteIndicator(ind: LogframeIndicator) {
  confirmIndicatorId.value = null
  try {
    await logframeApi.deleteIndicator(projectId, ind.id)
    await fetchAll()
  } catch (e: any) {
    loadError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to delete indicator')
  }
}

// ─── Activity linking ───

const linkModal = reactive({ open: false, indicator: null as LogframeIndicator | null })
const linkForm = reactive({ framework_activity_id: '' })
const linkLoading = ref(false)
const linkSaving = ref(false)
const linkError = ref('')

async function openLinkModal(ind: LogframeIndicator) {
  linkError.value = ''
  linkModal.open = true
  linkModal.indicator = ind
  linkForm.framework_activity_id = ''
  linkLoading.value = true
  try {
    const res = await frameworkApi.getActivities(projectId)
    frameworkActivities.value = (res as any)?.activities ?? []
  } catch {
    // keep stale activity list
  } finally {
    linkLoading.value = false
  }
}

async function saveLink() {
  if (!linkModal.indicator || !linkForm.framework_activity_id) return
  linkError.value = ''
  linkSaving.value = true
  try {
    await logframeApi.linkActivity(projectId, linkModal.indicator.id, {
      framework_activity_id: linkForm.framework_activity_id,
    })
    linkModal.open = false
    await fetchAll()
  } catch (e: any) {
    linkError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to link activity')
  } finally {
    linkSaving.value = false
  }
}

async function unlinkActivity(ind: LogframeIndicator, activityId: string) {
  try {
    await logframeApi.unlinkActivity(projectId, ind.id, activityId)
    await fetchAll()
  } catch (e: any) {
    loadError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to unlink activity')
  }
}

onMounted(() => {
  fetchAll()
  fetchTemplates()
})
</script>

<style scoped>
/* Shared look comes from assets/css/project-settings.css (.ps-page). */
.logframe-page { max-width: 960px; }

.empty-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
.capitalize { text-transform: capitalize; }

/* Modal content */
.checkbox-row { display: flex; flex-wrap: wrap; gap: 16px; padding: 4px 0; }
.checkbox-item { display: inline-flex; align-items: center; gap: 6px; font-size: 0.86rem; color: var(--ps-text); cursor: pointer; }
.link-row { display: grid; grid-template-columns: 1fr 2fr auto; gap: 8px; margin-bottom: 8px; align-items: center; }
.link-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
.link-option {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  font-size: 0.88rem; color: var(--ps-text); background: var(--ps-tile); border-radius: 8px; cursor: pointer;
}
.link-code { margin-left: 8px; font-size: 0.76rem; color: var(--ps-text-2); }
</style>
