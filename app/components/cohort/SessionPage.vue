<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="tu-page">
      <div v-if="loading" class="tu-stack"><div class="tu-skeleton" /><div class="tu-skeleton" /></div>

      <template v-else-if="detail">
        <div>
          <span class="tu-step">{{ session!.status === 'completed' ? 'Completed' : `Session · ${visibleSteps.findIndex(v => v.index === step) + 1} of ${visibleSteps.length}` }}</span>
          <h1 class="tu-title">
            {{ detail.group.name }} · Session {{ session!.sequence_no }} · {{ session!.module_name }}
            {{ session!.session_in_module }}/{{ session!.module_sessions }}
          </h1>
          <p class="tu-subtitle">{{ formatDate(session!.session_date) }} · {{ detail.group.service_point_name }}</p>
        </div>

        <div v-if="error" class="tu-alert tu-alert--error">
          <AppIcon name="alert-circle" :size="14" />
          {{ error }}
        </div>

        <!-- ═══ Completed: read-only summary ═══ -->
        <template v-if="session!.status === 'completed'">
          <div class="tu-alert tu-alert--ok">
            <AppIcon name="check-circle" :size="14" />
            Session completed · {{ counts.present }} present, {{ counts.absent }} absent, {{ counts.excused }} excused
          </div>
          <div v-if="cfg.usesSessionSteps" class="tu-card">
            <strong>Thumbs (check-in → check-out)</strong>
            <span class="tu-muted">
              Good {{ session!.checkin_good ?? '–' }} → {{ session!.checkout_good ?? '–' }} ·
              Not too bad {{ session!.checkin_ok ?? '–' }} → {{ session!.checkout_ok ?? '–' }} ·
              Not good {{ session!.checkin_bad ?? '–' }} → {{ session!.checkout_bad ?? '–' }}
            </span>
          </div>
          <div v-if="session!.key_observations || session!.follow_up" class="tu-card">
            <span v-if="session!.key_observations"><strong>Observations:</strong> {{ session!.key_observations }}</span>
            <span v-if="session!.follow_up"><strong>Follow-up:</strong> {{ session!.follow_up }}</span>
          </div>
          <button type="button" class="tu-btn tu-btn--block" :disabled="preparingWord" @click="downloadSessionWord">
            <AppIcon name="file-text" :size="16" />
            {{ preparingWord ? 'Preparing…' : 'Download Word report' }}
          </button>
          <div class="tu-actions">
            <NuxtLink :to="groupUrl" class="tu-btn tu-btn--ghost">Back to group</NuxtLink>
            <NuxtLink :to="`${groupUrl}/report`" class="tu-btn tu-btn--ghost">Group report</NuxtLink>
          </div>
        </template>

        <template v-else>
          <nav class="tu-stepper" :style="{ gridTemplateColumns: `repeat(${visibleSteps.length}, minmax(0, 1fr))` }" aria-label="Session steps">
            <button
              v-for="v in visibleSteps"
              :key="v.label"
              type="button"
              :class="{ 'is-current': step === v.index, 'is-done': v.index < step }"
              :aria-current="step === v.index ? 'step' : undefined"
              @click="goToStep(v.index)"
            >
              {{ v.label }}
            </button>
          </nav>

          <!-- ═══ Step 1: Attendance ═══ -->
          <template v-if="step === 0">
            <div class="tu-kpis">
              <div class="tu-kpi"><strong>{{ counts.present }}</strong>Present</div>
              <div class="tu-kpi"><strong>{{ counts.absent + counts.excused }}</strong>Absent / excused</div>
              <div class="tu-kpi"><strong>{{ counts.unmarked }}</strong>Not marked</div>
            </div>
            <button type="button" class="tu-btn tu-btn--ghost" :disabled="counts.unmarked === 0" @click="markRestPresent">
              Mark everyone not marked as present (all pages)
            </button>
            <TeamupPager v-model:page="attPage" :page-count="attPageCount" :total="detail.roster.length" label="Attendance pages" />
            <div class="tu-list">
              <div v-for="e in attPageItems" :key="e.beneficiary_id" class="tu-list-item">
                <span style="flex: 1; display: flex; flex-direction: column; gap: 2px">
                  <span class="tu-name">{{ e.beneficiary_name }}</span>
                  <span v-if="dosage[e.beneficiary_id]" class="tu-muted">
                    {{ dosage[e.beneficiary_id]!.attended }} sessions attended so far
                  </span>
                  <span v-if="dosage[e.beneficiary_id]?.atRisk" class="tu-pill tu-pill--warn" style="align-self: flex-start">
                    At risk · follow up
                  </span>
                </span>
                <div class="tu-seg" role="group" :aria-label="`Attendance for ${e.beneficiary_name}`">
                  <button type="button" :class="{ 'on-present': marks[e.beneficiary_id] === 'present' }" :aria-pressed="marks[e.beneficiary_id] === 'present'" @click="mark(e.beneficiary_id, 'present')">P</button>
                  <button type="button" :class="{ 'on-absent': marks[e.beneficiary_id] === 'absent' }" :aria-pressed="marks[e.beneficiary_id] === 'absent'" @click="mark(e.beneficiary_id, 'absent')">A</button>
                  <button type="button" :class="{ 'on-excused': marks[e.beneficiary_id] === 'excused' }" :aria-pressed="marks[e.beneficiary_id] === 'excused'" @click="mark(e.beneficiary_id, 'excused')">E</button>
                </div>
              </div>
            </div>
            <TeamupPager v-model:page="attPage" :page-count="attPageCount" :total="detail.roster.length" label="Attendance pages" />
            <span class="tu-muted">P = present · A = absent · E = excused (sick, moved, school exam…)</span>
            <button v-if="counts.unmarked > 0" type="button" class="tu-btn tu-btn--block tu-btn--ghost" @click="goToFirstUnmarked">
              Go to the {{ counts.unmarked }} {{ cfg.noun }} not marked yet
            </button>
            <button v-else type="button" class="tu-btn tu-btn--block" :disabled="saving" @click="saveAttendance">
              {{ saving ? 'Saving…' : 'Save attendance · Check-in' }}
            </button>
          </template>

          <!-- ═══ Step 2: Check-in ═══ -->
          <template v-else-if="step === 1">
            <div class="tu-card">
              <strong>Do with the group</strong>
              <span class="tu-muted">TeamUp routine: slap legs ×2, clap ×2, click ×2, shout “TEAMUP!” — three times. Then ask: “How are you doing?”</span>
            </div>
            <TeamupThumbCounters v-model="checkin" />
            <div class="tu-alert" :class="thumbTotal(checkin) === counts.present ? 'tu-alert--ok' : 'tu-alert--warn'">
              {{ thumbTotal(checkin) }} counted · {{ counts.present }} present
            </div>
            <button type="button" class="tu-btn tu-btn--block" :disabled="saving" @click="saveCheckin">
              {{ saving ? 'Saving…' : 'Continue to activities' }}
            </button>
          </template>

          <!-- ═══ Step 3: Activities ═══ -->
          <template v-else-if="step === 2">
            <div class="tu-list">
              <button
                v-for="b in session!.blocks ?? []"
                :key="b.id"
                type="button"
                class="tu-list-item"
                :aria-pressed="b.completed"
                @click="toggleBlock(b.id, !b.completed)"
              >
                <span class="tu-check" :class="{ 'tu-check--on': b.completed }" style="border-radius: 999px">
                  <AppIcon v-if="b.completed" name="check" :size="14" :stroke-width="3" />
                </span>
                <span style="flex: 1; display: flex; flex-direction: column">
                  <span class="tu-label" style="padding: 0">{{ BLOCK_LABELS[b.block] }}</span>
                  <span class="tu-name">{{ b.activity_name }}</span>
                  <span v-if="activitySummary(b.activity_name)" class="tu-muted">{{ activitySummary(b.activity_name) }}</span>
                </span>
                <span v-if="b.energy" class="tu-pill" :class="b.energy === 'active' ? 'tu-pill--active-energy' : 'tu-pill--calm-energy'">
                  {{ b.energy === 'active' ? 'Active' : 'Calm' }}
                </span>
              </button>
            </div>
            <span class="tu-muted">Follow an active game with a calm one. Talk little — show the game and start.</span>
            <div class="tu-actions">
              <button type="button" class="tu-btn tu-btn--danger" @click="flagOpen = true">
                <AppIcon name="alert-circle" :size="16" />
                Flag a child
              </button>
              <button type="button" class="tu-btn" @click="step = 3">Go to check-out</button>
            </div>
          </template>

          <!-- ═══ Step 4: Check-out (TeamUp) / Session (other programmes) ═══ -->
          <template v-else>
            <template v-if="cfg.usesSessionSteps">
              <div class="tu-card">
                <strong>Check-out</strong>
                <span class="tu-muted">Act out “liked most / least”, then the Well done routine. Count the thumbs again.</span>
              </div>
              <TeamupThumbCounters v-model="checkout" />
              <span class="tu-muted">
                At check-in: good {{ checkin.good }} · not too bad {{ checkin.ok }} · not good {{ checkin.bad }}
              </span>
            </template>
            <div v-else class="tu-card">
              <span class="tu-label" style="padding: 0">{{ session!.module_name }}</span>
              <strong>{{ sessionName }}</strong>
              <template v-if="(session!.objectives ?? []).length">
                <span class="tu-muted">Objectives:</span>
                <span v-for="o in session!.objectives" :key="o" class="tu-muted">• {{ o }}</span>
              </template>
            </div>
            <div class="tu-field">
              <label for="tu-obs">Key observations</label>
              <textarea id="tu-obs" v-model="notes.key_observations" class="tu-textarea" rows="2" />
            </div>
            <div class="tu-field">
              <label for="tu-prot">Protection concerns</label>
              <textarea id="tu-prot" v-model="notes.protection_notes" class="tu-textarea" rows="2" :placeholder="`Anything worrying about a ${cfg.nounSingular}'s safety or a child at home?`" />
            </div>
            <div class="tu-field">
              <label for="tu-fu">Follow-up</label>
              <textarea id="tu-fu" v-model="notes.follow_up" class="tu-textarea" rows="2" />
            </div>
            <div v-if="(session!.flags ?? []).length" class="tu-alert tu-alert--warn">
              <AppIcon name="alert-circle" :size="14" />
              {{ session!.flags!.length }} {{ session!.flags!.length === 1 ? cfg.nounSingular : cfg.noun }} flagged for follow-up
            </div>
            <button v-if="!cfg.usesSessionSteps" type="button" class="tu-btn tu-btn--danger" @click="flagOpen = true">
              <AppIcon name="alert-circle" :size="16" />
              Flag for follow-up
            </button>
            <button type="button" class="tu-btn tu-btn--block" :disabled="saving" @click="complete">
              {{ saving ? 'Saving…' : `Complete Session ${session!.sequence_no}` }}
            </button>
          </template>
        </template>
      </template>

      <!-- Flag sheet -->
      <div v-if="flagOpen && detail" class="tu-scrim" @click.self="flagOpen = false">
        <form class="tu-sheet" role="dialog" aria-labelledby="tu-flag-title" novalidate @focusout="iv.onBlur" @input="iv.onInput" @submit.prevent="iv.submit($event, submitFlag)">
          <h2 id="tu-flag-title" class="tu-title" style="font-size: 1.1rem">Flag a {{ cfg.nounSingular }} for follow-up</h2>
          <div class="tu-field">
            <label for="tu-flag-child">{{ cfg.nounSingular.charAt(0).toUpperCase() + cfg.nounSingular.slice(1) }}</label>
            <select id="tu-flag-child" v-model="flagForm.beneficiaryId" class="tu-select" required name="tu-flag-child" v-bind="iv.aria('tu-flag-child', 'iv')">
              <option value="" disabled>Choose a {{ cfg.nounSingular }}</option>
              <option v-for="e in detail.roster" :key="e.beneficiary_id" :value="e.beneficiary_id">{{ e.beneficiary_name }}</option>
            </select>
            <FieldError :id="'iv-' + 'tu-flag-child' + '-error'" :message="iv.messages['tu-flag-child']" />
          </div>
          <div class="tu-field">
            <label for="tu-flag-concern">What did you notice?</label>
            <textarea id="tu-flag-concern" v-model="flagForm.concern" class="tu-textarea" rows="3" required name="tu-flag-concern" v-bind="iv.aria('tu-flag-concern', 'iv')" />
            <FieldError :id="'iv-' + 'tu-flag-concern' + '-error'" :message="iv.messages['tu-flag-concern']" />
          </div>
          <div class="tu-actions">
            <button type="button" class="tu-btn tu-btn--ghost" @click="flagOpen = false">Cancel</button>
            <button type="submit" class="tu-btn" :disabled="saving">Flag {{ cfg.nounSingular }}</button>
          </div>
        </form>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import FieldError from '../../components/interfaces/FieldError.vue'
import { useInlineValidation } from '../../composables/useInlineValidation'
import { cohortProgram, type CohortProgramKey } from '../../utils/cohortPrograms'

const props = defineProps<{ program: CohortProgramKey }>()
const cfg = cohortProgram(props.program)
const api = cohortApi(props.program)

import AppIcon from '../interfaces/AppIcon.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { v4 as uuidv4 } from 'uuid'
import { BLOCK_LABELS, cohortApi } from '../../services/teamupApi'
import { loadReportHeader, usePagination } from '../../composables/useTeamUpHelpers'
import { buildSessionReport, downloadDoc } from '../../utils/teamupWordReport'
import type {
  AttendanceStatus,
  TeamUpCurriculum,
  TeamUpSessionDetail,
  Thumbs,
} from '../../interfaces/teamup'

// Built-in field rules (required, min/max…) shown inline instead of browser pop-ups.
const iv = useInlineValidation()


// TeamUp: attendance → check-in → activities → check-out. Other programmes:
// attendance → the session itself (topic, objectives, notes).

const route = useRoute()
const router = useRouter()
const frameworkId = route.params.id as string
const sessionId = route.params.sessionId as string

const detail = ref<TeamUpSessionDetail | null>(null)
const curriculum = ref<TeamUpCurriculum | null>(null)
const session = computed(() => detail.value?.session ?? null)
const groupUrl = computed(() => `/activities/${frameworkId}/${cfg.route}/groups/${detail.value?.group.id ?? ''}`)

const breadcrumbs = computed(() => [
  { title: cfg.label, href: `/activities/${frameworkId}/${cfg.route}${detail.value?.group.framework_activity_id ? `?fa=${detail.value?.group.framework_activity_id}` : ''}` },
  { title: detail.value?.group.name ?? 'Group', href: groupUrl.value },
  { title: `Session ${session.value?.sequence_no ?? ''}`, href: route.fullPath, current: true },
])

const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const step = ref(0)
const visibleSteps = computed(() => cfg.usesSessionSteps
  ? [{ label: 'Attendance', index: 0 }, { label: 'Check-in', index: 1 }, { label: 'Activities', index: 2 }, { label: 'Check-out', index: 3 }]
  : [{ label: 'Attendance', index: 0 }, { label: 'Session', index: 3 }])
const sessionName = computed(() => curriculum.value?.sessions[(session.value?.sequence_no ?? 1) - 1]?.session_name ?? `Session ${session.value?.sequence_no ?? ''}`)

const marks = ref<Record<string, AttendanceStatus | undefined>>({})
const dosage = ref<Record<string, { attended: number; atRisk: boolean }>>({})
const checkin = ref<Thumbs>({ good: 0, ok: 0, bad: 0 })
const checkout = ref<Thumbs>({ good: 0, ok: 0, bad: 0 })
const notes = reactive({ key_observations: '', protection_notes: '', follow_up: '' })

const counts = computed(() => {
  const out = { present: 0, absent: 0, excused: 0, unmarked: 0 }
  for (const e of detail.value?.roster ?? []) {
    const m = marks.value[e.beneficiary_id]
    if (m) out[m]++
    else out.unmarked++
  }
  return out
})

const thumbTotal = (t: Thumbs) => t.good + t.ok + t.bad

/* ── Attendance pagination ── */
const roster = computed(() => detail.value?.roster ?? [])
const { page: attPage, pageCount: attPageCount, pageItems: attPageItems, goToFirst } = usePagination(roster)
function goToFirstUnmarked() {
  goToFirst(e => !marks.value[e.beneficiary_id])
}

/* ── Word report ── */
const preparingWord = ref(false)
async function downloadSessionWord() {
  if (!detail.value) return
  preparingWord.value = true
  try {
    const header = { ...(await loadReportHeader(frameworkId, detail.value.group.framework_activity_id)), programLabel: cfg.label, noun: cfg.noun }
    const html = buildSessionReport(detail.value, header)
    downloadDoc(html, `teamup-${detail.value.group.name}-session-${detail.value.session.sequence_no}.doc`.replace(/\s+/g, '-').toLowerCase())
  } finally {
    preparingWord.value = false
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
}

function activitySummary(name: string) {
  return curriculum.value?.activities.find(a => a.name === name)?.summary
}

function mark(id: string, status: AttendanceStatus) {
  marks.value = { ...marks.value, [id]: status }
}

function markRestPresent() {
  const next = { ...marks.value }
  for (const e of detail.value?.roster ?? []) {
    if (!next[e.beneficiary_id]) next[e.beneficiary_id] = 'present'
  }
  marks.value = next
}

function goToStep(i: number) {
  // Attendance must be saved before moving on, so absences are never blank.
  if (i > 0 && (detail.value?.session.attendance?.length ?? 0) < (detail.value?.roster.length ?? 0)) return
  step.value = i
}

async function run(fn: () => Promise<void>) {
  saving.value = true
  error.value = null
  try {
    await fn()
  } catch (e: any) {
    error.value = e?.message ?? 'Something went wrong'
  } finally {
    saving.value = false
  }
}

const saveAttendance = () => run(async () => {
  const entries = Object.entries(marks.value)
    .filter(([, s]) => !!s)
    .map(([beneficiary_id, status]) => ({ beneficiary_id, status: status! }))
  const saved = await api.markAttendance(sessionId, entries)
  if (detail.value) detail.value.session.attendance = saved
  if (!cfg.usesSessionSteps) {
    step.value = 3
    return
  }
  if (thumbTotal(checkin.value) === 0) checkin.value = { good: counts.value.present, ok: 0, bad: 0 }
  step.value = 1
})

const saveCheckin = () => run(async () => {
  await api.updateSession(sessionId, { checkin: checkin.value })
  if (thumbTotal(checkout.value) === 0) checkout.value = { ...checkin.value }
  step.value = 2
})

async function toggleBlock(blockId: string, completed: boolean) {
  const block = session.value?.blocks?.find(b => b.id === blockId)
  if (!block) return
  block.completed = completed
  try {
    await api.setBlock(sessionId, blockId, completed)
  } catch (e: any) {
    block.completed = !completed
    error.value = e?.message ?? 'Could not save the step'
  }
}

const flagOpen = ref(false)
const flagForm = reactive({ beneficiaryId: '', concern: '' })
const submitFlag = () => run(async () => {
  const f = await api.flagChild(sessionId, flagForm.beneficiaryId, flagForm.concern.trim(), uuidv4())
  if (detail.value) detail.value.session.flags = [...(detail.value.session.flags ?? []), f]
  flagForm.beneficiaryId = ''
  flagForm.concern = ''
  flagOpen.value = false
})

const complete = () => run(async () => {
  await api.completeSession(sessionId, {
    ...(cfg.usesSessionSteps ? { checkin: checkin.value, checkout: checkout.value } : {}),
    key_observations: notes.key_observations.trim(),
    protection_notes: notes.protection_notes.trim(),
    follow_up: notes.follow_up.trim(),
  })
  await router.push(`${groupUrl.value}/report?done=${session.value?.sequence_no ?? ''}`)
})

onMounted(async () => {
  try {
    const d = await api.getSession(sessionId)
    // The group's own curriculum (custom or built-in) names the sessions.
    const c = d.group.curriculum_id ? await api.getCurriculumById(d.group.curriculum_id) : await api.getCurriculum()
    detail.value = d
    curriculum.value = c
    const s = d.session
    marks.value = Object.fromEntries((s.attendance ?? []).map(a => [a.beneficiary_id, a.status]))
    checkin.value = { good: s.checkin_good ?? 0, ok: s.checkin_ok ?? 0, bad: s.checkin_bad ?? 0 }
    checkout.value = { good: s.checkout_good ?? 0, ok: s.checkout_ok ?? 0, bad: s.checkout_bad ?? 0 }
    notes.key_observations = s.key_observations ?? ''
    notes.protection_notes = s.protection_notes ?? ''
    notes.follow_up = s.follow_up ?? ''

    // Resume where the facilitator left off.
    const allMarked = (s.attendance?.length ?? 0) >= d.roster.length && d.roster.length > 0
    if (allMarked) step.value = !cfg.usesSessionSteps ? 3 : s.checkin_good != null ? 2 : 1

    // Sessions attended so far + at-risk flags from the group report.
    const report = await api.getReport(d.group.id)
    dosage.value = Object.fromEntries(report.rows.map(r => [r.beneficiary_id, { attended: r.attended, atRisk: r.at_risk }]))
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load session'
  } finally {
    loading.value = false
  }
})
</script>
