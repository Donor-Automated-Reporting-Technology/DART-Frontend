<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="tu-page">
      <div class="tu-header">
        <div>
          <h1 class="tu-title">{{ cfg.label }} curricula</h1>
          <p class="tu-subtitle">The built-in curriculum follows the DRA database. Add your organisation's own if you run it differently.</p>
        </div>
        <NuxtLink :to="hubUrl" class="tu-btn tu-btn--ghost">
          <AppIcon name="arrow-left" :size="14" />
          Hub
        </NuxtLink>
      </div>

      <div v-if="error" class="tu-alert tu-alert--error">
        <AppIcon name="alert-circle" :size="14" />
        {{ error }}
      </div>
      <div v-if="notice" class="tu-alert tu-alert--ok">{{ notice }}</div>

      <div v-if="loading" class="tu-stack"><div class="tu-skeleton" /><div class="tu-skeleton" /></div>

      <!-- ═══ List ═══ -->
      <template v-else-if="!editing">
        <div class="tu-stack">
          <div v-for="c in curricula" :key="c.id" class="tu-card">
            <div class="tu-row">
              <strong>{{ c.name }}</strong>
              <span class="tu-pill" :class="c.built_in ? 'tu-pill--done' : 'tu-pill--active'">{{ c.built_in ? 'Default' : 'Your organisation' }}</span>
            </div>
            <span class="tu-muted">
              {{ c.modules.length }} module{{ c.modules.length === 1 ? '' : 's' }} · {{ c.sessions.length }} sessions
              <template v-if="c.min_dosage"> · minimum {{ c.min_dosage }} sessions</template>
              · used by {{ c.groups_using }} group{{ c.groups_using === 1 ? '' : 's' }}
            </span>
            <details class="cur-details">
              <summary>Show sessions</summary>
              <div v-for="m in c.modules" :key="m.order" class="cur-module">
                <strong>{{ m.name || 'Sessions' }}</strong>
                <ol :start="c.sessions.find(s => s.module_order === m.order)?.sequence_no">
                  <li v-for="s in c.sessions.filter(s => s.module_order === m.order)" :key="s.sequence_no">{{ s.session_name }}</li>
                </ol>
              </div>
            </details>
            <div v-if="canDesign" class="tu-actions">
              <button v-if="!c.built_in" type="button" class="tu-btn tu-btn--ghost" @click="startEdit(c)">
                <AppIcon name="pencil" :size="14" />
                Edit
              </button>
              <button type="button" class="tu-btn tu-btn--ghost" @click="startCopy(c)">
                <AppIcon name="plus" :size="14" />
                Copy as new
              </button>
              <button v-if="!c.built_in && c.groups_using === 0" type="button" class="tu-btn tu-btn--danger" @click="remove(c)">Delete</button>
            </div>
          </div>
        </div>
        <button v-if="canDesign" type="button" class="tu-btn" @click="startBlank">
          <AppIcon name="plus" :size="16" />
          New curriculum
        </button>
        <p v-else class="tu-muted">Curricula are set up by admins, programme managers, M&amp;E or supervisors.</p>
      </template>

      <!-- ═══ Editor ═══ -->
      <form v-else class="tu-stack" novalidate @focusout="iv.onBlur" @input="iv.onInput" @submit.prevent="iv.submit($event, save)">
        <div v-if="lockedShape" class="tu-alert tu-alert--warn">
          Groups already use this curriculum: you can rename modules and sessions and change objectives, but not add, remove or move sessions.
        </div>
        <div class="tu-field">
          <label for="cur-name">Curriculum name</label>
          <input id="cur-name" v-model="draft.name" class="tu-input" required maxlength="200" name="cur-name" v-bind="iv.aria('cur-name', 'iv')">
          <FieldError :id="'iv-' + 'cur-name' + '-error'" :message="iv.messages['cur-name']" />
        </div>
        <div class="tu-grid2">
          <div class="tu-field">
            <label for="cur-desc">Description (optional)</label>
            <input id="cur-desc" v-model="draft.description" class="tu-input">
          </div>
          <div class="tu-field">
            <label for="cur-min">Minimum sessions to count as reached (0 = none)</label>
            <input id="cur-min" v-model.number="draft.min_dosage" type="number" min="0" :max="totalSessions" class="tu-input" name="cur-min" v-bind="iv.aria('cur-min', 'iv')">
            <FieldError :id="'iv-' + 'cur-min' + '-error'" :message="iv.messages['cur-min']" />
          </div>
        </div>

        <div v-for="(m, mi) in draft.modules" :key="mi" class="tu-card">
          <div class="tu-row">
            <div class="tu-field" style="flex: 1">
              <label :for="`cur-m-${mi}`">Module {{ mi + 1 }}</label>
              <input :id="`cur-m-${mi}`" v-model="m.name" class="tu-input" placeholder="e.g. Childhood">
            </div>
            <button v-if="!lockedShape && draft.modules.length > 1" type="button" class="tu-btn tu-btn--ghost" :aria-label="`Remove module ${mi + 1}`" @click="draft.modules.splice(mi, 1)">
              <AppIcon name="trash" :size="14" />
            </button>
          </div>
          <div v-for="(s, si) in m.sessions" :key="si" class="cur-session">
            <div class="tu-row">
              <div class="tu-field" style="flex: 1">
                <label :for="`cur-s-${mi}-${si}`">Session {{ sequenceOf(mi, si) }}</label>
                <input :id="`cur-s-${mi}-${si}`" v-model="s.name" class="tu-input" required :name="`cur-s-${mi}-${si}`" v-bind="iv.aria(`cur-s-${mi}-${si}`, 'iv')">
                <FieldError :id="'iv-' + `cur-s-${mi}-${si}` + '-error'" :message="iv.messages[`cur-s-${mi}-${si}`]" />
              </div>
              <button v-if="!lockedShape && m.sessions.length > 1" type="button" class="tu-btn tu-btn--ghost" :aria-label="`Remove session ${sequenceOf(mi, si)}`" @click="m.sessions.splice(si, 1)">
                <AppIcon name="x" :size="14" />
              </button>
            </div>
            <div class="tu-field">
              <label :for="`cur-o-${mi}-${si}`" class="tu-muted">Suggested objectives (one per line)</label>
              <textarea :id="`cur-o-${mi}-${si}`" v-model="s.objectivesText" class="tu-textarea" rows="2" />
            </div>
          </div>
          <button v-if="!lockedShape" type="button" class="tu-btn tu-btn--ghost" @click="m.sessions.push({ name: '', objectivesText: '' })">
            <AppIcon name="plus" :size="14" />
            Add session
          </button>
        </div>

        <button v-if="!lockedShape" type="button" class="tu-btn tu-btn--ghost" @click="draft.modules.push({ name: '', sessions: [{ name: '', objectivesText: '' }] })">
          <AppIcon name="plus" :size="14" />
          Add module
        </button>
        <span class="tu-muted">{{ draft.modules.length }} modules · {{ totalSessions }} sessions</span>

        <div class="tu-actions">
          <button type="button" class="tu-btn tu-btn--ghost" @click="editing = null">Cancel</button>
          <button type="submit" class="tu-btn" :disabled="saving">{{ saving ? 'Saving…' : 'Save curriculum' }}</button>
        </div>
      </form>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import FieldError from '../../components/interfaces/FieldError.vue'
import { useInlineValidation } from '../../composables/useInlineValidation'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '../interfaces/AppIcon.vue'
import { useAuthStore } from '../../stores/auth'
import { cohortApi } from '../../services/teamupApi'
import { cohortProgram, type CohortProgramKey } from '../../utils/cohortPrograms'
import type { SaveCurriculumRequest, TeamUpCurriculum } from '../../interfaces/teamup'

// Built-in field rules (required, min/max…) shown inline instead of browser pop-ups.
const iv = useInlineValidation()

const props = defineProps<{ program: CohortProgramKey }>()
const cfg = cohortProgram(props.program)
const api = cohortApi(props.program)

const route = useRoute()
const frameworkId = route.params.id as string
const fa = (route.query.fa as string) || ''
const hubUrl = `/activities/${frameworkId}/${cfg.route}${fa ? `?fa=${fa}` : ''}`
const breadcrumbs = computed(() => [
  { title: cfg.label, href: hubUrl },
  { title: 'Curricula', href: route.fullPath, current: true },
])

// Same roles the API allows to design curricula.
const canDesign = computed(() => ['org_admin', 'program_manager', 'data_manager', 'supervisor'].includes(useAuthStore().userRole ?? ''))

const curricula = ref<TeamUpCurriculum[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

interface DraftSession { name: string; objectivesText: string }
interface DraftModule { name: string; sessions: DraftSession[] }
/** null = list view; 'new' = creating; otherwise the curriculum being edited. */
const editing = ref<'new' | TeamUpCurriculum | null>(null)
const draft = reactive({ name: '', description: '', min_dosage: 0, modules: [] as DraftModule[] })

const lockedShape = computed(() => editing.value !== null && editing.value !== 'new' && editing.value.groups_using > 0)
const totalSessions = computed(() => draft.modules.reduce((n, m) => n + m.sessions.length, 0))
const sequenceOf = (mi: number, si: number) => draft.modules.slice(0, mi).reduce((n, m) => n + m.sessions.length, 0) + si + 1

function fill(c: TeamUpCurriculum | null, name: string) {
  draft.name = name
  draft.description = c?.description ?? ''
  draft.min_dosage = c?.min_dosage ?? 0
  draft.modules = c
    ? c.modules.map(m => ({
        name: m.name,
        sessions: c.sessions.filter(s => s.module_order === m.order).map(s => ({ name: s.session_name, objectivesText: (s.objectives ?? []).join('\n') })),
      }))
    : [{ name: '', sessions: [{ name: '', objectivesText: '' }] }]
}

function startBlank() { editing.value = 'new'; notice.value = null; fill(null, '') }
function startCopy(c: TeamUpCurriculum) { editing.value = 'new'; notice.value = null; fill(c, `${c.name} (copy)`) }
function startEdit(c: TeamUpCurriculum) { editing.value = c; notice.value = null; fill(c, c.name) }

function payload(): SaveCurriculumRequest {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    min_dosage: Number(draft.min_dosage) || 0,
    modules: draft.modules.map(m => ({
      name: m.name.trim(),
      sessions: m.sessions.map(s => ({ name: s.name.trim(), objectives: s.objectivesText.split('\n').map(o => o.trim()).filter(Boolean) })),
    })),
  }
}

async function save() {
  saving.value = true
  error.value = null
  try {
    if (editing.value === 'new') await api.createCurriculum(payload())
    else if (editing.value) await api.updateCurriculum(editing.value.id, payload())
    notice.value = 'Curriculum saved. Choose it when you create a new group.'
    editing.value = null
    await load()
  } catch (e: any) {
    error.value = e?.message ?? 'Could not save the curriculum'
  } finally {
    saving.value = false
  }
}

async function remove(c: TeamUpCurriculum) {
  if (!window.confirm(`Delete "${c.name}"?`)) return
  error.value = null
  try {
    await api.deleteCurriculum(c.id)
    await load()
  } catch (e: any) {
    error.value = e?.message ?? 'Could not delete the curriculum'
  }
}

async function load() {
  curricula.value = await api.listCurricula()
}

onMounted(async () => {
  try {
    await load()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load curricula'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.cur-details summary { cursor: pointer; font-size: 0.8rem; color: var(--primary); font-weight: 600; }
.cur-module { margin-top: 8px; font-size: 0.82rem; }
.cur-module ol { margin: 4px 0 0; padding-left: 22px; color: var(--text-secondary); }
.cur-session { border-top: 1px solid var(--border-subtle); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
</style>
