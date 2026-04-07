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
          <div class="card-icon" :class="`card-icon--${fw.framework_type}`">
            <AppIcon :name="frameworkIcon(fw.framework_type)" :size="20" />
          </div>
          <div class="card-body">
            <h2 class="card-title">{{ fw.project_name }}</h2>
            <p class="card-desc">{{ fw.partner_name }}</p>
          </div>
          <div class="card-meta">
            <span class="card-type-tag">{{ formatType(fw.framework_type) }}</span>
            <span v-if="fw.is_active" class="card-status card-status--active">Active</span>
            <span v-else class="card-status card-status--inactive">Inactive</span>
          </div>
          <span class="card-arrow">
            <AppIcon name="chevron-right" :size="15" />
          </span>
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
  max-width: 800px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 750;
  color: var(--text-primary);
  margin: 0 0 2px;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 0.8rem;
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
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.hub-empty__text {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
}

/* ── Cards Grid ──────────────────────────────────────────────────────────── */
.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}

.project-card:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 3%, var(--bg-panel));
}

.project-card:active {
  transform: scale(0.995);
}

/* ── Card Icon ───────────────────────────────────────────────────────────── */
.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.project-card:hover .card-icon {
  transform: scale(1.04);
}

.card-icon--child_protection {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}

.card-icon--education {
  background: color-mix(in srgb, var(--success) 10%, transparent);
  color: var(--success);
}

.card-icon--health {
  background: color-mix(in srgb, var(--error) 10%, transparent);
  color: var(--error);
}

.card-icon--wash {
  background: color-mix(in srgb, #0ea5e9 10%, transparent);
  color: #0ea5e9;
}

.card-icon--livelihoods {
  background: color-mix(in srgb, #f59e0b 10%, transparent);
  color: #f59e0b;
}

/* ── Card Body ───────────────────────────────────────────────────────────── */
.card-body {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 3px;
}

.card-desc {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

/* ── Card Meta ───────────────────────────────────────────────────────────── */
.card-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.card-type-tag {
  font-size: 0.68rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 100px;
  background: var(--hover-bg);
  color: var(--text-secondary);
}

.card-status {
  font-size: 0.68rem;
  font-weight: 600;
}

.card-status--active {
  color: var(--success);
}

.card-status--inactive {
  color: var(--text-muted);
}

/* ── Card Arrow ──────────────────────────────────────────────────────────── */
.card-arrow {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0.4;
  transition: opacity 0.15s, transform 0.15s;
}

.project-card:hover .card-arrow {
  opacity: 1;
  color: var(--primary);
  transform: translateX(2px);
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .project-card {
    padding: 16px;
    gap: 12px;
  }

  .card-icon {
    width: 40px;
    height: 40px;
  }

  .card-meta {
    display: none;
  }
}
</style>
