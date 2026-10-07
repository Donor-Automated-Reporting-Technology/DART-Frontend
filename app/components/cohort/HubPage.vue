<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="tu-page">
      <div class="tu-header">
        <div>
          <h1 class="tu-title">{{ cfg.label }} Hub</h1>
          <p class="tu-subtitle">
            <template v-if="activityName">{{ activityName }} · </template>{{ cfg.tagline }}
          </p>
        </div>
        <NuxtLink :to="`/activities/${frameworkId}`" class="tu-btn tu-btn--ghost">
          <AppIcon name="arrow-left" :size="14" />
          Project
        </NuxtLink>
      </div>

      <div v-if="error" class="tu-alert tu-alert--error">
        <AppIcon name="alert-circle" :size="14" />
        {{ error }}
      </div>

      <div v-if="loading" class="tu-stack">
        <div class="tu-skeleton" />
        <div class="tu-skeleton" />
      </div>

      <template v-else>
        <div v-if="frameworkActivityId" class="tu-grid2">
          <NuxtLink :to="`/activities/${frameworkId}/${cfg.route}/reports?fa=${frameworkActivityId}`" class="tu-card tu-card--link">
            <span class="tu-row" style="justify-content: flex-start">
              <AppIcon name="file-text" :size="18" />
              <strong>Reports</strong>
            </span>
            <span class="tu-muted">Daily and weekly Word reports</span>
          </NuxtLink>
          <NuxtLink :to="`/dashboard/${cfg.route}/${frameworkActivityId}`" class="tu-card tu-card--link">
            <span class="tu-row" style="justify-content: flex-start">
              <AppIcon name="bar-chart-2" :size="18" />
              <strong>Dashboard</strong>
            </span>
            <span class="tu-muted">Reach, sessions attended, who needs follow-up</span>
          </NuxtLink>
          <NuxtLink :to="`/activities/${frameworkId}/${cfg.route}/curricula?fa=${frameworkActivityId}`" class="tu-card tu-card--link">
            <span class="tu-row" style="justify-content: flex-start">
              <AppIcon name="layers" :size="18" />
              <strong>Curricula</strong>
            </span>
            <span class="tu-muted">Default sessions or your organisation's own</span>
          </NuxtLink>
        </div>

        <p class="tu-label">My groups</p>
        <div v-if="groups.length === 0" class="tu-card">
          <strong>No {{ cfg.label }} groups yet</strong>
          <span class="tu-muted">Create a group, enroll {{ cfg.noun }} registered at your location, then run Session 1.</span>
        </div>
        <NuxtLink
          v-for="g in groups"
          :key="g.id"
          :to="`/activities/${frameworkId}/${cfg.route}/groups/${g.id}`"
          class="tu-card tu-card--link"
        >
          <div class="tu-row">
            <strong>{{ g.name }}</strong>
            <span class="tu-pill" :class="g.status === 'active' ? 'tu-pill--active' : 'tu-pill--done'">
              {{ g.status === 'active' ? 'Active' : 'Completed' }}
            </span>
          </div>
          <span class="tu-muted">
            {{ g.service_point_name }}<template v-if="g.age_band"> · Age {{ g.age_band }}</template> · {{ g.enrolled_count }} {{ cfg.noun }}
            <template v-if="meetingLabel(g)"> · {{ meetingLabel(g) }}</template>
          </span>
          <div class="tu-bar" aria-hidden="true">
            <span :style="{ width: `${progress(g)}%` }" />
          </div>
          <span class="tu-muted">{{ g.sessions_completed }} of {{ g.total_sessions }} sessions done</span>
        </NuxtLink>

        <div class="tu-actions">
          <NuxtLink
            v-if="frameworkActivityId"
            :to="`/activities/${frameworkId}/${cfg.route}/new?fa=${frameworkActivityId}`"
            class="tu-btn"
          >
            <AppIcon name="plus" :size="16" />
            New {{ cfg.label }} group
          </NuxtLink>
        </div>
        <p v-if="!frameworkActivityId" class="tu-muted">
          This project has no {{ cfg.label }} activity yet. In Settings → Projects, open the logframe output and use
          “Add activity” with the <strong>{{ cfg.label }}</strong> module.
        </p>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { cohortProgram, cohortProgramOf, type CohortProgramKey } from '../../utils/cohortPrograms'

const props = defineProps<{ program: CohortProgramKey }>()
const cfg = cohortProgram(props.program)
const api = cohortApi(props.program)

import AppIcon from '../interfaces/AppIcon.vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { frameworkApi } from '../../services/frameworkApi'
import { WEEKDAYS, cohortApi } from '../../services/teamupApi'
import type { TeamUpGroup } from '../../interfaces/teamup'


const route = useRoute()
const frameworkId = route.params.id as string

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: 'Project', href: `/activities/${frameworkId}` },
  { title: cfg.label, href: `/activities/${frameworkId}/${cfg.route}`, current: true },
])

const loading = ref(true)
const error = ref<string | null>(null)
const groups = ref<TeamUpGroup[]>([])
const frameworkActivityId = ref<string | null>(null)
const activityName = ref('')

function progress(g: TeamUpGroup) {
  return g.total_sessions ? Math.round((g.sessions_completed / g.total_sessions) * 100) : 0
}

function meetingLabel(g: TeamUpGroup) {
  const days = (g.meeting_days ?? []).map(d => WEEKDAYS[d]).join(' / ')
  return [days, g.meeting_time].filter(Boolean).join(' ')
}

onMounted(async () => {
  try {
    const raw: any[] = ((await frameworkApi.getActivities(frameworkId)) as any).activities ?? []
    const teamupActs = raw.filter(a => cohortProgramOf(a)?.key === props.program)
    // Prefer the activity the user opened (?fa=); otherwise the project's first activity of this programme.
    const chosen = teamupActs.find(a => a.id === route.query.fa) ?? teamupActs[0]
    frameworkActivityId.value = chosen?.id ?? null
    activityName.value = chosen?.activity_name ?? chosen?.template?.name ?? ''
    groups.value = chosen ? await api.listGroups({ frameworkActivityId: chosen.id }) : []
  } catch (e: any) {
    error.value = e?.message ?? `Failed to load ${cfg.label} groups`
  } finally {
    loading.value = false
  }
})
</script>
