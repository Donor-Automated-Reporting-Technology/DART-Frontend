<template>
  <NuxtLayout
    name="app"
    :breadcrumbs="[
      { title: 'Settings', href: '/settings' },
      { title: 'Projects', href: '/settings/projects', current: true },
    ]"
  >
    <div class="projects-page">
      <!-- Header -->
      <div class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Projects</h1>
            <p class="page-subtitle">Each project has its own framework and activities.</p>
          </div>
          <NuxtLink to="/settings/projects/new" class="btn-primary">
            <AppIcon name="plus" :size="14" />
            New Project
          </NuxtLink>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="state state--loading">
        <div class="pulse-dot" /><div class="pulse-dot" /><div class="pulse-dot" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="state state--error">
        <AppIcon name="alert-circle" :size="18" />
        <span>{{ error }}</span>
      </div>

      <!-- Empty -->
      <div v-else-if="!projects.length" class="empty-state">
        <div class="empty-icon"><AppIcon name="layers" :size="28" /></div>
        <h3 class="empty-title">No projects yet</h3>
        <p class="empty-desc">Create your first project to start configuring activities.</p>
        <NuxtLink to="/settings/projects/new" class="btn-primary">
          <AppIcon name="plus" :size="14" />
          Create Project
        </NuxtLink>
      </div>

      <!-- List -->
      <div v-else class="card-stack">
        <NuxtLink
          v-for="p in projects"
          :key="p.id"
          :to="`/settings/projects/${p.id}`"
          class="project-card"
        >
          <AppIcon :name="frameworkIcon(p.framework_type)" :size="20" class="card-icon" />
          <div class="card-content">
            <h2 class="card-name">{{ p.project_name || 'Untitled project' }}</h2>
            <p class="card-meta">
              <span>{{ formatType(p.framework_type) }}</span>
              <span v-if="p.partner_name"> · {{ p.partner_name }}</span>
              <span v-if="p.period_start"> · {{ formatDate(p.period_start) }} → {{ formatDate(p.period_end) }}</span>
            </p>
          </div>
          <span class="card-arrow"><AppIcon name="chevron-right" :size="15" /></span>
        </NuxtLink>
      </div>
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
const TYPE_ICONS: Record<string, string> = {
  child_protection: 'shield',
  education: 'book-open',
  health: 'heart',
  wash: 'droplet',
  livelihoods: 'briefcase',
}

function formatType(t: string) { return TYPE_LABELS[t] ?? t }
function frameworkIcon(t: string) { return TYPE_ICONS[t] ?? 'layers' }
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
.projects-page { max-width: 800px; padding-bottom: 48px; }

.page-header { margin-bottom: 24px; }
.header-row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
}
.page-title { font-size: 1.35rem; font-weight: 750; margin: 0 0 2px; letter-spacing: -0.02em; }
.page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin: 0; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; font-size: 0.8rem; font-weight: 600;
  background: var(--accent); color: white; border: none; border-radius: 8px;
  cursor: pointer; text-decoration: none;
}

.state { padding: 40px; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-muted); }
.state--error { color: var(--error); }
.pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); animation: pulse 1.4s infinite; }
.pulse-dot:nth-child(2) { animation-delay: 0.2s; }
.pulse-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }

.empty-state {
  text-align: center; padding: 48px 24px;
  background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: 12px;
}
.empty-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--bg-surface); color: var(--text-muted); margin-bottom: 12px;
}
.empty-title { font-size: 1rem; font-weight: 600; margin: 0 0 4px; }
.empty-desc { font-size: 0.82rem; color: var(--text-muted); margin: 0 0 16px; }

.card-stack { display: flex; flex-direction: column; gap: 10px; }
.project-card {
  display: flex; align-items: center; gap: 14px;
  padding: 16px; background: var(--bg-card);
  border: 1px solid var(--border-color); border-radius: 12px;
  text-decoration: none; color: inherit; transition: border-color 0.15s, transform 0.15s;
}
.project-card:hover { border-color: var(--accent); }
.card-icon { color: var(--accent); flex-shrink: 0; }
.card-content { flex: 1; min-width: 0; }
.card-name { font-size: 0.95rem; font-weight: 600; margin: 0; }
.card-meta { font-size: 0.78rem; color: var(--text-muted); margin: 2px 0 0; }
.card-arrow { color: var(--text-muted); }
</style>
