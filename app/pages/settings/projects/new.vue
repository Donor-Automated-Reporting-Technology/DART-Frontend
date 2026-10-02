<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Projects', href: '/settings/projects' },
      { title: 'New', href: '/settings/projects/new', current: true },
    ]"
  >
    <div class="new-project">
      <div class="page-header">
        <div>
          <h1 class="page-title">New Project</h1>
          <p class="page-subtitle">Create a project — you can attach its M&E logframe later from the M&E section.</p>
        </div>
        <NuxtLink to="/settings/projects" class="btn-back">
          <AppIcon name="arrow-left" :size="14" /> Back
        </NuxtLink>
      </div>

      <form class="form" @submit.prevent="submit">
        <div class="section-card">
          <div class="form-grid">
            <div class="field">
              <label class="field-label" for="np-name">Project name *</label>
              <input id="np-name" v-model="form.project_name" type="text" class="field-input" placeholder="e.g. DRA SSJR 2024-2026" />
            </div>

            <div class="field">
              <label class="field-label" for="np-start">Period start *</label>
              <input id="np-start" v-model="form.period_start" type="date" class="field-input" />
            </div>

            <div class="field">
              <label class="field-label" for="np-end">Period end *</label>
              <input id="np-end" v-model="form.period_end" type="date" class="field-input" />
            </div>
          </div>
        </div>

        <div v-if="error" class="api-err"><AppIcon name="alert-circle" :size="14" /> {{ error }}</div>

        <div class="actions">
          <NuxtLink to="/settings/projects" class="btn-secondary">Cancel</NuxtLink>
          <button type="submit" class="btn-primary" :disabled="saving">
            <span v-if="saving" class="btn-spinner" />
            {{ saving ? 'Creating…' : 'Create project' }}
          </button>
        </div>
      </form>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { frameworkApi } from '../../../services/frameworkApi'
import { ApiError } from '../../../services/api'

/**
 * A project is created without an M&E framework; the backend still requires a
 * framework_type, so a sensible default is sent and the logframe is attached
 * later from Settings → M&E.
 */
const DEFAULT_FRAMEWORK_TYPE = 'child_protection'

definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'program_manager'],
})

const router = useRouter()

const form = reactive({
  project_name: '',
  period_start: '',
  period_end: '',
})

const saving = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!form.project_name.trim()) { error.value = 'Project name is required'; return }
  if (!form.period_start || !form.period_end) { error.value = 'Period start and end are required'; return }
  if (form.period_end < form.period_start) { error.value = 'End date must be after start date'; return }

  saving.value = true
  try {
    const created: any = await frameworkApi.createFramework({
      framework_type: DEFAULT_FRAMEWORK_TYPE,
      project_name: form.project_name.trim(),
      period_start: form.period_start,
      period_end: form.period_end,
    })
    const id = created?.framework?.id ?? created?.id
    if (id) router.push(`/settings/projects/${id}`)
    else router.push('/settings/projects')
  } catch (e: any) {
    error.value = e instanceof ApiError ? e.message : (e?.message ?? 'Failed to create project')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.new-project { max-width: 720px; padding-bottom: 48px; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  margin-bottom: 24px;
}
.page-title { font-size: 1.35rem; font-weight: 750; margin: 0 0 2px; }
.page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin: 0; }

.btn-back {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.8rem; color: var(--text-muted); text-decoration: none;
  padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 8px;
}

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
.field-hint { font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }

.api-err {
  display: flex; align-items: center; gap: 6px; margin-top: 16px;
  padding: 10px 12px; font-size: 0.82rem; color: var(--error);
  background: var(--error-bg); border-radius: 6px;
}

.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }

.btn-primary, .btn-secondary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; font-size: 0.82rem; font-weight: 600;
  border-radius: 8px; cursor: pointer; text-decoration: none; border: none;
}
.btn-primary { background: var(--accent); color: white; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: transparent; color: var(--text-primary); border: 1px solid var(--border-color);
}
.btn-spinner {
  width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
