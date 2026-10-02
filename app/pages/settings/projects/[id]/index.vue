<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="project-edit">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ project?.project_name || 'Project' }}</h1>
          <p class="page-subtitle">Edit project name and duration. Activities and targets are managed in M&E.</p>
        </div>
        <NuxtLink to="/settings/projects" class="btn-back">
          <AppIcon name="arrow-left" :size="14" /> All projects
        </NuxtLink>
      </div>

      <!-- Sub-navigation -->
      <div class="sub-nav">
        <span class="sub-nav-item sub-nav-item--active">
          <AppIcon name="settings" :size="13" /> Project settings
        </span>
        <NuxtLink :to="`/settings/projects/${projectId}/logframe`" class="sub-nav-item">
          <AppIcon name="target" :size="13" /> M&E Logframe
        </NuxtLink>
      </div>

      <!-- Loading -->
      <div v-if="loading && !project" class="state state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>

      <!-- Not found -->
      <div v-else-if="loadError" class="state state--error">
        <AppIcon name="alert-circle" :size="18" /> {{ loadError }}
      </div>

      <template v-else-if="project">
        <!-- ─── Project details ─── -->
        <form class="form" @submit.prevent="saveProject">
          <div class="section-label">Project details</div>
          <div class="section-card">
            <div class="form-grid">
              <div class="field">
                <label class="field-label" for="pe-name">Project name *</label>
                <input id="pe-name" v-model="form.project_name" type="text" class="field-input" />
              </div>

              <div class="field">
                <label class="field-label" for="pe-start">Period start *</label>
                <input id="pe-start" v-model="form.period_start" type="date" class="field-input" />
              </div>

              <div class="field">
                <label class="field-label" for="pe-end">Period end *</label>
                <input id="pe-end" v-model="form.period_end" type="date" class="field-input" />
              </div>
            </div>
          </div>

          <div v-if="fwError" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ fwError }}</div>

          <div class="actions">
            <Transition name="toast">
              <span v-if="fwSuccess" class="toast-success">✓ Saved</span>
            </Transition>
            <button type="submit" class="btn-primary" :disabled="fwSaving">
              <span v-if="fwSaving" class="btn-spinner" />
              {{ fwSaving ? 'Saving…' : 'Save changes' }}
            </button>
          </div>

        </form>
      </template>
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
.project-edit { max-width: 760px; padding-bottom: 48px; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  margin-bottom: 24px;
}
.page-title { font-size: 1.35rem; font-weight: 750; margin: 0 0 2px; }
.page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin: 0; }.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-decoration: none;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.sub-nav {
  display: flex;
  gap: 4px;
  margin: 18px 0 4px;
  border-bottom: 1px solid var(--border-color);
}
.sub-nav-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.sub-nav-item:hover {
  color: var(--text-primary);
}
.sub-nav-item--active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.section-label {
  font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-muted); margin: 24px 0 6px; padding-left: 2px;
}
.section-hint { font-size: 0.78rem; color: var(--text-muted); margin: -2px 0 10px; padding-left: 2px; }

.section-card {
  background: var(--bg-panel); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 18px;
}
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); }
.field-input {
  width: 100%; padding: 8px 10px; font-size: 0.85rem;
  background: var(--bg-input); border: 1px solid var(--border-color);
  border-radius: 6px;
}
.field-input:disabled { background: var(--bg-surface); color: var(--text-muted); cursor: not-allowed; }
.field-hint { font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }

.api-err {
  display: flex; align-items: center; gap: 6px; margin-top: 16px;
  padding: 10px 12px; font-size: 0.82rem; color: var(--error);
  background: var(--error-bg); border-radius: 6px;
}

.actions { display: flex; justify-content: flex-end; margin-top: 14px; }

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

.toast-success {
  margin-top: 10px; padding: 8px 12px; font-size: 0.78rem;
  background: var(--success-bg); color: var(--success); border-radius: 6px; display: inline-block;
}
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; }

.state { padding: 40px; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-muted); }
.state--error { color: var(--error); }
.pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); animation: pulse 1.4s infinite; }
.pulse-dot:nth-child(2) { animation-delay: 0.2s; }
.pulse-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }

/* ── Inline save feedback ── */
.save-feedback {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  font-weight: 500;
}
.save-feedback--ok { color: var(--success); }
</style>
