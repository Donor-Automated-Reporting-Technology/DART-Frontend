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

        <!-- ═══ Word reports ═══ -->
        <section class="tu-stack">
          <p class="tu-label">Word reports</p>
          <div class="tu-grid2">
            <NuxtLink
              v-for="r in wordReports"
              :key="r.key"
              :to="r.to"
              class="tu-card tu-card--link rp-card"
            >
              <span class="rp-icon"><AppIcon :name="r.icon" :size="18" /></span>
              <span class="rp-body">
                <strong>{{ r.title }}</strong>
                <span class="tu-muted">{{ r.description }}</span>
              </span>
              <AppIcon name="chevron-right" :size="16" />
            </NuxtLink>
          </div>
          <span v-if="wordReports.length === 0" class="tu-muted">
            This project has no PSS, TeamUp, Parenting or Community Dialogue activity yet.
          </span>
          <span class="tu-muted">Session and group progress reports are on each group's page (open the activity's hub).</span>
        </section>

        <!-- ═══ Excel data ═══ -->
        <section class="tu-stack">
          <p class="tu-label">Excel data</p>
          <template v-if="canExport">
            <div class="tu-grid2">
              <button type="button" class="tu-card tu-card--link rp-card" :disabled="busy === 'project'" @click="download('project', `/api/v1/frameworks/${projectId}/export`, 'project.xlsx')">
                <span class="rp-icon rp-icon--excel"><AppIcon name="file-spreadsheet" :size="18" /></span>
                <span class="rp-body">
                  <strong>{{ busy === 'project' ? 'Preparing…' : 'Project database (DRA format)' }}</strong>
                  <span class="tu-muted">One workbook: activities, beneficiaries from every location, and a sheet per activity (PSS, TeamUP, Parenting, Community Dialogue).</span>
                </span>
                <AppIcon name="download" :size="16" />
              </button>

              <div class="tu-card rp-card rp-card--stack">
                <span class="rp-row">
                  <span class="rp-icon rp-icon--excel"><AppIcon name="users" :size="18" /></span>
                  <span class="rp-body">
                    <strong>Beneficiaries</strong>
                    <span class="tu-muted">Everyone registered, with location and attendance.</span>
                  </span>
                </span>
                <div class="rp-row">
                  <label for="rp-loc" class="sr-only">Location</label>
                  <select id="rp-loc" v-model="locationId" class="tu-select">
                    <option value="">All locations</option>
                    <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
                  </select>
                  <button type="button" class="tu-btn tu-btn--ghost" :disabled="busy === 'beneficiaries'" @click="downloadBeneficiaries">
                    <AppIcon name="download" :size="16" />
                    {{ busy === 'beneficiaries' ? 'Preparing…' : 'Download' }}
                  </button>
                </div>
              </div>

              <button
                v-for="r in registerReports"
                :key="r.key"
                type="button"
                class="tu-card tu-card--link rp-card"
                :disabled="busy === r.key"
                @click="download(r.key, r.url, r.filename)"
              >
                <span class="rp-icon rp-icon--excel"><AppIcon name="file-spreadsheet" :size="18" /></span>
                <span class="rp-body">
                  <strong>{{ busy === r.key ? 'Preparing…' : r.title }}</strong>
                  <span class="tu-muted">{{ r.description }}</span>
                </span>
                <AppIcon name="download" :size="16" />
              </button>
            </div>
          </template>
          <div v-else class="tu-card">
            <span class="tu-muted">Excel data downloads are for admins, programme managers and M&amp;E. Use the Word reports above.</span>
          </div>
        </section>
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

const wordReports = computed(() => {
  const p = project.value
  if (!p) return []
  const out: { key: string; to: string; title: string; description: string; icon: string }[] = []
  for (const a of p.activities) {
    const cohort = cohortProgramOf({ module: a.module, activity_code: a.templateCode })
    if (cohort) {
      out.push({
        key: a.id,
        to: `/activities/${p.id}/${cohort.route}/reports?fa=${a.id}`,
        title: `${a.name} — daily & weekly`,
        description: `${cohort.label}: every session of a day or week, with attendance, topics, observations and follow-up.`,
        icon: 'file-text',
      })
    } else if (isPss(a) && !out.some(r => r.key === 'pss')) {
      out.push({
        key: 'pss',
        to: `/activities/${p.id}/pss/reports/daily`,
        title: 'PSS daily facilitator report',
        description: 'Structured PSS sessions of one day: attendance by age and sex, activities, protection notes.',
        icon: 'file-text',
      })
    }
  }
  return out
})

const registerReports = computed(() => {
  const p = project.value
  if (!p) return []
  return p.activities.flatMap(a => {
    const cohort = cohortProgramOf({ module: a.module, activity_code: a.templateCode })
    if (!cohort) return []
    return [{
      key: `reg-${a.id}`,
      url: `/api/v1/${cohort.route}/export?framework_activity_id=${a.id}`,
      filename: `${cohort.label}_Attendance.xlsx`,
      title: `${a.name} — attendance register`,
      description: `${cohort.label}: one row per ${cohort.nounSingular}, date or X for every session (DRA layout).`,
    }]
  })
})

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
.rp-page { max-width: 960px; }
.rp-card { flex-direction: row; align-items: center; gap: 12px; text-align: left; font: inherit; cursor: pointer; }
.rp-card:disabled { opacity: 0.6; cursor: progress; }
.rp-card--stack { flex-direction: column; align-items: stretch; cursor: default; }
.rp-row { display: flex; align-items: center; gap: 10px; }
.rp-row .tu-select { flex: 1; min-width: 0; }
.rp-body { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rp-icon { width: 36px; height: 36px; border-radius: 10px; flex: none; display: inline-flex; align-items: center; justify-content: center; background: var(--primary-dim); color: var(--primary); }
.rp-icon--excel { background: var(--data-teal-dim); color: var(--data-teal); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
