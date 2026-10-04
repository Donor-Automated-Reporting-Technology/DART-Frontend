<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="ps-page project-edit">
      <!-- Header -->
      <header class="page-header">
        <div class="page-header-text">
          <span class="page-eyebrow">Project</span>
          <h1 class="page-title">{{ project?.project_name || 'Project' }}</h1>
          <p class="page-subtitle">Edit the project name and duration. Activities and targets are managed in the M&E logframe.</p>
        </div>
        <NuxtLink to="/settings/projects" class="btn-back">&larr; All projects</NuxtLink>
      </header>

      <!-- Sub-navigation -->
      <nav class="sub-nav">
        <span class="sub-nav-item sub-nav-item--active">Project settings</span>
        <NuxtLink :to="`/settings/projects/${projectId}/logframe`" class="sub-nav-item">M&E logframe</NuxtLink>
      </nav>

      <!-- Loading -->
      <div v-if="loading && !project" class="state state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>

      <!-- Not found -->
      <div v-else-if="loadError" class="state state--error">{{ loadError }}</div>

      <!-- ─── Project details ─── -->
      <form v-else-if="project" class="section-card" @submit.prevent="saveProject">
        <div class="card-head">
          <div class="card-head-text">
            <h2 class="card-title">Project details</h2>
            <p class="card-hint">These appear on dashboards and reports for this project.</p>
          </div>
        </div>

        <div class="field">
          <label class="field-label" for="pe-name">Project name *</label>
          <input id="pe-name" v-model="form.project_name" type="text" class="field-input" />
        </div>
        <div class="form-grid">
          <div class="field">
            <label class="field-label" for="pe-start">Period start *</label>
            <input id="pe-start" v-model="form.period_start" type="date" class="field-input" />
          </div>
          <div class="field">
            <label class="field-label" for="pe-end">Period end *</label>
            <input id="pe-end" v-model="form.period_end" type="date" class="field-input" />
          </div>
        </div>

        <div v-if="fwError" class="api-err">{{ fwError }}</div>

        <div class="actions">
          <Transition name="fade">
            <span v-if="fwSuccess" class="save-ok">Saved</span>
          </Transition>
          <button type="submit" class="btn-primary" :disabled="fwSaving">
            <span v-if="fwSaving" class="btn-spinner" />
            {{ fwSaving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </form>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { frameworkApi } from '../../../../services/frameworkApi'
import { ApiError } from '../../../../services/api'
import type { Framework } from '../../../../interfaces/framework'


definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'program_manager'],
})

const route = useRoute()
const projectId = route.params.id as string

const project = ref<Framework | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const breadcrumbs = computed(() => [
  { title: 'Settings', href: '/settings' },
  { title: 'Projects', href: '/settings/projects' },
  { title: project.value?.project_name ?? 'Project', href: `/settings/projects/${projectId}`, current: true },
])

const form = reactive({
  project_name: '',
  period_start: '',
  period_end: '',
})

const fwSaving = ref(false)
const fwError = ref('')
const fwSuccess = ref(false)

function seedForm() {
  if (!project.value) return
  form.project_name = project.value.project_name ?? ''
  form.period_start = project.value.period_start?.slice(0, 10) ?? ''
  form.period_end = project.value.period_end?.slice(0, 10) ?? ''
}

async function fetchProject() {
  loading.value = true
  loadError.value = null
  try {
    const res = await frameworkApi.listFrameworks()
    project.value = (res.frameworks ?? []).find((f) => f.id === projectId) ?? null
    if (!project.value) { loadError.value = 'Project not found'; return }
    seedForm()
  } catch (e: any) {
    loadError.value = e?.message ?? 'Failed to load project'
  } finally {
    loading.value = false
  }
}



async function saveProject() {
  // Activities and activity targets live in the M&E logframe (impacts)
  // and are intentionally not touched from project settings.
  fwError.value = ''
  fwSuccess.value = false
  if (!form.project_name.trim()) { fwError.value = 'Project name is required'; return }
  if (!form.period_start || !form.period_end) { fwError.value = 'Period start and end are required'; return }
  if (form.period_end < form.period_start) { fwError.value = 'End date must be after start date'; return }

  fwSaving.value = true
  try {
    await frameworkApi.updateFramework(projectId, {
      project_name: form.project_name.trim(),
      period_start: form.period_start,
      period_end: form.period_end,
    })
    await fetchProject()
    fwSuccess.value = true
    setTimeout(() => { fwSuccess.value = false }, 3000)
  } catch (e: any) {
    fwError.value = e instanceof ApiError ? e.message : (e?.message ?? 'Save failed')
  } finally {
    fwSaving.value = false
  }
}

onMounted(() => {
  fetchProject()
})
</script>

<style scoped>
/* Shared look comes from assets/css/project-settings.css (.ps-page). */
.project-edit { max-width: 760px; }
</style>
