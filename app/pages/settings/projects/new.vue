<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Projects', href: '/settings/projects' },
      { title: 'New', href: '/settings/projects/new', current: true },
    ]"
  >
    <div class="ps-page new-project">
      <header class="page-header">
        <div class="page-header-text">
          <span class="page-eyebrow">Projects</span>
          <h1 class="page-title">New project</h1>
          <p class="page-subtitle">Create a project — you can attach its M&E logframe afterwards.</p>
        </div>
        <NuxtLink to="/settings/projects" class="btn-back">&larr; Back to projects</NuxtLink>
      </header>

      <form class="section-card" novalidate @submit.prevent="submit">
        <div class="card-head">
          <div class="card-head-text">
            <h2 class="card-title">Project details</h2>
            <p class="card-hint">Name the project and set the period it runs for.</p>
          </div>
        </div>

        <div class="field">
          <label class="field-label" for="np-name">Project name *</label>
          <input id="np-name" v-model="form.project_name" type="text" class="field-input" placeholder="e.g. DRA SSJR 2024-2026" :aria-invalid="errorAt('name') ? 'true' : undefined" :aria-describedby="errorAt('name') ? 'np-name-error' : undefined" />
          <FieldError id="np-name-error" :message="errorAt('name')" />
        </div>
        <div class="form-grid">
          <div class="field">
            <label class="field-label" for="np-start">Period start *</label>
            <input id="np-start" v-model="form.period_start" type="date" class="field-input" :aria-invalid="errorAt('start') ? 'true' : undefined" :aria-describedby="errorAt('start') ? 'np-start-error' : undefined" />
            <FieldError id="np-start-error" :message="errorAt('start')" />
          </div>
          <div class="field">
            <label class="field-label" for="np-end">Period end *</label>
            <input id="np-end" v-model="form.period_end" type="date" class="field-input" :aria-invalid="errorAt('end') ? 'true' : undefined" :aria-describedby="errorAt('end') ? 'np-end-error' : undefined" />
            <FieldError id="np-end-error" :message="errorAt('end')" />
          </div>
        </div>

        <p v-if="error && !errorField" class="api-err" role="alert">{{ error }}</p>

        <div class="actions">
          <NuxtLink to="/settings/projects" class="btn-ghost">Cancel</NuxtLink>
          <button type="submit" class="btn-primary" :disabled="saving">
            <span v-if="saving" class="btn-spinner" aria-hidden="true" />
            {{ saving ? 'Creating…' : 'Create project' }}
          </button>
        </div>
      </form>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { frameworkApi } from '../../../services/frameworkApi'
import { ApiError } from '../../../services/api'
import FieldError from '../../../components/interfaces/FieldError.vue'

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
  permission: 'projects.manage',
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

// Show the validation message under the field it is about (display only;
// the checks in the submit handler are unchanged).
const errorField = computed(() => {
  const m = error.value
  if (m === 'Project name is required') return 'name'
  if (m === 'Period start and end are required') return !form.period_start ? 'start' : 'end'
  if (m === 'End date must be after start date') return 'end'
  return ''
})
const errorAt = (field: string) => (errorField.value === field ? error.value : '')
</script>

<style scoped>
/* Shared look comes from assets/css/project-settings.css (.ps-page). */
.new-project { max-width: 720px; }
</style>
