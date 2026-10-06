<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="tu-page">
      <div class="tu-header">
        <div>
          <h1 class="tu-title">TeamUp Hub</h1>
          <p class="tu-subtitle">Run TeamUp groups through the 20-session curriculum and report to DRA.</p>
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
        <p class="tu-label">My groups</p>
        <div v-if="groups.length === 0" class="tu-card">
          <strong>No TeamUp groups yet</strong>
          <span class="tu-muted">Create a group, enroll children from your CFS, then run Session 1.</span>
        </div>
        <NuxtLink
          v-for="g in groups"
          :key="g.id"
          :to="`/activities/${frameworkId}/teamup/groups/${g.id}`"
          class="tu-card tu-card--link"
        >
          <div class="tu-row">
            <strong>{{ g.name }}</strong>
            <span class="tu-pill" :class="g.status === 'active' ? 'tu-pill--active' : 'tu-pill--done'">
              {{ g.status === 'active' ? 'Active' : 'Completed' }}
            </span>
          </div>
          <span class="tu-muted">
            {{ g.service_point_name }} · Age {{ g.age_band }} · {{ g.enrolled_count }} children
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
            :to="`/activities/${frameworkId}/teamup/new?fa=${frameworkActivityId}`"
            class="tu-btn"
          >
            <AppIcon name="plus" :size="16" />
            New TeamUp group
          </NuxtLink>
          <button type="button" class="tu-btn tu-btn--ghost" :disabled="downloading || groups.length === 0" @click="downloadAll">
            <AppIcon name="download" :size="16" />
            {{ downloading ? 'Preparing…' : 'Download DRA Excel (all groups)' }}
          </button>
        </div>
        <p v-if="!frameworkActivityId" class="tu-muted">
          TeamUp is not switched on for this project. Turn it on in Settings → Framework first.
        </p>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { frameworkApi } from '../../../../services/frameworkApi'
import { teamupApi, WEEKDAYS } from '../../../../services/teamupApi'
import type { TeamUpGroup } from '../../../../interfaces/teamup'

definePageMeta({ layout: false, middleware: ['auth'] })

const route = useRoute()
const frameworkId = route.params.id as string

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: 'Project', href: `/activities/${frameworkId}` },
  { title: 'TeamUp', href: `/activities/${frameworkId}/teamup`, current: true },
])

const loading = ref(true)
const downloading = ref(false)
const error = ref<string | null>(null)
const groups = ref<TeamUpGroup[]>([])
const frameworkActivityId = ref<string | null>(null)

function progress(g: TeamUpGroup) {
  return g.total_sessions ? Math.round((g.sessions_completed / g.total_sessions) * 100) : 0
}

function meetingLabel(g: TeamUpGroup) {
  const days = (g.meeting_days ?? []).map(d => WEEKDAYS[d]).join(' / ')
  return [days, g.meeting_time].filter(Boolean).join(' ')
}

async function downloadAll() {
  downloading.value = true
  error.value = null
  try {
    await teamupApi.downloadDRA()
  } catch (e: any) {
    error.value = e?.message ?? 'Download failed'
  } finally {
    downloading.value = false
  }
}

onMounted(async () => {
  try {
    const [acts, list] = await Promise.all([
      frameworkApi.getActivities(frameworkId),
      teamupApi.listGroups(),
    ])
    const raw: any[] = (acts as any).activities ?? []
    const teamup = raw.find(a => (a.template?.code ?? a.activity_code ?? a.code) === 'TEAMUP')
    frameworkActivityId.value = teamup?.id ?? null
    groups.value = list ?? []
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load TeamUp groups'
  } finally {
    loading.value = false
  }
})
</script>
