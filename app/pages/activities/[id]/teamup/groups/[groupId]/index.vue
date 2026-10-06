<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="tu-page">
      <div v-if="loading" class="tu-stack"><div class="tu-skeleton" /><div class="tu-skeleton" /></div>

      <template v-else-if="detail">
        <div class="tu-header">
          <div>
            <h1 class="tu-title">{{ detail.group.name }} · session plan</h1>
            <p class="tu-subtitle">
              {{ detail.group.service_point_name }} · Age {{ detail.group.age_band }} ·
              {{ activeCount }} enrolled · {{ completedCount }} of {{ curriculumSessions.length }} sessions done
            </p>
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

        <!-- Next / in-progress session -->
        <div v-if="inProgress" class="tu-card tu-card--accent">
          <div class="tu-row">
            <strong>Session {{ inProgress.sequence_no }} · {{ inProgress.module_name }} {{ inProgress.session_in_module }}/{{ inProgress.module_sessions }}</strong>
            <span class="tu-pill tu-pill--warn">In progress</span>
          </div>
          <NuxtLink :to="sessionUrl(inProgress.id)" class="tu-btn">Continue session</NuxtLink>
        </div>
        <div v-else-if="nextSession" class="tu-card tu-card--accent">
          <strong>Next: Session {{ nextSession.sequence_no }} · {{ nextSession.module_name }} {{ nextSession.session_in_module }}/{{ nextSession.module_sessions }}</strong>
          <span class="tu-muted">Check-in · Warm-up · Active game · Calm game · Cool-down · Check-out</span>
          <button type="button" class="tu-btn" :disabled="activeCount === 0 || detail.group.status !== 'active'" @click="openStart">
            Start Session {{ nextSession.sequence_no }}
          </button>
          <span v-if="activeCount === 0" class="tu-muted">Enroll children before starting.</span>
        </div>
        <div v-else class="tu-alert tu-alert--ok">All 20 sessions are done for this group.</div>

        <!-- Modules -->
        <p class="tu-label">Curriculum</p>
        <div v-for="m in curriculum?.modules ?? []" :key="m.order" class="tu-card">
          <div class="tu-row">
            <div>
              <strong style="font-size: 0.88rem">{{ m.name }}</strong>
              <div class="tu-muted">{{ m.sessions }} sessions</div>
            </div>
            <div class="tu-dots">
              <template v-for="s in sessionsOfModule(m.order)" :key="s.sequence_no">
                <NuxtLink
                  v-if="sessionBySeq(s.sequence_no)"
                  :to="sessionUrl(sessionBySeq(s.sequence_no)!.id)"
                  class="tu-dot"
                  :class="dotClass(s.sequence_no)"
                  :aria-label="`Open session ${s.sequence_no}`"
                >
                  {{ s.sequence_no }}
                </NuxtLink>
                <span v-else class="tu-dot" :class="dotClass(s.sequence_no)">{{ s.sequence_no }}</span>
              </template>
            </div>
          </div>
        </div>

        <!-- Children -->
        <div class="tu-row">
          <p class="tu-label">Children ({{ activeCount }})</p>
          <NuxtLink :to="`${groupUrl}/enroll`" class="tu-btn tu-btn--ghost">
            <AppIcon name="user-plus" :size="14" />
            Enroll more
          </NuxtLink>
        </div>
        <TeamupPager v-model:page="childPage" :page-count="childPageCount" :total="detail.enrollments.length" label="Children pages" />
        <div class="tu-list">
          <div v-for="e in childPageItems" :key="e.id" class="tu-list-item">
            <span style="flex: 1; display: flex; flex-direction: column">
              <span class="tu-name">{{ e.beneficiary_name }}</span>
              <span class="tu-muted">
                {{ e.sex?.toLowerCase().startsWith('f') ? 'F' : 'M' }} · {{ e.age }}
                <template v-if="e.baseline_score != null"> · Baseline {{ e.baseline_score }}</template>
                <template v-if="e.endline_score != null"> · Endline {{ e.endline_score }}</template>
              </span>
            </span>
            <span v-if="e.status === 'dropped'" class="tu-pill tu-pill--done" :title="e.drop_reason">Dropped</span>
            <button type="button" class="tu-btn tu-btn--ghost" :aria-label="`Edit ${e.beneficiary_name}`" @click="openEdit(e)">
              <AppIcon name="pencil" :size="14" />
            </button>
          </div>
          <div v-if="detail.enrollments.length === 0" class="tu-list-item tu-muted">No children enrolled yet.</div>
        </div>

        <div class="tu-actions">
          <NuxtLink :to="`${groupUrl}/report`" class="tu-btn tu-btn--ghost">
            <AppIcon name="bar-chart-2" :size="16" />
            Group report · Word &amp; Excel
          </NuxtLink>
        </div>
      </template>

      <div v-else-if="error" class="tu-alert tu-alert--error">{{ error }}</div>

      <!-- Start session sheet (objectives) -->
      <div v-if="startOpen" class="tu-scrim" @click.self="startOpen = false">
        <form class="tu-sheet" role="dialog" aria-labelledby="tu-start-title" @submit.prevent="startSession">
          <h2 id="tu-start-title" class="tu-title" style="font-size: 1.1rem">Session objectives</h2>
          <span class="tu-muted">Suggested for {{ nextSession?.module_name }}. Edit or add your own.</span>
          <div v-for="(o, i) in objectives" :key="i" class="tu-row">
            <label :for="`tu-obj-${i}`" class="tu-muted" style="width: 14px">{{ i + 1 }}</label>
            <input :id="`tu-obj-${i}`" v-model="objectives[i]" class="tu-input">
            <button type="button" class="tu-btn tu-btn--ghost" aria-label="Remove objective" @click="objectives.splice(i, 1)">
              <AppIcon name="x" :size="14" />
            </button>
          </div>
          <button type="button" class="tu-btn tu-btn--ghost" @click="objectives.push('')">
            <AppIcon name="plus" :size="14" />
            Add objective
          </button>
          <div class="tu-field">
            <label for="tu-date">Session date</label>
            <input id="tu-date" v-model="sessionDate" type="date" class="tu-input" required>
          </div>
          <div v-for="w in startWarnings" :key="w" class="tu-alert tu-alert--warn">
            <AppIcon name="alert-circle" :size="14" />
            {{ w }}
          </div>
          <div class="tu-actions">
            <button type="button" class="tu-btn tu-btn--ghost" @click="startOpen = false">Cancel</button>
            <button type="submit" class="tu-btn" :disabled="starting">{{ starting ? 'Starting…' : 'Start session' }}</button>
          </div>
        </form>
      </div>

      <!-- Edit child sheet -->
      <div v-if="editing" class="tu-scrim" @click.self="editing = null">
        <form class="tu-sheet" role="dialog" aria-labelledby="tu-edit-title" @submit.prevent="saveEdit">
          <h2 id="tu-edit-title" class="tu-title" style="font-size: 1.1rem">{{ editing.beneficiary_name }}</h2>
          <div class="tu-grid2">
            <div class="tu-field">
              <label for="tu-base">Baseline score</label>
              <input id="tu-base" v-model.number="editForm.baseline" type="number" min="0" class="tu-input">
            </div>
            <div class="tu-field">
              <label for="tu-end">Endline score</label>
              <input id="tu-end" v-model.number="editForm.endline" type="number" min="0" class="tu-input">
            </div>
          </div>
          <div class="tu-field">
            <span class="tu-field-label">Status</span>
            <div class="tu-chips">
              <button type="button" class="tu-chip" :class="{ 'tu-chip--on': editForm.status === 'active' }" @click="editForm.status = 'active'">In group</button>
              <button type="button" class="tu-chip" :class="{ 'tu-chip--on': editForm.status === 'dropped' }" @click="editForm.status = 'dropped'">Dropped out</button>
            </div>
          </div>
          <div v-if="editForm.status === 'dropped'" class="tu-field">
            <label for="tu-reason">Reason for dropping out</label>
            <input id="tu-reason" v-model="editForm.reason" class="tu-input" placeholder="e.g. Family relocated" required>
          </div>
          <div class="tu-actions">
            <button type="button" class="tu-btn tu-btn--ghost" @click="editing = null">Cancel</button>
            <button type="submit" class="tu-btn" :disabled="savingEdit">{{ savingEdit ? 'Saving…' : 'Save' }}</button>
          </div>
        </form>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import AppIcon from '../../../../../../components/interfaces/AppIcon.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { v4 as uuidv4 } from 'uuid'
import { teamupApi, todayISO, WEEKDAYS } from '../../../../../../services/teamupApi'
import { usePagination } from '../../../../../../composables/useTeamUpHelpers'
import type {
  TeamUpCurriculum,
  TeamUpEnrollment,
  TeamUpGroupDetail,
  TeamUpSession,
  UpdateTeamUpEnrollmentRequest,
} from '../../../../../../interfaces/teamup'

definePageMeta({ layout: false, middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const frameworkId = route.params.id as string
const groupId = route.params.groupId as string
const groupUrl = `/activities/${frameworkId}/teamup/groups/${groupId}`
const sessionUrl = (id: string) => `/activities/${frameworkId}/teamup/sessions/${id}`

const detail = ref<TeamUpGroupDetail | null>(null)
const curriculum = ref<TeamUpCurriculum | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const hubUrl = computed(() => `/activities/${frameworkId}/teamup${detail.value?.group.framework_activity_id ? `?fa=${detail.value?.group.framework_activity_id}` : ''}`)

const breadcrumbs = computed(() => [
  { title: 'TeamUp', href: hubUrl.value },
  { title: detail.value?.group.name ?? 'Group', href: groupUrl, current: true },
])

const curriculumSessions = computed(() => curriculum.value?.sessions ?? [])
const activeCount = computed(() => detail.value?.enrollments.filter(e => e.status !== 'dropped').length ?? 0)
const completedCount = computed(() => detail.value?.sessions.filter(s => s.status === 'completed').length ?? 0)
const inProgress = computed(() => detail.value?.sessions.find(s => s.status === 'in_progress') ?? null)
const nextSession = computed(() =>
  detail.value?.next_session ? curriculumSessions.value[detail.value.next_session - 1] ?? null : null,
)

const enrollments = computed(() => detail.value?.enrollments ?? [])
const { page: childPage, pageCount: childPageCount, pageItems: childPageItems } = usePagination(enrollments)

const sessionsOfModule = (order: number) => curriculumSessions.value.filter(s => s.module_order === order)
const sessionBySeq = (seq: number): TeamUpSession | undefined => detail.value?.sessions.find(s => s.sequence_no === seq)
function dotClass(seq: number) {
  const s = sessionBySeq(seq)
  if (s?.status === 'completed') return 'tu-dot--done'
  if (s?.status === 'in_progress') return 'tu-dot--progress'
  if (!inProgress.value && seq === detail.value?.next_session) return 'tu-dot--next'
  return ''
}

/* ── Start session ── */
const startOpen = ref(false)
const starting = ref(false)
const objectives = ref<string[]>([])
const sessionDate = ref(todayISO())

const startWarnings = computed(() => {
  const out: string[] = []
  const sameDay = detail.value?.sessions.filter(s => s.session_date.slice(0, 10) === sessionDate.value).length ?? 0
  if (sameDay > 0) {
    out.push(`Pacing check: this group already had ${sameDay} session(s) on this date. TeamUp works best spread across weeks.`)
  }
  const days = detail.value?.group.meeting_days ?? []
  if (days.length > 0 && sessionDate.value) {
    const weekday = new Date(`${sessionDate.value}T12:00:00`).getDay()
    if (!days.includes(weekday)) {
      out.push(`${WEEKDAYS[weekday]} is not one of this group's meeting days.`)
    }
  }
  return out
})

function openStart() {
  const mod = curriculum.value?.modules.find(m => m.order === nextSession.value?.module_order)
  objectives.value = [...(mod?.objectives ?? [])]
  sessionDate.value = todayISO()
  startOpen.value = true
}

async function startSession() {
  starting.value = true
  error.value = null
  try {
    const res = await teamupApi.startSession(groupId, {
      session_date: sessionDate.value,
      objectives: objectives.value.map(o => o.trim()).filter(Boolean),
      client_uuid: uuidv4(),
      client_timestamp: new Date().toISOString(),
    })
    await router.push(sessionUrl(res.session.id))
  } catch (e: any) {
    error.value = e?.message ?? 'Could not start the session'
    startOpen.value = false
  } finally {
    starting.value = false
  }
}

/* ── Edit child ── */
const editing = ref<TeamUpEnrollment | null>(null)
const savingEdit = ref(false)
const editForm = reactive({ baseline: null as number | null, endline: null as number | null, status: 'active' as 'active' | 'dropped', reason: '' })

function openEdit(e: TeamUpEnrollment) {
  editing.value = e
  editForm.baseline = e.baseline_score ?? null
  editForm.endline = e.endline_score ?? null
  editForm.status = e.status === 'dropped' ? 'dropped' : 'active'
  editForm.reason = e.drop_reason ?? ''
}

async function saveEdit() {
  if (!editing.value) return
  savingEdit.value = true
  error.value = null
  const payload: UpdateTeamUpEnrollmentRequest = {}
  if (typeof editForm.baseline === 'number') payload.baseline_score = editForm.baseline
  if (typeof editForm.endline === 'number') payload.endline_score = editForm.endline
  payload.status = editForm.status
  if (editForm.status === 'dropped') payload.drop_reason = editForm.reason.trim()
  try {
    await teamupApi.updateEnrollment(groupId, editing.value.id, payload)
    editing.value = null
    await load()
  } catch (e: any) {
    error.value = e?.message ?? 'Could not save'
  } finally {
    savingEdit.value = false
  }
}

async function load() {
  const [d, c] = await Promise.all([teamupApi.getGroup(groupId), curriculum.value ?? teamupApi.getCurriculum()])
  detail.value = d
  curriculum.value = c
}

onMounted(async () => {
  try {
    await load()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load group'
  } finally {
    loading.value = false
  }
})
</script>
