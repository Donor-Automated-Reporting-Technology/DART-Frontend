<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <form class="tu-page" novalidate @focusout="iv.onBlur" @input="iv.onInput" @submit.prevent="iv.submit($event, submit)">
      <div>
        <span class="tu-step">Set up · 1 of 3</span>
        <h1 class="tu-title">New {{ cfg.label }} group</h1>
        <p class="tu-subtitle">A fixed group of {{ cfg.noun }} who do the sessions together.</p>
      </div>

      <div v-if="error" class="tu-alert tu-alert--error">
        <AppIcon name="alert-circle" :size="14" />
        {{ error }}
      </div>

      <div class="tu-field">
        <label for="tu-loc">CFS location</label>
        <select v-if="isAdmin" id="tu-loc" v-model="form.cfs_location_id" class="tu-select" required name="tu-loc" v-bind="iv.aria('tu-loc', 'iv')">
          <option value="" disabled>Choose a CFS</option>
          <option v-for="sp in servicePoints" :key="sp.id" :value="sp.id">{{ sp.name }}</option>
        </select>
        <input v-else id="tu-loc" class="tu-input" :value="auth.cfsLocationName ?? 'Your assigned CFS'" disabled>
        <FieldError :id="'iv-' + 'tu-loc' + '-error'" :message="iv.messages['tu-loc']" />
      </div>

      <div class="tu-field">
        <label for="tu-name">Group name</label>
        <input id="tu-name" v-model="form.name" class="tu-input" placeholder="e.g. Peace" required maxlength="100" name="tu-name" v-bind="iv.aria('tu-name', 'iv')">
        <FieldError :id="'iv-' + 'tu-name' + '-error'" :message="iv.messages['tu-name']" />
      </div>

      <div v-if="cfg.requiresAgeBand" class="tu-field">
        <span class="tu-field-label">Age band</span>
        <div class="tu-chips" role="radiogroup" aria-label="Age band">
          <button
            v-for="b in AGE_BANDS"
            :key="b"
            type="button"
            role="radio"
            :aria-checked="form.age_band === b"
            class="tu-chip"
            :class="{ 'tu-chip--on': form.age_band === b }"
            @click="form.age_band = b"
          >
            {{ b }}
          </button>
        </div>
      </div>

      <div class="tu-field">
        <span class="tu-field-label">Meeting days</span>
        <div class="tu-chips">
          <button
            v-for="(d, i) in WEEKDAYS"
            :key="d"
            type="button"
            :aria-pressed="form.meeting_days.includes(i)"
            class="tu-chip"
            :class="{ 'tu-chip--on': form.meeting_days.includes(i) }"
            @click="toggleDay(i)"
          >
            {{ d }}
          </button>
        </div>
      </div>

      <div class="tu-grid2">
        <div class="tu-field">
          <label for="tu-time">Time</label>
          <input id="tu-time" v-model="form.meeting_time" class="tu-input" placeholder="3:00 pm">
        </div>
        <div class="tu-field">
          <label for="tu-start">Start date</label>
          <input id="tu-start" v-model="form.start_date" type="date" class="tu-input">
        </div>
      </div>

      <div class="tu-field">
        <label for="tu-curriculum">Curriculum</label>
        <select id="tu-curriculum" v-model="form.curriculum_id" class="tu-select">
          <option v-for="c in curricula" :key="c.id" :value="c.id">
            {{ c.name }}{{ c.built_in ? ' (default)' : '' }} · {{ c.sessions.length }} sessions
          </option>
        </select>
        <div v-if="curriculum" class="tu-card tu-card--accent">
          <strong>{{ curriculum.name }}</strong>
          <span class="tu-muted">{{ moduleSummary }}</span>
        </div>
      </div>

      <div class="tu-actions">
        <NuxtLink :to="`/activities/${frameworkId}/${cfg.route}`" class="tu-btn tu-btn--ghost">Cancel</NuxtLink>
        <button type="submit" class="tu-btn" :disabled="saving || !canSubmit">
          {{ saving ? 'Creating…' : `Create group · Enroll ${cfg.noun}` }}
        </button>
      </div>
    </form>
  </NuxtLayout>
</template>

<script setup lang="ts">
import FieldError from '../../components/interfaces/FieldError.vue'
import { useInlineValidation } from '../../composables/useInlineValidation'
import { cohortProgram, cohortProgramOf, type CohortProgramKey } from '../../utils/cohortPrograms'

const props = defineProps<{ program: CohortProgramKey }>()
const cfg = cohortProgram(props.program)
const api = cohortApi(props.program)

import AppIcon from '../interfaces/AppIcon.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { frameworkApi } from '../../services/frameworkApi'
import { locationApi } from '../../services/locationApi'
import { todayISO, WEEKDAYS, cohortApi } from '../../services/teamupApi'
import type { AgeBand, TeamUpCurriculum } from '../../interfaces/teamup'

// Built-in field rules (required, min/max…) shown inline instead of browser pop-ups.
const iv = useInlineValidation()


const AGE_BANDS: AgeBand[] = ['6-9', '10-14', '15-17']

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const frameworkId = route.params.id as string
const isAdmin = computed(() => auth.userRole === 'org_admin')

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: cfg.label, href: `/activities/${frameworkId}/${cfg.route}${route.query.fa ? `?fa=${route.query.fa}` : ''}` },
  { title: 'New group', href: route.fullPath, current: true },
])

const form = reactive({
  cfs_location_id: '',
  name: '',
  age_band: '10-14' as AgeBand,
  curriculum_id: '',
  meeting_days: [] as number[],
  meeting_time: '',
  start_date: todayISO(),
})
const frameworkActivityId = ref((route.query.fa as string) || '')
const servicePoints = ref<{ id: string; name: string }[]>([])
const curricula = ref<TeamUpCurriculum[]>([])
const curriculum = computed(() => curricula.value.find(c => c.id === form.curriculum_id) ?? null)
const saving = ref(false)
const error = ref<string | null>(null)

const canSubmit = computed(() =>
  !!frameworkActivityId.value && form.name.trim() !== '' && (!isAdmin.value || !!form.cfs_location_id),
)

const moduleSummary = computed(() =>
  (curriculum.value?.modules ?? []).map(m => `${m.name} ${m.sessions}`).join(' · '),
)

function toggleDay(i: number) {
  form.meeting_days = form.meeting_days.includes(i)
    ? form.meeting_days.filter(d => d !== i)
    : [...form.meeting_days, i].sort()
}

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  error.value = null
  try {
    const group = await api.createGroup({
      framework_activity_id: frameworkActivityId.value,
      cfs_location_id: isAdmin.value ? form.cfs_location_id : undefined,
      name: form.name.trim(),
      age_band: cfg.requiresAgeBand ? form.age_band : undefined,
      curriculum_id: form.curriculum_id || undefined,
      meeting_days: form.meeting_days,
      meeting_time: form.meeting_time.trim() || undefined,
      start_date: form.start_date || undefined,
    })
    await router.push(`/activities/${frameworkId}/${cfg.route}/groups/${group.id}/enroll`)
  } catch (e: any) {
    error.value = e?.message ?? 'Could not create the group'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    curricula.value = await api.listCurricula()
    // Default: the organisation's own curriculum if it has one, else the built-in.
    form.curriculum_id = (curricula.value.find(c => !c.built_in) ?? curricula.value[0])?.id ?? ''
    if (!frameworkActivityId.value) {
      const acts: any[] = ((await frameworkApi.getActivities(frameworkId)) as any).activities ?? []
      frameworkActivityId.value = acts.find(a => cohortProgramOf(a)?.key === props.program)?.id ?? ''
    }
    if (isAdmin.value) {
      const res = await locationApi.listLocations()
      servicePoints.value = (res.locations ?? []).flatMap((l: any) => l.service_points ?? [])
      if (servicePoints.value.length === 1) form.cfs_location_id = servicePoints.value[0]!.id
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load form data'
  }
})
</script>
