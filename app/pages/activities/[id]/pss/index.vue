<!--
  PSS module landing — DART-36 hub.

  Mirrors the canonical settings/organization.vue page pattern:
    • page-header (title + subtitle + back button)
    • form-section + section-card content blocks

  Sourced AC: DART/PSS_MODULE_PRD.md §4 (PSS as parent module).
  UX ref: Dart-docs/design-system/DART_UX_REFERENCE.md.
-->
<template>
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">
    <div class="pss-hub">

      <!-- ═══ Page Header ═══ -->
      <div class="page-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Structured PSS Activities</h1>
            <p class="page-subtitle">
              Plan and run UNICEF psychosocial support sessions in your CFS.
            </p>
          </div>
          <NuxtLink :to="`/activities/${frameworkId}`" class="btn-back">
            <AppIcon name="arrow-left" :size="14" />
            <span class="btn-text">Project</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="skeleton-field" />
        <div class="skeleton-field" />
      </div>

      <!-- Not allowed (non-CP framework) -->
      <div v-else-if="notAllowed" class="api-err">
        <AppIcon name="alert-circle" :size="14" />
        PSS is only available for Child Protection projects.
      </div>

      <template v-else>
        <!-- ═══ Modules ═══ -->
        <div class="form-section">
          <div class="section-label">Modules</div>
          <div class="tile-grid">
            <NuxtLink
              :to="`/activities/${frameworkId}/pss/schedules`"
              class="tile tile--active"
            >
              <span class="tile-icon">
                <AppIcon name="calendar" :size="18" />
              </span>
              <span class="tile-body">
                <span class="tile-title">Schedules</span>
                <span class="tile-sub">
                  Build weekly schedules per CFS location and age group.
                </span>
              </span>
              <span class="tile-pill tile-pill--active">Open</span>
            </NuxtLink>

            <div class="tile tile--coming">
              <span class="tile-icon">
                <AppIcon name="book-open" :size="18" />
              </span>
              <span class="tile-body">
                <span class="tile-title">Activity Library</span>
                <span class="tile-sub">
                  Browse the 69 built-in PSS sub-activities and your custom ones.
                </span>
              </span>
              <span class="tile-pill">Coming soon</span>
            </div>

            <NuxtLink
              class="tile tile--link"
              :to="`/activities/${frameworkId}/pss/today`"
            >
              <span class="tile-icon">
                <AppIcon name="check-square" :size="18" />
              </span>
              <span class="tile-body">
                <span class="tile-title">Today's Sessions</span>
                <span class="tile-sub">
                  Run today's scheduled PSS sub-activities and mark delivery.
                </span>
              </span>
              <span class="tile-pill tile-pill--ready">Open</span>
            </NuxtLink>

            <div class="tile tile--coming">
              <span class="tile-icon">
                <AppIcon name="bar-chart-2" :size="18" />
              </span>
              <span class="tile-body">
                <span class="tile-title">Reports</span>
                <span class="tile-sub">
                  Coverage and delivery analytics for PSS programmes.
                </span>
              </span>
              <span class="tile-pill">Coming soon</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { frameworkApi } from '../../../../services/frameworkApi'

definePageMeta({ layout: false, middleware: ['auth'] })

const route = useRoute()
const frameworkId = route.params.id as string

const loading = ref(true)
const notAllowed = ref(false)

const breadcrumbs = computed(() => [
  { title: 'Projects', href: '/activities' },
  { title: 'Project', href: `/activities/${frameworkId}` },
  { title: 'PSS', href: `/activities/${frameworkId}/pss`, current: true },
])

onMounted(async () => {
  try {
    const res = await frameworkApi.listFrameworks()
    const fw = (res.frameworks ?? []).find((f: any) => f.id === frameworkId)
    notAllowed.value = !fw || fw.framework_type !== 'child_protection'
  } catch {
    notAllowed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.pss-hub {
  max-width: 720px;
}

/* ═══ Page Header (mirror settings/organization.vue) ═══ */
.page-header { margin-bottom: 24px; }
.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
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
.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
  min-height: 36px;
}
.btn-back:hover { border-color: var(--text-muted); color: var(--text-primary); }

/* ═══ Loading skeleton ═══ */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.skeleton-field {
  height: 72px;
  background: var(--bg-card);
  border-radius: 10px;
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.3; }
}

/* ═══ Section ═══ */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section-label {
  font-size: 0.72rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding-left: 2px;
}

/* ═══ Tiles ═══ */
.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}
.tile {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  text-decoration: none;
  color: var(--text-primary);
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}
.tile--active { cursor: pointer; }
.tile--active:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 4%, var(--bg-panel));
}
.tile--active:active { transform: scale(0.995); }
.tile--active:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.tile--coming { opacity: 0.65; }

.tile-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--bg-input);
  color: var(--text-secondary);
  flex-shrink: 0;
}
.tile--active .tile-icon {
  background: var(--primary-dim);
  color: var(--primary);
}

.tile-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}
.tile-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.tile-sub {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.tile-pill {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 0.62rem;
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--bg-input);
  color: var(--text-muted);
}
.tile-pill--active {
  background: var(--primary-dim);
  color: var(--primary);
}
.tile--link {
  text-decoration: none;
  color: inherit;
  transition: transform 120ms ease, border-color 120ms ease;
}
.tile--link:hover {
  border-color: var(--accent, #4f46e5);
  transform: translateY(-1px);
}
.tile-pill--ready {
  background: rgba(79, 70, 229, 0.12);
  color: var(--accent, #4f46e5);
}

/* ═══ API error (mirror canonical) ═══ */
.api-err {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--error);
  padding: 10px 14px;
  background: var(--error-bg);
  border: 1px solid rgba(248, 113, 113, 0.12);
  border-radius: 8px;
}

/* ═══ Responsive ═══ */
@media (max-width: 640px) {
  .header-row { flex-direction: column; gap: 10px; }
  .btn-text { display: none; }
  .tile { padding: 14px; }
  .tile-pill { top: 10px; right: 10px; }
}
</style>
