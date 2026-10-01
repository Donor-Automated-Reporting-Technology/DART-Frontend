<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="logframe-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">M&E Logframe</h1>
          <p class="page-subtitle">
            Theory of change, indicators and donor alignment for {{ project?.project_name ?? 'this project' }}
          </p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" @click="showImport = true" :disabled="!templates.length">
            <AppIcon name="download" :size="14" /> Import donor template
          </button>
          <NuxtLink :to="`/settings/projects/${projectId}/impact`" class="btn-back">
            <AppIcon name="bar-chart" :size="14" /> Impact
          </NuxtLink>
          <NuxtLink :to="`/settings/projects/${projectId}`" class="btn-back">
            <AppIcon name="arrow-left" :size="14" /> Project settings
          </NuxtLink>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading && !logframe" class="state state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>

      <!-- Error -->
      <div v-else-if="loadError" class="state state--error">
        <AppIcon name="alert-circle" :size="18" /> {{ loadError }}
      </div>

      <template v-else>
        <!-- ═══ Empty state: no logframe yet ═══ -->
        <div v-if="!logframe" class="empty-state">
          <div class="empty-icon"><AppIcon name="layers" :size="28" /></div>
          <h2>No logframe yet</h2>
          <p>Create an empty logframe, or import a donor template (e.g. ECHO DRA protection) to scaffold outcomes and indicators automatically.</p>

          <div class="empty-grid">
            <!-- Create empty -->
            <div class="section-card">
              <div class="section-label">Create empty logframe</div>
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
              <div v-if="createError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ createError }}</div>
              <div class="actions">
                <button class="btn-primary" :disabled="creating" @click="createLogframe">
                  <span v-if="creating" class="btn-spinner" /> Create logframe
                </button>
              </div>
            </div>

            <!-- Import template -->
            <div class="section-card">
              <div class="section-label">Import donor template</div>
              <p class="section-hint">Available templates for this project:</p>
              <div v-if="templatesLoading" class="empty-inline">Loading templates…</div>
              <div v-else-if="!templates.length" class="empty-inline">No donor templates available.</div>
              <div v-for="t in templates" :key="t.id" class="template-row">
                <div class="template-info">
                  <div class="template-name">{{ t.name }}</div>
                  <div class="template-meta">{{ t.donor }} · {{ t.indicator_count }} indicators</div>
                  <div class="template-desc">{{ t.description }}</div>
                </div>
                <button class="btn-secondary" :disabled="importing" @click="importTemplate(t)">
                  <AppIcon name="download" :size="13" /> Import
                </button>
              </div>
              <div v-if="importError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ importError }}</div>
            </div>
          </div>
        </div>

        <!-- ═══ Existing logframe ═══ -->
        <template v-else>
          <!-- Metadata -->
          <div class="section-label">Logframe</div>
          <div class="section-card meta-card">
            <div v-if="!editingMeta" class="meta-view">
              <div>
                <h2 class="meta-name">{{ logframe.name }}</h2>
                <p v-if="logframe.description" class="meta-desc">{{ logframe.description }}</p>
                <div class="meta-tags">
                  <span v-if="logframe.donor_framework" class="tag tag--donor"><AppIcon name="shield" :size="12" /> {{ logframe.donor_framework }}</span>
                  <span class="tag tag--status"><AppIcon name="clock" :size="12" /> {{ logframe.status }}</span>
                  <span class="tag">v{{ logframe.version }}</span>
                  <span class="tag">{{ levelCount }} levels · {{ indicatorCount }} indicators</span>
                </div>
              </div>
              <div class="meta-actions" v-if="canManage">
                <button class="btn-secondary" @click="startEditMeta"><AppIcon name="pencil" :size="13" /> Edit</button>
              </div>
            </div>
            <form v-else class="meta-form" @submit.prevent="saveMeta">
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
              <div v-if="metaError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ metaError }}</div>
              <div class="actions">
                <button type="button" class="btn-ghost" @click="editingMeta = false">Cancel</button>
                <button type="submit" class="btn-primary" :disabled="metaSaving"><span v-if="metaSaving" class="btn-spinner" /> Save</button>
              </div>
            </form>
          </div>

          <!-- Hierarchy tree -->
          <div class="section-label">Hierarchy</div>
          <p class="section-hint">Goal → outcome → result → activity. Each level can carry indicators.</p>

          <div v-if="!flatLevels.length" class="empty-inline">
            No hierarchy levels yet — add a goal to start building the theory of change.
          </div>

          <div v-for="node in flatLevels" :key="node.level.id" class="level-node" :style="{ marginLeft: `${node.depth * 28}px` }">
            <div class="level-card" :class="`level-card--${node.level.level_type}`">
              <div class="level-head">
                <span class="level-badge">{{ node.level.level_type }}</span>
                <span class="level-title">{{ node.level.title }}</span>
                <div class="level-actions" v-if="canManage">
                  <button class="icon-btn" title="Add indicator" @click="openIndicatorModal(node.level)">
                    <AppIcon name="plus" :size="13" />
                  </button>
                  <button class="icon-btn" title="Add child level" @click="openLevelModal(node.level)">
                    <AppIcon name="user-plus" :size="13" />
                  </button>
                  <button class="icon-btn" title="Edit level" @click="openLevelModal(null, node.level)">
                    <AppIcon name="pencil" :size="13" />
                  </button>
                  <button class="icon-btn icon-btn--danger" title="Delete level" @click="requestDeleteLevel(node.level)">
                    <AppIcon name="trash" :size="13" />
                  </button>
                </div>
              </div>

              <!-- Indicators on this level -->
              <div v-if="indicatorsByLevel.get(node.level.id)?.length" class="indicator-list">
                <div v-for="ind in indicatorsByLevel.get(node.level.id)" :key="ind.id" class="indicator-card">
                  <div class="indicator-head">
                    <span v-if="ind.code" class="indicator-code">{{ ind.code }}</span>
                    <span class="indicator-title">{{ ind.indicator }}</span>
                    <div class="level-actions" v-if="canManage">
                      <button class="icon-btn" title="Link activity" @click="openLinkModal(ind)">
                        <AppIcon name="tag" :size="13" />
                      </button>
                      <button class="icon-btn" title="Edit indicator" @click="openIndicatorModal(node.level, ind)">
                        <AppIcon name="pencil" :size="13" />
                      </button>
                      <button class="icon-btn icon-btn--danger" title="Delete indicator" @click="requestDeleteIndicator(ind)">
                        <AppIcon name="trash" :size="13" />
                      </button>
                    </div>
                  </div>
                  <p v-if="ind.definition" class="indicator-def">{{ ind.definition }}</p>
                  <div class="indicator-meta">
                    <span v-if="ind.unit" class="tag">{{ ind.unit }}</span>
                    <span v-if="ind.baseline_value !== null && ind.baseline_value !== undefined" class="tag tag--baseline">
                      baseline {{ ind.baseline_value }}{{ ind.baseline_year ? ` (${ind.baseline_year})` : '' }}
                    </span>
                    <span v-if="ind.target_value !== null && ind.target_value !== undefined" class="tag tag--target">
                      target {{ ind.target_value }}{{ ind.target_year ? ` (${ind.target_year})` : '' }}
                    </span>
                    <span v-for="d in ind.disaggregation" :key="d" class="tag tag--disagg">{{ disaggregationLabel(d) }}</span>
                  </div>
                  <div v-if="ind.means_of_verification" class="indicator-mov">
                    <strong>Means of verification:</strong> {{ ind.means_of_verification }}
                  </div>
                  <div v-if="ind.assumptions" class="indicator-mov">
                    <strong>Assumptions:</strong> {{ ind.assumptions }}
                  </div>
                  <div v-if="ind.data_source" class="indicator-mov">
                    <strong>Data source:</strong> {{ ind.data_source }}
                  </div>
                  <!-- Linked activities -->
                  <div v-if="ind.activity_ids.length" class="linked-activities">
                    <span class="linked-label"><AppIcon name="activity" :size="12" /> Activities:</span>
                    <span v-for="actId in ind.activity_ids" :key="actId" class="linked-chip">
                      {{ activityName(actId) }}
                      <button v-if="canManage" class="chip-x" title="Unlink activity" @click="unlinkActivity(ind, actId)"><AppIcon name="x" :size="10" /></button>
                    </span>
                  </div>
                  <div v-if="ind.external_links.length" class="linked-activities">
                    <span class="linked-label"><AppIcon name="file-text" :size="12" /> References:</span>
                    <a v-for="(l, i) in ind.external_links" :key="i" :href="l.url" target="_blank" rel="noopener" class="linked-chip linked-chip--link">
                      {{ l.label }}
                    </a>
                  </div>
                </div>
              </div>
              <div v-else class="level-empty">No indicators on this level.</div>
            </div>
          </div>

          <div class="actions tree-actions" v-if="canManage">
            <button class="btn-secondary" @click="openLevelModal(null)">
              <AppIcon name="plus" :size="14" /> Add goal
            </button>
          </div>

          <div v-if="treeError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ treeError }}</div>
        </template>
      </template>

      <!-- ═══ Import modal ═══ -->
      <div v-if="showImport" class="modal-overlay" @click.self="showImport = false">
        <div class="modal">
          <div class="modal-head">
            <h3>Import donor template</h3>
            <button class="icon-btn" @click="showImport = false"><AppIcon name="x" :size="15" /></button>
          </div>
          <p class="modal-hint">Imports all indicators from the template as outcome → result levels. Baselines and targets are left empty for tailoring.</p>
          <div v-if="importing" class="empty-inline">Importing…</div>
          <div v-else>
            <div v-for="t in templates" :key="t.id" class="template-row">
              <div class="template-info">
                <div class="template-name">{{ t.name }}</div>
                <div class="template-meta">{{ t.donor }} · {{ t.indicator_count }} indicators</div>
                <div class="template-desc">{{ t.description }}</div>
              </div>
              <button class="btn-secondary" @click="importTemplate(t)">Import</button>
            </div>
            <div v-if="importError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ importError }}</div>
          </div>
        </div>
      </div>

      <!-- ═══ Level create/edit modal ═══ -->
      <div v-if="levelModal.open" class="modal-overlay" @click.self="levelModal.open = false">
        <div class="modal">
          <div class="modal-head">
            <h3>{{ levelModal.editing ? 'Edit level' : 'Add level' }}</h3>
            <button class="icon-btn" @click="levelModal.open = false"><AppIcon name="x" :size="15" /></button>
          </div>
          <form class="modal-form" @submit.prevent="saveLevel">
            <div class="field">
              <label class="field-label" for="lfm-type">Level type *</label>
              <select id="lfm-type" v-model="levelForm.level_type" class="field-input" :disabled="!!levelModal.editing">
                <option value="goal">Goal</option>
                <option value="impact">Impact</option>
                <option value="outcome">Outcome</option>
                <option value="result">Result</option>
                <option value="activity">Activity</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label" for="lfm-title">Title *</label>
              <input id="lfm-title" v-model="levelForm.title" type="text" class="field-input" placeholder="e.g. Children in supported CFS show improved wellbeing" />
            </div>
            <div class="field">
              <label class="field-label" for="lfm-parent">Parent level</label>
              <select id="lfm-parent" v-model="levelForm.parent_id" class="field-input">
                <option :value="null">— none (top level) —</option>
                <option v-for="p in validParents" :key="p.id" :value="p.id">
                  {{ p.level_type }}: {{ p.title }}
                </option>
              </select>
              <span class="field-hint">Parents must sit above the chosen level type in the hierarchy.</span>
            </div>
            <CustomFieldsEditor v-model="levelForm.custom_fields" label="Custom fields" hint="Add your own level fields." />
            <div v-if="levelError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ levelError }}</div>
            <div class="actions">
              <button type="button" class="btn-ghost" @click="levelModal.open = false">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="levelSaving"><span v-if="levelSaving" class="btn-spinner" /> {{ levelModal.editing ? 'Save' : 'Add level' }}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ═══ Indicator create/edit modal ═══ -->
      <div v-if="indicatorModal.open" class="modal-overlay" @click.self="indicatorModal.open = false">
        <div class="modal modal--wide">
          <div class="modal-head">
            <h3>{{ indicatorModal.editing ? 'Edit indicator' : 'Add indicator' }}</h3>
            <button class="icon-btn" @click="indicatorModal.open = false"><AppIcon name="x" :size="15" /></button>
          </div>
          <form class="modal-form" @submit.prevent="saveIndicator">
            <div class="field">
              <label class="field-label" for="lfi-level">Level *</label>
              <select id="lfi-level" v-model="indicatorForm.level_id" class="field-input" :disabled="!!indicatorModal.editing">
                <option v-for="l in flatLevels.map((n) => n.level)" :key="l.id" :value="l.id">
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
            <CustomFieldsEditor v-model="indicatorForm.custom_fields" label="Custom fields" hint="Add your own indicator fields (e.g. yearly targets, responsible party)." />
            <div class="field">
              <span class="field-label">External references</span>
              <div v-for="(link, i) in indicatorForm.external_links" :key="i" class="link-row">
                <input v-model="link.label" type="text" class="field-input" placeholder="Label" />
                <input v-model="link.url" type="url" class="field-input" placeholder="https://…" />
                <button type="button" class="icon-btn icon-btn--danger" @click="indicatorForm.external_links.splice(i, 1)"><AppIcon name="x" :size="13" /></button>
              </div>
              <button type="button" class="btn-ghost" @click="indicatorForm.external_links.push({ label: '', url: '' })">
                <AppIcon name="plus" :size="13" /> Add reference
              </button>
            </div>
            <div v-if="indicatorError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ indicatorError }}</div>
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
            <button class="icon-btn" @click="linkModal.open = false"><AppIcon name="x" :size="15" /></button>
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
          <div v-if="linkError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ linkError }}</div>
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
import { frameworkApi } from '../../../../services/frameworkApi'
import { logframeApi } from '../../../../services/logframeApi'
import { ApiError } from '../../../../services/api'
import { useAuthStore } from '../../../../stores/auth'
import type { Framework } from '../../../../interfaces/framework'
import type {
  Logframe,
  LogframeLevel,
  LogframeLevelType,
  LogframeIndicator,
  LogframeTemplateInfo,
  LogframeDisaggregation,
  LogframeLink,
  CustomFields,
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
/** Errors from tree-level actions that happen outside modals (e.g. delete 409s). */
const treeError = ref('')

const breadcrumbs = computed(() => [
  { title: 'Settings', href: '/settings' },
  { title: 'Projects', href: '/settings/projects' },
  { title: project.value?.project_name ?? 'Project', href: `/settings/projects/${projectId}` },
  { title: 'M&E Logframe', href: `/settings/projects/${projectId}/logframe`, current: true },
])

const levelCount = computed(() => levels.value.length)
const indicatorCount = computed(() => indicators.value.length)

/** Flatten the level tree into a depth-annotated list (sorted by sort_order). */
const flatLevels = computed(() => {
  const byParent = new Map<string | null, LogframeLevel[]>()
  for (const l of levels.value) {
    const key = l.parent_id ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(l)
  }
  const out: { level: LogframeLevel; depth: number; hasChildren: boolean }[] = []
  const walk = (parentId: string | null, depth: number) => {
    const children = (byParent.get(parentId) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
    for (const l of children) {
      out.push({ level: l, depth, hasChildren: (byParent.get(l.id) ?? []).length > 0 })
      walk(l.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
})

/** Indicators grouped by their level ID, sorted by sort_order. */
const indicatorsByLevel = computed(() => {
  const map = new Map<string, LogframeIndicator[]>()
  for (const ind of indicators.value) {
    if (!map.has(ind.level_id)) map.set(ind.level_id, [])
    map.get(ind.level_id)!.push(ind)
  }
  for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order)
  return map
})

/** Hierarchy order for parent validation. */
const LEVEL_RANK: Record<LogframeLevelType, number> = { goal: 0, impact: 1, outcome: 2, result: 3, activity: 4 }

/** Valid parents for the level type currently chosen in the level modal. */
const validParents = computed(() => {
  const maxRank = LEVEL_RANK[levelForm.level_type] ?? 0
  return levels.value
    .filter((l) => (LEVEL_RANK[l.level_type] ?? -1) < maxRank)
    .sort((a, b) => (LEVEL_RANK[a.level_type] ?? 0) - (LEVEL_RANK[b.level_type] ?? 0) || a.sort_order - b.sort_order)
})

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

// ─── Levels ───

const levelModal = reactive({ open: false, editing: false, id: '' })
const levelForm = reactive({ level_type: 'goal' as LogframeLevelType, title: '', parent_id: null as string | null, custom_fields: {} as CustomFields })
const levelSaving = ref(false)
const levelError = ref('')

function openLevelModal(parent: LogframeLevel | null, editing: LogframeLevel | null = null) {
  levelError.value = ''
  if (editing) {
    levelModal.open = true
    levelModal.editing = true
    levelModal.id = editing.id
    levelForm.level_type = editing.level_type
    levelForm.title = editing.title
    levelForm.parent_id = editing.parent_id ?? null
    levelForm.custom_fields = { ...(editing.custom_fields ?? {}) }
  } else {
    levelModal.open = true
    levelModal.editing = false
    levelModal.id = ''
    // Default child type: one step below the parent's type
    const CHILD_TYPES: LogframeLevelType[] = ['goal', 'impact', 'outcome', 'result', 'activity']
    levelForm.level_type = parent
      ? (CHILD_TYPES[(LEVEL_RANK[parent.level_type] ?? 0) + 1] ?? 'activity')
      : 'goal'
    levelForm.title = ''
    levelForm.parent_id = parent?.id ?? null
    levelForm.custom_fields = {}
  }
}

async function saveLevel() {
  levelError.value = ''
  if (!levelForm.title.trim()) { levelError.value = 'Level title is required'; return }
  levelSaving.value = true
  try {
    if (levelModal.editing) {
      await logframeApi.updateLevel(projectId, levelModal.id, {
        level_type: levelForm.level_type,
        title: levelForm.title.trim(),
        parent_id: levelForm.parent_id,
        custom_fields: levelForm.custom_fields,
      })
    } else {
      await logframeApi.createLevel(projectId, {
        level_type: levelForm.level_type,
        title: levelForm.title.trim(),
        parent_id: levelForm.parent_id,
        custom_fields: levelForm.custom_fields,
      })
    }
    levelModal.open = false
    await fetchAll()
  } catch (e: any) {
    levelError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to save level')
  } finally {
    levelSaving.value = false
  }
}

/** Level pending a two-step delete confirmation. */
const confirmLevelId = ref<string | null>(null)

function requestDeleteLevel(level: LogframeLevel) {
  if (confirmLevelId.value === level.id) {
    deleteLevel(level)
  } else {
    confirmLevelId.value = level.id
    setTimeout(() => { if (confirmLevelId.value === level.id) confirmLevelId.value = null }, 3000)
  }
}

async function deleteLevel(level: LogframeLevel) {
  confirmLevelId.value = null
  try {
    await logframeApi.deleteLevel(projectId, level.id)
    await fetchAll()
  } catch (e: any) {
    treeError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to delete level')
  }
}

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
    indicatorForm.custom_fields = { ...(editing.custom_fields ?? {}) }
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
      custom_fields: indicatorForm.custom_fields,
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
    treeError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to delete indicator')
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
    treeError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to unlink activity')
  }
}

onMounted(() => {
  fetchAll()
  fetchTemplates()
})
</script>

<style scoped>
.logframe-page { max-width: 960px; padding-bottom: 48px; }

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
  border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer;
}
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 12px; font-size: 0.82rem;
  background: transparent; color: var(--text-muted);
  border: none; border-radius: 8px; cursor: pointer;
}
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

.section-label {
  font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-muted); margin: 24px 0 6px; padding-left: 2px;
}
.section-hint { font-size: 0.78rem; color: var(--text-muted); margin: -2px 0 10px; padding-left: 2px; }
.section-card {
  background: var(--bg-panel); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 18px;
}
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.field-label { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); }
.field-input {
  width: 100%; padding: 8px 10px; font-size: 0.85rem;
  background: var(--bg-input); border: 1px solid var(--border-color);
  border-radius: 6px; color: var(--text-primary);
  font-family: inherit;
}
.field-input:disabled { background: var(--bg-surface); color: var(--text-muted); cursor: not-allowed; }
.field-hint { font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }

.api-err {
  display: flex; align-items: center; gap: 6px; margin-top: 12px;
  padding: 10px 12px; font-size: 0.82rem; color: var(--error);
  background: var(--error-bg); border-radius: 6px;
}
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }

.empty-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-top: 16px; }
.empty-state { text-align: left; padding: 24px 0; }
.empty-state h2 { margin: 12px 0 4px; font-size: 1.1rem; }
.empty-state p { color: var(--text-muted); font-size: 0.85rem; max-width: 560px; }
.empty-icon {
  width: 52px; height: 52px; border-radius: 12px;
  background: var(--bg-panel); border: 1px solid var(--border-color);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
}
.empty-inline {
  padding: 14px; font-size: 0.82rem; color: var(--text-muted);
  background: var(--bg-surface); border-radius: 8px;
}

.template-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px;
  background: var(--bg-surface);
}
.template-name { font-size: 0.88rem; font-weight: 650; }
.template-meta { font-size: 0.74rem; color: var(--text-muted); margin: 2px 0; }
.template-desc { font-size: 0.76rem; color: var(--text-muted); }

/* Metadata card */
.meta-card { padding: 20px; }
.meta-view { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.meta-name { margin: 0 0 4px; font-size: 1.1rem; }
.meta-desc { margin: 0 0 8px; font-size: 0.84rem; color: var(--text-muted); }
.meta-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.meta-actions { display: flex; gap: 8px; }
.meta-form .field { margin-bottom: 12px; }

.tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; font-size: 0.72rem; font-weight: 600;
  background: var(--bg-surface); border: 1px solid var(--border-color);
  border-radius: 999px; color: var(--text-muted);
}
.tag--donor { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
.tag--status { text-transform: capitalize; }
.tag--baseline { color: var(--text-secondary); }
.tag--target { color: var(--success); border-color: color-mix(in srgb, var(--success) 35%, transparent); }
.tag--disagg { color: var(--text-muted); }

/* Hierarchy tree */
.level-node { margin-bottom: 10px; }
.level-card {
  background: var(--bg-panel); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 14px 16px;
  border-left: 3px solid var(--border-color);
}
.level-card--goal { border-left-color: #818cf8; }
.level-card--impact { border-left-color: #a78bfa; }
.level-card--outcome { border-left-color: #38bdf8; }
.level-card--result { border-left-color: #34d399; }
.level-card--activity { border-left-color: #fbbf24; }
.level-head { display: flex; align-items: center; gap: 10px; }
.level-badge {
  padding: 2px 8px; font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; border-radius: 999px;
  background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-muted);
}
.level-card--goal .level-badge { color: #818cf8; }
.level-card--impact .level-badge { color: #a78bfa; }
.level-card--outcome .level-badge { color: #38bdf8; }
.level-card--result .level-badge { color: #34d399; }
.level-card--activity .level-badge { color: #fbbf24; }
.level-title { font-size: 0.9rem; font-weight: 650; flex: 1; }
.level-actions { display: flex; gap: 2px; }
.icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 6px; border: none;
  background: transparent; color: var(--text-muted); cursor: pointer;
}
.icon-btn:hover { background: var(--bg-surface); color: var(--text-primary); }
.icon-btn--danger:hover { background: var(--error-bg); color: var(--error); }
.level-empty { margin-top: 8px; font-size: 0.76rem; color: var(--text-muted); font-style: italic; }
.tree-actions { justify-content: flex-start; }

/* Indicators */
.indicator-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.indicator-card {
  background: var(--bg-surface); border: 1px solid var(--border-color);
  border-radius: 8px; padding: 10px 12px;
}
.indicator-head { display: flex; align-items: center; gap: 8px; }
.indicator-code {
  padding: 1px 7px; font-size: 0.7rem; font-weight: 700;
  background: var(--bg-panel); border: 1px solid var(--border-color);
  border-radius: 5px; color: var(--accent);
}
.indicator-title { font-size: 0.85rem; font-weight: 600; flex: 1; }
.indicator-def { margin: 6px 0 0; font-size: 0.78rem; color: var(--text-muted); }
.indicator-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.indicator-mov { margin: 8px 0 0; font-size: 0.78rem; color: var(--text-secondary); }
.indicator-mov strong { color: var(--text-muted); font-weight: 600; }

.linked-activities { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; }
.linked-label { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 600; color: var(--text-muted); }
.linked-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; font-size: 0.72rem;
  background: var(--bg-panel); border: 1px solid var(--border-color);
  border-radius: 999px; color: var(--text-secondary);
}
.linked-chip--link { color: var(--accent); text-decoration: none; }
.chip-x {
  display: inline-flex; border: none; background: transparent;
  color: var(--text-muted); cursor: pointer; padding: 0;
}
.chip-x:hover { color: var(--error); }

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
.modal--wide { max-width: 640px; }
.modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.modal-head h3 { margin: 0; font-size: 1rem; }
.modal-hint { font-size: 0.78rem; color: var(--text-muted); margin: 0 0 14px; }
.modal-form .field { margin-bottom: 12px; }
.checkbox-row { display: flex; flex-wrap: wrap; gap: 14px; padding: 4px 0; }
.checkbox-item { display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; cursor: pointer; }
.link-row { display: grid; grid-template-columns: 1fr 2fr auto; gap: 8px; margin-bottom: 8px; align-items: center; }
.link-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.link-option {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  border: 1px solid var(--border-color); border-radius: 8px;
  font-size: 0.84rem; cursor: pointer; background: var(--bg-surface);
}
.link-code { margin-left: 6px; font-size: 0.72rem; color: var(--text-muted); }

.state { padding: 40px; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-muted); }
.state--error { color: var(--error); }
.pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); animation: pulse 1.4s infinite; }
.pulse-dot:nth-child(2) { animation-delay: 0.2s; }
.pulse-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }
</style>
