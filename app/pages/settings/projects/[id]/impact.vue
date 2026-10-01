<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="impact-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Impact</h1>
          <p class="page-subtitle">
            Impact areas, indicators and their numerical targets for {{ project?.project_name ?? 'this project' }}
          </p>
        </div>
        <div class="header-actions">
          <NuxtLink :to="`/settings/projects/${projectId}/logframe`" class="btn-secondary">
            <AppIcon name="layers" :size="14" /> Logframe
          </NuxtLink>
          <NuxtLink :to="`/settings/projects/${projectId}`" class="btn-back">
            <AppIcon name="arrow-left" :size="14" /> Project settings
          </NuxtLink>
        </div>
      </div>

      <!-- Loading / error -->
      <div v-if="loading" class="state state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>
      <div v-else-if="loadError" class="state state--error">
        <AppIcon name="alert-circle" :size="18" /> {{ loadError }}
      </div>

      <template v-else>
        <!-- No logframe yet -->
        <div v-if="!data?.logframe" class="empty-state">
          <div class="empty-icon"><AppIcon name="target" :size="28" /></div>
          <h2>No logframe yet</h2>
          <p>This project has no M&E logframe. Create one to define its impact areas, indicators and targets.</p>
          <NuxtLink :to="`/settings/projects/${projectId}/logframe`" class="btn-primary">
            <AppIcon name="plus" :size="14" /> Go to logframe
          </NuxtLink>
        </div>

        <template v-else>
          <!-- Summary -->
          <div class="summary-grid">
            <div class="stat-card">
              <span class="stat-value">{{ data.summary.impacts }}</span>
              <span class="stat-label">Impact areas</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ data.summary.outcomes }}</span>
              <span class="stat-label">Outcomes</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ data.summary.results }}</span>
              <span class="stat-label">Results</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ data.summary.indicators }}</span>
              <span class="stat-label">Indicators</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ data.summary.indicators_with_targets }}</span>
              <span class="stat-label">With targets</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ formatNumber(data.summary.total_target_value) }}</span>
              <span class="stat-label">Total target</span>
            </div>
          </div>

          <!-- Logframe meta -->
          <div class="section-label">Logframe</div>
          <div class="section-card meta-card">
            <div>
              <h2 class="meta-name">{{ data.logframe.name }}</h2>
              <p v-if="data.logframe.description" class="meta-desc">{{ data.logframe.description }}</p>
              <div class="meta-tags">
                <span v-if="data.logframe.donor_framework" class="tag tag--donor">
                  <AppIcon name="shield" :size="12" /> {{ data.logframe.donor_framework }}
                </span>
                <span class="tag tag--status"><AppIcon name="clock" :size="12" /> {{ data.logframe.status }}</span>
              </div>
            </div>
          </div>

          <!-- Impact areas → indicators -->
          <div v-if="!groupedLevels.length" class="empty-inline">
            No hierarchy levels yet — add an impact area in the logframe to define indicators.
          </div>

          <div v-for="group in groupedLevels" :key="group.level.id" class="impact-group" :style="{ marginLeft: `${group.depth * 20}px` }">
            <div class="group-head" :class="`group-head--${group.level.level_type}`">
              <span class="level-badge">{{ group.level.level_type }}</span>
              <span class="group-title">{{ group.level.title }}</span>
              <span class="group-count">{{ group.indicators.length }} indicator{{ group.indicators.length === 1 ? '' : 's' }}</span>
            </div>

            <div v-if="!group.indicators.length" class="level-empty">No indicators on this level.</div>

            <div v-for="ind in group.indicators" :key="ind.id" class="indicator-card">
              <div class="indicator-head">
                <span v-if="ind.code" class="indicator-code">{{ ind.code }}</span>
                <span class="indicator-title">{{ ind.indicator }}</span>
                <div class="indicator-actions" v-if="canManage">
                  <button class="icon-btn" title="Edit target & fields" @click="openEdit(ind)">
                    <AppIcon name="pencil" :size="13" />
                  </button>
                </div>
              </div>

              <!-- Targets in numbers -->
              <div class="target-row">
                <div class="target-block">
                  <span class="target-block-label">Baseline</span>
                  <span class="target-block-value">{{ formatNum(ind.baseline_value) }}<small v-if="ind.baseline_year"> · {{ ind.baseline_year }}</small></span>
                </div>
                <div class="target-block target-block--target">
                  <span class="target-block-label">Target</span>
                  <span class="target-block-value">{{ formatNum(ind.target_value) }}<small v-if="ind.unit"> {{ ind.unit }}</small></span>
                </div>
                <div class="target-block">
                  <span class="target-block-label">Actual</span>
                  <span class="target-block-value">{{ formatNum(ind.actual_value) }}</span>
                </div>
                <div class="progress-block">
                  <div class="progress-track">
                    <div class="progress-bar" :style="{ width: `${ind.percentage}%` }" />
                  </div>
                  <span class="progress-label">{{ ind.percentage }}%</span>
                </div>
              </div>

              <!-- Custom fields (customise) -->
              <div v-if="customFieldEntries(ind).length" class="custom-tags">
                <span v-for="[k, v] in customFieldEntries(ind)" :key="k" class="tag tag--custom">{{ k }}: {{ v }}</span>
              </div>

              <!-- Activities -->
              <div class="activities-block">
                <div class="activities-head">
                  <AppIcon name="activity" :size="12" /> Activities
                </div>
                <div v-if="!ind.linked_activities.length" class="activities-empty">
                  No activities linked. Link project activities in the logframe.
                </div>
                <div v-else class="activity-list">
                  <div v-for="act in ind.linked_activities" :key="act.id" class="activity-row">
                    <div class="activity-name">
                      <span class="activity-title">{{ act.activity_name }}</span>
                      <span class="activity-code">{{ act.activity_code }}</span>
                    </div>
                    <div class="activity-stats">
                      <span class="activity-target">target {{ formatNumber(act.target_count) }} {{ act.target_unit }}</span>
                      <span class="activity-actual">{{ formatNumber(act.actual_count) }} done</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="treeError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ treeError }}</div>
        </template>
      </template>

      <!-- Edit target / custom fields modal -->
      <div v-if="editModal.open" class="modal-overlay" @click.self="editModal.open = false">
        <div class="modal">
          <div class="modal-head">
            <h3>Edit impact indicator</h3>
            <button class="icon-btn" @click="editModal.open = false"><AppIcon name="x" :size="15" /></button>
          </div>
          <p class="modal-hint">{{ editModal.indicator?.indicator }}</p>
          <form class="modal-form" @submit.prevent="saveEdit">
            <div class="form-grid">
              <div class="field">
                <label class="field-label" for="im-tv">Target value</label>
                <input id="im-tv" v-model.number="editForm.target_value" type="number" step="any" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label" for="im-ty">Target year</label>
                <input id="im-ty" v-model.number="editForm.target_year" type="number" min="1900" max="2100" class="field-input" />
              </div>
              <div class="field">
                <label class="field-label" for="im-unit">Unit</label>
                <input id="im-unit" v-model="editForm.unit" type="text" class="field-input" placeholder="e.g. persons, %" />
              </div>
            </div>
            <CustomFieldsEditor
              v-model="editForm.custom_fields"
              label="Custom fields"
              hint="Add your own fields — e.g. yearly targets, responsible party."
            />
            <div v-if="editError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ editError }}</div>
            <div class="actions">
              <button type="button" class="btn-ghost" @click="editModal.open = false">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="editSaving">
                <span v-if="editSaving" class="btn-spinner" /> Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { frameworkApi } from '../../../../services/frameworkApi'
import { logframeApi } from '../../../../services/logframeApi'
import { ApiError } from '../../../../services/api'
import { useAuthStore } from '../../../../stores/auth'
import type { Framework } from '../../../../interfaces/framework'
import type {
  CustomFields,
  LogframeImpactData,
  LogframeImpactIndicator,
  LogframeIndicatorRequest,
  LogframeLevel,
} from '../../../../interfaces/logframe'

definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'data_manager', 'program_manager', 'supervisor', 'case_worker', 'facilitator', 'director'],
})

const route = useRoute()
const projectId = route.params.id as string
const authStore = useAuthStore()

const MANAGE_ROLES = ['org_admin', 'data_manager', 'program_manager', 'supervisor']
const canManage = computed(() => MANAGE_ROLES.includes(authStore.userRole ?? ''))

const project = ref<Framework | null>(null)
const data = ref<LogframeImpactData | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const treeError = ref('')

const breadcrumbs = computed(() => [
  { title: 'Settings', href: '/settings' },
  { title: 'Projects', href: '/settings/projects' },
  { title: project.value?.project_name ?? 'Project', href: `/settings/projects/${projectId}` },
  { title: 'Impact', href: `/settings/projects/${projectId}/impact`, current: true },
])

/** Level ID → level, for label lookups. */
const levelByID = computed(() => {
  const map = new Map<string, LogframeLevel>()
  for (const l of data.value?.levels ?? []) map.set(l.id, l)
  return map
})

/** Flatten the level tree (depth-annotated) and attach each level's indicators. */
const groupedLevels = computed(() => {
  const levels = data.value?.levels ?? []
  const byParent = new Map<string | null, LogframeLevel[]>()
  for (const l of levels) {
    const key = l.parent_id ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(l)
  }
  const indicatorsByLevel = new Map<string, LogframeImpactIndicator[]>()
  for (const ind of data.value?.indicators ?? []) {
    if (!indicatorsByLevel.has(ind.level_id)) indicatorsByLevel.set(ind.level_id, [])
    indicatorsByLevel.get(ind.level_id)!.push(ind)
  }
  for (const list of indicatorsByLevel.values()) list.sort((a, b) => a.sort_order - b.sort_order)

  const out: { level: LogframeLevel; depth: number; indicators: LogframeImpactIndicator[] }[] = []
  const walk = (parentId: string | null, depth: number) => {
    const children = (byParent.get(parentId) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
    for (const l of children) {
      out.push({ level: l, depth, indicators: indicatorsByLevel.get(l.id) ?? [] })
      walk(l.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
})

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat().format(n)
}
function formatNum(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : String(n)
}
function customFieldEntries(ind: LogframeImpactIndicator): [string, string][] {
  const cf = (ind.custom_fields ?? {}) as Record<string, unknown>
  return Object.entries(cf).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
}

async function fetchAll() {
  loading.value = true
  loadError.value = null
  try {
    const [frameworks, impact] = await Promise.all([
      frameworkApi.listFrameworks(),
      logframeApi.getImpact(projectId),
    ])
    project.value = (frameworks.frameworks ?? []).find((f) => f.id === projectId) ?? null
    data.value = impact
  } catch (e: any) {
    loadError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to load impact view')
  } finally {
    loading.value = false
  }
}

// ─── Edit target / custom fields ───

const editModal = reactive({ open: false, indicator: null as LogframeImpactIndicator | null })
const editForm = reactive({
  target_value: null as number | null,
  target_year: null as number | null,
  unit: '',
  custom_fields: {} as CustomFields,
})
const editSaving = ref(false)
const editError = ref('')

function openEdit(ind: LogframeImpactIndicator) {
  editError.value = ''
  editModal.open = true
  editModal.indicator = ind
  editForm.target_value = ind.target_value ?? null
  editForm.target_year = ind.target_year ?? null
  editForm.unit = ind.unit ?? ''
  editForm.custom_fields = { ...(ind.custom_fields ?? {}) }
}

async function saveEdit() {
  const ind = editModal.indicator
  if (!ind) return
  editError.value = ''
  editSaving.value = true
  try {
    // Send the full indicator so the update does not clear unrelated fields.
    const payload: LogframeIndicatorRequest = {
      level_id: ind.level_id,
      code: ind.code ?? null,
      indicator: ind.indicator,
      definition: ind.definition ?? null,
      unit: editForm.unit.trim() || null,
      baseline_value: ind.baseline_value ?? null,
      baseline_year: ind.baseline_year ?? null,
      baseline_notes: ind.baseline_notes ?? null,
      target_value: editForm.target_value,
      target_year: editForm.target_year,
      means_of_verification: ind.means_of_verification ?? null,
      assumptions: ind.assumptions ?? null,
      disaggregation: ind.disaggregation ?? [],
      data_source: ind.data_source ?? null,
      external_links: ind.external_links ?? [],
      sort_order: ind.sort_order,
      custom_fields: editForm.custom_fields,
    }
    await logframeApi.updateIndicator(projectId, ind.id, payload)
    editModal.open = false
    await fetchAll()
  } catch (e: any) {
    editError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to save indicator')
  } finally {
    editSaving.value = false
  }
}

onMounted(fetchAll)
</script>

<style scoped>
.impact-page { max-width: 1000px; padding-bottom: 48px; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  margin-bottom: 24px; flex-wrap: wrap;
}
.page-title { font-size: 1.35rem; font-weight: 750; margin: 0 0 2px; }
.page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin: 0; }
.header-actions { display: flex; gap: 8px; align-items: center; }

.btn-back {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.8rem; color: var(--text-muted); text-decoration: none;
  padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 8px;
}
.btn-secondary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 12px; font-size: 0.82rem; font-weight: 600;
  background: var(--bg-panel); color: var(--text-primary);
  border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; text-decoration: none;
}
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; font-size: 0.82rem; font-weight: 600;
  background: var(--accent); color: white; border: none; border-radius: 8px;
  cursor: pointer; text-decoration: none;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 12px; font-size: 0.82rem;
  background: transparent; color: var(--text-muted);
  border: none; border-radius: 8px; cursor: pointer;
}
.btn-spinner {
  width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.section-label {
  font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-muted); margin: 24px 0 6px; padding-left: 2px;
}
.section-card { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 10px; padding: 18px; }
.meta-card { padding: 20px; }
.meta-name { margin: 0 0 4px; font-size: 1.1rem; }
.meta-desc { margin: 0 0 8px; font-size: 0.84rem; color: var(--text-muted); }
.meta-tags { display: flex; flex-wrap: wrap; gap: 6px; }

.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
.stat-card {
  display: flex; flex-direction: column; gap: 2px;
  background: var(--bg-panel); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 14px 16px;
}
.stat-value { font-size: 1.4rem; font-weight: 750; }
.stat-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }

.tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; font-size: 0.72rem; font-weight: 600;
  background: var(--bg-surface); border: 1px solid var(--border-color);
  border-radius: 999px; color: var(--text-muted);
}
.tag--donor { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
.tag--status { text-transform: capitalize; }
.tag--custom { color: var(--text-secondary); }

.impact-group { margin-top: 18px; }
.group-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.group-title { font-size: 0.95rem; font-weight: 700; }
.group-count { font-size: 0.72rem; color: var(--text-muted); }
.level-badge {
  padding: 2px 8px; font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; border-radius: 999px;
  background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-muted);
}
.group-head--goal .level-badge { color: #818cf8; }
.group-head--impact .level-badge { color: #a78bfa; }
.group-head--outcome .level-badge { color: #38bdf8; }
.group-head--result .level-badge { color: #34d399; }
.group-head--activity .level-badge { color: #fbbf24; }
.level-empty { font-size: 0.78rem; color: var(--text-muted); font-style: italic; padding: 6px 0; }

.indicator-card {
  background: var(--bg-panel); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 14px 16px; margin-bottom: 10px;
}
.indicator-head { display: flex; align-items: center; gap: 8px; }
.indicator-code {
  padding: 1px 7px; font-size: 0.7rem; font-weight: 700;
  background: var(--bg-surface); border: 1px solid var(--border-color);
  border-radius: 5px; color: var(--accent);
}
.indicator-title { font-size: 0.88rem; font-weight: 600; flex: 1; }
.indicator-actions { display: flex; gap: 2px; }
.icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 6px; border: none;
  background: transparent; color: var(--text-muted); cursor: pointer;
}
.icon-btn:hover { background: var(--bg-surface); color: var(--text-primary); }

.target-row { display: flex; align-items: center; gap: 20px; margin-top: 12px; flex-wrap: wrap; }
.target-block { display: flex; flex-direction: column; gap: 1px; }
.target-block-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
.target-block-value { font-size: 0.95rem; font-weight: 700; }
.target-block-value small { font-weight: 500; color: var(--text-muted); }
.target-block--target .target-block-value { color: var(--success); }
.progress-block { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 160px; }
.progress-track { flex: 1; height: 8px; background: var(--bg-surface); border-radius: 999px; overflow: hidden; }
.progress-bar { height: 100%; background: var(--accent); border-radius: 999px; }
.progress-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }

.custom-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }

.activities-block { margin-top: 12px; border-top: 1px dashed var(--border-color); padding-top: 10px; }
.activities-head {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 6px;
}
.activities-empty { font-size: 0.78rem; color: var(--text-muted); font-style: italic; }
.activity-list { display: flex; flex-direction: column; gap: 6px; }
.activity-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 8px 10px; background: var(--bg-surface); border: 1px solid var(--border-color);
  border-radius: 8px;
}
.activity-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
.activity-title { font-size: 0.82rem; font-weight: 600; }
.activity-code {
  font-size: 0.68rem; color: var(--text-muted);
  background: var(--bg-panel); border: 1px solid var(--border-color);
  border-radius: 5px; padding: 1px 6px;
}
.activity-stats { display: flex; gap: 12px; flex-shrink: 0; }
.activity-target { font-size: 0.74rem; color: var(--text-muted); }
.activity-actual { font-size: 0.74rem; font-weight: 600; color: var(--success); }

.api-err {
  display: flex; align-items: center; gap: 6px; margin-top: 12px;
  padding: 10px 12px; font-size: 0.82rem; color: var(--error); background: var(--error-bg); border-radius: 6px;
}

/* Modals */
.modal-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(10, 10, 20, 0.6); backdrop-filter: blur(2px);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 48px 16px; overflow-y: auto;
}
.modal {
  width: 100%; max-width: 520px;
  background: var(--bg-panel); border: 1px solid var(--border-color);
  border-radius: 12px; padding: 20px;
}
.modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.modal-head h3 { margin: 0; font-size: 1rem; }
.modal-hint { font-size: 0.78rem; color: var(--text-muted); margin: 0 0 14px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; }
.field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.field-label { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); }
.field-input {
  width: 100%; padding: 8px 10px; font-size: 0.85rem;
  background: var(--bg-input); border: 1px solid var(--border-color);
  border-radius: 6px; color: var(--text-primary); font-family: inherit;
}
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }

.empty-state { text-align: left; padding: 24px 0; }
.empty-state h2 { margin: 12px 0 4px; font-size: 1.1rem; }
.empty-state p { color: var(--text-muted); font-size: 0.85rem; max-width: 560px; margin-bottom: 14px; }
.empty-icon {
  width: 52px; height: 52px; border-radius: 12px;
  background: var(--bg-panel); border: 1px solid var(--border-color);
  display: flex; align-items: center; justify-content: center; color: var(--accent);
}
.empty-inline { padding: 14px; font-size: 0.82rem; color: var(--text-muted); background: var(--bg-surface); border-radius: 8px; }
</style>
