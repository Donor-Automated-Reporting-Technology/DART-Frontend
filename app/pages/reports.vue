<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Reports', href: '/reports', current: true }]">
    <div class="tu-page rp-page">
      <div class="tu-header">
        <div>
          <h1 class="tu-title">Reports</h1>
          <p class="tu-subtitle">Every report DART can produce: Word reports for facilitators and supervisors, and Excel data for managers and M&amp;E.</p>
        </div>
      </div>

      <div v-if="error" class="tu-alert tu-alert--error">
        <AppIcon name="alert-circle" :size="14" />
        {{ error }}
      </div>

      <div v-if="loading" class="tu-stack"><div class="tu-skeleton" /><div class="tu-skeleton" /></div>

      <div v-else-if="projects.length === 0" class="tu-card">
        <strong>No projects yet</strong>
        <span class="tu-muted">Set up a project and its activities in Settings → Projects to see its reports here.</span>
      </div>

      <template v-else>
        <div v-if="projects.length > 1" class="tu-field">
          <label for="rp-project">Project</label>
          <select id="rp-project" v-model="projectId" class="tu-select">
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>

        <div class="rp-list">
          <section v-for="sec in sections" :key="sec.key" class="rp-section" :class="{ 'rp-section--open': open[sec.key] }">
            <button type="button" class="rp-head" :aria-expanded="!!open[sec.key]" @click="toggle(sec.key)">
              <span class="rp-icon" :class="sec.iconClass"><AppIcon :name="sec.icon" :size="18" /></span>
              <span class="rp-head-text">
                <strong>{{ sec.title }}</strong>
                <span v-if="sec.subtitle !== sec.title" class="tu-muted">{{ sec.subtitle }}</span>
              </span>
              <span class="rp-count">{{ sec.rows.length }}</span>
              <AppIcon :name="open[sec.key] ? 'chevron-up' : 'chevron-down'" :size="16" />
            </button>

            <ul v-if="open[sec.key]" class="rp-rows">
              <li v-for="row in sec.rows" :key="row.key" class="rp-row" :class="{ 'rp-row--wide': row.key === 'beneficiaries' }">
                <span class="rp-kind" :class="row.kind === 'Excel' ? 'rp-kind--excel' : ''">{{ row.kind }}</span>
                <span class="rp-row-text">
                  <span class="rp-row-title">{{ row.title }}</span>
                  <span class="tu-muted">{{ row.description }}</span>
                </span>
                <template v-if="row.key === 'beneficiaries'">
                  <label for="rp-loc" class="sr-only">Location</label>
                  <select id="rp-loc" v-model="locationId" class="tu-select rp-loc">
                    <option value="">All locations</option>
                    <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
                  </select>
                </template>
                <NuxtLink v-if="row.to" :to="row.to" class="tu-btn tu-btn--ghost rp-action">
                  Open
                  <AppIcon name="chevron-right" :size="14" />
                </NuxtLink>
                <button v-else type="button" class="tu-btn tu-btn--ghost rp-action" :disabled="busy === row.key" @click="row.run && row.run()">
                  <AppIcon name="download" :size="14" />
                  {{ busy === row.key ? 'Preparing…' : 'Download' }}
                </button>
              </li>
            </ul>
          </section>
        </div>

        <p v-if="!canExport" class="tu-muted">Excel data downloads are for admins, programme managers and M&amp;E.</p>
        <p v-if="sections.length === 0" class="tu-muted">This project has no reporting activities yet.</p>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { frameworkApi } from '../services/frameworkApi'
import { beneficiaryApi, type OrgLocation } from '../services/beneficiaryApi'
import { canDownloadData, downloadFile } from '../services/teamupApi'
import { cohortProgramOf } from '../utils/cohortPrograms'
import { isPssActivityCode, isPssActivityName } from '../utils/activityConfig'

definePageMeta({ layout: false, middleware: ['auth'] })

interface ProjectActivity { id: string; name: string; code: string; module: string | null; templateCode: string; isActive: boolean }
interface Project { id: string; name: string; activities: ProjectActivity[] }

const auth = useAuthStore()
const canExport = computed(() => canDownloadData(auth.userRole))

const projects = ref<Project[]>([])
const projectId = ref('')
const locations = ref<OrgLocation[]>([])
const locationId = ref('')
const loading = ref(true)
const busy = ref('')
const error = ref<string | null>(null)

const project = computed(() => projects.value.find(p => p.id === projectId.value) ?? null)
const isPss = (a: ProjectActivity) => a.module === 'pss' || isPssActivityCode(a.templateCode) || isPssActivityName(a.name)

interface ReportRow {
  key: string
  kind: 'Word' | 'Excel' | 'Page'
  title: string
  description: string
  to?: string
  run?: () => void
}
interface ReportSection {
  key: string
  title: string
  subtitle: string
  icon: string
  iconClass?: string
  rows: ReportRow[]
}

/** Reports grouped by activity, plus the whole-project downloads. */
const sections = computed<ReportSection[]>(() => {
  const p = project.value
  if (!p) return []
  const out: ReportSection[] = []

  if (canExport.value) {
    out.push({
      key: 'project',
      title: 'Project & beneficiaries',
      subtitle: 'Whole-project data in the DRA database format',
      icon: 'layers',
      iconClass: 'rp-icon--excel',
      rows: [
        { key: 'project', kind: 'Excel', title: 'Project database', description: 'Activities, beneficiaries from every location and a sheet per activity.',
          run: () => download('project', `/api/v1/frameworks/${p.id}/export`, 'project.xlsx') },
        { key: 'beneficiaries', kind: 'Excel', title: 'Beneficiaries', description: 'Everyone registered, with location and attendance.',
          run: downloadBeneficiaries },
      ],
    })
  }

  let pssAdded = false
  for (const a of p.activities) {
    const cohort = cohortProgramOf({ module: a.module, activity_code: a.templateCode })
    if (cohort) {
      const base = `/activities/${p.id}/${cohort.route}`
      const rows: ReportRow[] = [
        { key: `${a.id}-daily`, kind: 'Word', title: 'Daily report', description: 'Every session of one day.', to: `${base}/reports?fa=${a.id}` },
        { key: `${a.id}-weekly`, kind: 'Word', title: 'Weekly report', description: 'The week at a glance and who to follow up.', to: `${base}/reports?fa=${a.id}` },
        { key: `${a.id}-groups`, kind: 'Word', title: 'Session & group progress reports', description: 'From each group\'s page in the hub.', to: `${base}?fa=${a.id}` },
        { key: `${a.id}-dashboard`, kind: 'Page', title: 'Dashboard', description: `Reach and sessions attended per ${cohort.nounSingular}.`, to: `/dashboard/${cohort.route}/${a.id}` },
      ]
      if (canExport.value) {
        rows.push({ key: `${a.id}-register`, kind: 'Excel', title: 'Attendance register', description: `One row per ${cohort.nounSingular}, date or X per session.`,
          run: () => download(`${a.id}-register`, `/api/v1/${cohort.route}/export?framework_activity_id=${a.id}`, `${cohort.label}_Attendance.xlsx`) })
      }
      out.push({ key: a.id, title: a.name, subtitle: cohort.label, icon: 'users', rows })
    } else if (isPss(a) && !pssAdded) {
      pssAdded = true
      out.push({
        key: 'pss',
        title: a.name,
        subtitle: 'Structured PSS',
        icon: 'calendar',
        rows: [
          { key: 'pss-daily', kind: 'Word', title: 'Daily facilitator report', description: 'One day of PSS sessions: attendance by age and sex, activities, protection notes.', to: `/activities/${p.id}/pss/reports/daily` },
          { key: 'pss-dashboard', kind: 'Page', title: 'Dashboard', description: 'Attendance and reach by location.', to: `/dashboard/activities/${a.id}` },
        ],
      })
    }
  }
  return out
})

// Collapsed by default except the first section.
const open = ref<Record<string, boolean>>({})
function toggle(key: string) {
  open.value = { ...open.value, [key]: !open.value[key] }
}
watch(sections, secs => {
  if (secs.length && !Object.keys(open.value).length) open.value = { [secs[0]!.key]: true }
}, { immediate: true })

async function download(key: string, url: string, filename: string) {
  busy.value = key
  error.value = null
  try {
    await downloadFile(url, filename)
  } catch (e: any) {
    error.value = e?.message ?? 'Download failed'
  } finally {
    busy.value = ''
  }
}

const downloadBeneficiaries = () =>
  download('beneficiaries', `/api/v1/beneficiaries/export${locationId.value ? `?cfs_location_id=${locationId.value}` : ''}`, 'beneficiaries.xlsx')

async function loadActivities(p: Project) {
  if (p.activities.length) return
  const raw: any[] = ((await frameworkApi.getActivities(p.id)) as any).activities ?? []
  p.activities = raw
    .filter(a => a.is_active !== false)
    .map(a => ({
      id: a.id,
      name: a.activity_name ?? a.template?.name ?? 'Activity',
      code: a.activity_code ?? '',
      module: a.module ?? null,
      templateCode: a.template?.code ?? a.activity_code ?? '',
      isActive: a.is_active !== false,
    }))
}

watch(projectId, async id => {
  const p = projects.value.find(x => x.id === id)
  if (!p) return
  try {
    await loadActivities(p)
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load the project activities'
  }
})

onMounted(async () => {
  try {
    const [fws, locs] = await Promise.all([
      frameworkApi.listFrameworks(),
      beneficiaryApi.listLocations().catch(() => [] as OrgLocation[]),
    ])
    locations.value = locs
    projects.value = (fws.frameworks ?? []).map((f: any) => ({
      id: f.id,
      name: f.project_name || f.partner_name || 'Project',
      activities: [],
    }))
    if (projects.value.length) {
      await loadActivities(projects.value[0]!)
      projectId.value = projects.value[0]!.id
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load projects'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.rp-page { max-width: 820px; }
.rp-list { display: flex; flex-direction: column; gap: 10px; }
.rp-section { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; }
.rp-section--open { border-color: color-mix(in srgb, var(--primary) 40%, var(--border-color)); }
.rp-head { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: none; border: none; font: inherit; color: var(--text-primary); text-align: left; cursor: pointer; }
.rp-head:hover { background: var(--hover-bg); }
.rp-head-text { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.rp-count { font-size: 0.72rem; font-weight: 650; color: var(--text-muted); background: var(--bg-input); padding: 2px 8px; border-radius: 999px; }
.rp-icon { width: 34px; height: 34px; border-radius: 10px; flex: none; display: inline-flex; align-items: center; justify-content: center; background: var(--primary-dim); color: var(--primary); }
.rp-icon--excel { background: var(--data-teal-dim); color: var(--data-teal); }
.rp-rows { list-style: none; margin: 0; padding: 0 16px 8px; border-top: 1px solid var(--border-subtle); }
.rp-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-subtle); flex-wrap: wrap; }
.rp-row:last-child { border-bottom: none; }
.rp-kind { flex: none; width: 46px; text-align: center; font-size: 0.66rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 0; border-radius: 6px; background: var(--primary-dim); color: var(--primary); }
.rp-kind--excel { background: var(--data-teal-dim); color: var(--data-teal); }
.rp-row-text { flex: 1 1 200px; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.rp-row-title { font-size: 0.88rem; font-weight: 600; color: var(--text-primary); }
.rp-loc { flex: 0 1 180px; min-height: 38px; }
.rp-action { min-height: 38px; padding: 0 14px; flex: none; }
@media (max-width: 560px) {
  .rp-row { flex-wrap: nowrap; gap: 10px; }
  .rp-row--wide { flex-wrap: wrap; }
  .rp-row-text { flex: 1 1 0; }
  .rp-row--wide .rp-row-text { flex-basis: calc(100% - 60px); }
  .rp-row--wide .rp-loc { flex: 1 1 0; }
  .rp-kind { width: 42px; }
  .rp-action { padding: 0 10px; }
}
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
