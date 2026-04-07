<template>
  <NuxtLayout name="app" :breadcrumbs="[{ title: 'Activities', href: '/activities', current: true }]">
    <div class="activities-hub">

      <div class="page-header">
        <div>
          <h1 class="page-title">Projects</h1>
          <p class="page-subtitle">Select a project to view its activities</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="hub-loading">
        <div class="spinner" />
        <span>Loading projects...</span>
      </div>

      <!-- Error -->
      <p v-else-if="error" class="hub-error">{{ error }}</p>

      <!-- Project cards -->
      <div v-else-if="frameworks.length" class="cards-grid">
        <NuxtLink
          v-for="fw in frameworks"
          :key="fw.id"
          :to="`/activities/${fw.id}`"
          class="project-card"
        >
          <div class="card-left">
            <AppIcon :name="frameworkIcon(fw.framework_type)" :size="16" class="card-icon" />
            <div class="card-body">
              <h2 class="card-title">{{ fw.project_name }}</h2>
              <span class="card-partner">{{ fw.partner_name }}</span>
            </div>
          </div>
          <div class="card-right">
            <span class="card-type">{{ formatType(fw.framework_type) }}</span>
            <AppIcon name="chevron-right" :size="14" class="card-chevron" />
          </div>
        </NuxtLink>
      </div>

      <!-- Empty -->
      <div v-else class="hub-empty">
        <p class="hub-empty__title">No projects configured</p>
        <p class="hub-empty__text">Ask your admin to set up a framework in Settings.</p>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { frameworkApi } from '../../services/frameworkApi'
import type { Framework } from '../../interfaces/framework'

definePageMeta({ layout: false, middleware: ['auth'] })

const frameworks = ref<Framework[]>([])
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

function formatType(t: string) {
  return TYPE_LABELS[t] ?? t
}

function frameworkIcon(t: string) {
  return TYPE_ICONS[t] ?? 'layers'
}

async function fetchFrameworks() {
  loading.value = true
  error.value = null
  try {
    const res = await frameworkApi.listFrameworks()
    frameworks.value = res.frameworks ?? []
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load projects'
  } finally {
    loading.value = false
  }
}

onMounted(fetchFrameworks)
</script>

<style scoped>
.activities-hub {
  max-width: 680px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 2px;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

/* ── Loading / Error / Empty ─────────────────────────────────────────────── */
.hub-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.hub-error {
  padding: 12px 16px;
  font-size: 0.8rem;
  color: var(--error);
  background: var(--error-bg);
  border-radius: var(--radius-sm);
}

.hub-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 64px 24px;
  text-align: center;
}

.hub-empty__title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.hub-empty__text {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
}

/* ── Cards ───────────────────────────────────────────────────────────────── */
.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.project-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, background 0.15s;
}

.project-card:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 3%, var(--bg-panel));
}

.card-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.card-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.card-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-partner {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.card-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.card-type {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--text-muted);
  padding: 2px 8px;
  border-radius: 100px;
  background: var(--hover-bg);
}

.card-chevron {
  color: var(--text-muted);
  opacity: 0.35;
  transition: opacity 0.15s, transform 0.15s;
}

.project-card:hover .card-chevron {
  opacity: 1;
  color: var(--primary);
  transform: translateX(2px);
}

@media (max-width: 640px) {
  .project-card {
    padding: 12px 14px;
  }

  .card-type {
    display: none;
  }
}
</style>
