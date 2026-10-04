<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Projects', href: '/settings/projects', current: true },
    ]"
  >
    <div class="ps-page projects-page">
      <!-- Header -->
      <header class="page-header">
        <div class="page-header-text">
          <span class="page-eyebrow">Settings</span>
          <h1 class="page-title">Projects</h1>
          <p class="page-subtitle">Each project has its own M&E logframe. Activities and targets are managed in M&E.</p>
        </div>
        <NuxtLink to="/settings/projects/new" class="btn-primary">+ New project</NuxtLink>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="state state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="state state--error">{{ error }}</div>

      <!-- Empty -->
      <section v-else-if="!projects.length" class="section-card empty-card">
        <h2 class="card-title">No projects yet</h2>
        <p class="card-hint">Create your first project to start setting up its M&E logframe.</p>
        <NuxtLink to="/settings/projects/new" class="btn-primary">+ Create project</NuxtLink>
      </section>

      <!-- List -->
      <section v-else class="section-card">
        <div class="card-head">
          <div class="card-head-text">
            <h2 class="card-title">All projects</h2>
            <p class="card-hint">{{ projects.length }} project{{ projects.length === 1 ? '' : 's' }}</p>
          </div>
        </div>
        <div class="list">
          <NuxtLink
            v-for="p in projects"
            :key="p.id"
            :to="`/settings/projects/${p.id}`"
            class="list-row"
          >
            <span class="list-row-body">
              <span class="list-row-title">{{ p.project_name || 'Untitled project' }}</span>
              <span class="list-row-meta">
                {{ formatType(p.framework_type) }}<template v-if="p.partner_name"> · {{ p.partner_name }}</template><template v-if="p.period_start"> · {{ formatDate(p.period_start) }} – {{ formatDate(p.period_end) }}</template>
              </span>
            </span>
            <span class="list-row-go">Open →</span>
          </NuxtLink>
        </div>
      </section>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { frameworkApi } from '../../../services/frameworkApi'
import type { Framework } from '../../../interfaces/framework'

definePageMeta({
  layout: false,
  middleware: ['auth', 'role-guard'],
  allowedRoles: ['org_admin', 'program_manager'],
})

const projects = ref<Framework[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const TYPE_LABELS: Record<string, string> = {
  child_protection: 'Child Protection',
  education: 'Education',
  health: 'Health',
  wash: 'WASH',
  livelihoods: 'Livelihoods',
}

function formatType(t: string) { return TYPE_LABELS[t] ?? t }
function formatDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function fetchProjects() {
  loading.value = true
  error.value = null
  try {
    const res = await frameworkApi.listFrameworks()
    projects.value = res.frameworks ?? []
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load projects'
  } finally {
    loading.value = false
  }
}

onMounted(fetchProjects)
</script>

<style scoped>
/* Shared look comes from assets/css/project-settings.css (.ps-page). */
.projects-page { max-width: 820px; }
.empty-card { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
</style>
