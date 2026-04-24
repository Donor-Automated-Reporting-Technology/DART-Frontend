<template>
  <div class="org-overview">

    <!-- Breadcrumb + project nav -->
    <div class="breadcrumb-row">
      <DashboardBreadcrumb :crumbs="breadcrumbs" />
      <div v-if="sortedProjects.length" class="project-nav" ref="projectNavRef">
        <button class="project-nav-btn" @click="projectNavOpen = !projectNavOpen">
          <AppIcon name="folder" :size="14" />
          <span>Go to project</span>
          <AppIcon :name="projectNavOpen ? 'chevron-up' : 'chevron-down'" :size="12" />
        </button>
        <Transition name="dropdown">
          <div v-if="projectNavOpen" class="project-nav-dropdown">
            <button
              v-for="p in sortedProjects"
              :key="p.id"
              class="project-nav-item"
              @click="navigateToProject(p.id); projectNavOpen = false"
            >
              <span class="project-nav-item-name">{{ p.project_name }}</span>
              <span class="project-nav-item-type">{{ formatType(p.framework_type) }}</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="loading-skeleton">
      <div class="skeleton-grid">
        <div v-for="n in 6" :key="n" class="skeleton-card"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="dash-error">
      <AppIcon name="alert-circle" :size="20" />
      <span>{{ error }}</span>
      <button class="btn-retry" @click="fetchDashboard">Retry</button>
    </div>

    <!-- Empty state -->
    <div v-else-if="!hasData" class="empty-state">
      <div class="empty-icon">
        <AppIcon name="layout" :size="32" />
      </div>
      <h2 class="empty-title">Welcome to DART</h2>
      <p class="empty-sub">Complete these steps to start tracking your programme.</p>
      <div class="checklist">
        <NuxtLink to="/settings/projects" class="check-item">
          <span class="check-dot" />
          <span>Create a project &amp; configure activities</span>
        </NuxtLink>
        <NuxtLink to="/settings/locations" class="check-item">
          <span class="check-dot" />
          <span>Set up locations &amp; service points</span>
        </NuxtLink>
        <NuxtLink to="/beneficiaries/register" class="check-item">
          <span class="check-dot" />
          <span>Register your first beneficiary</span>
        </NuxtLink>
      </div>
    </div>

    <!-- ═══════ LIVE DASHBOARD ═══════ -->
    <template v-else>

      <!-- ═══════ FACILITATOR VIEW ═══════ -->
      <div v-if="isFacilitatorView" class="facilitator-dashboard">
        <div class="fac-body">

          <!-- ── LEFT: Main content ──────────────────────── -->
          <div class="fac-main">

            <!-- Location header card -->
            <div class="fac-header-card" v-if="locations.length">
              <div class="fac-header-top">
                <div class="fac-header-info">
                  <span class="fac-header-badge">YOUR LOCATION</span>
                  <h2 class="fac-header-name">{{ locations[0].name }}</h2>
                  <div class="fac-header-chips">
                    <span class="chip">{{ demographics.total_beneficiaries }} beneficiaries</span>
                    <span class="chip">{{ recentSessions.length }} recent sessions</span>
                  </div>
                </div>
                <div class="fac-header-ring">
                  <span class="fac-header-ring-num">{{ demographics.total_beneficiaries }}</span>
                  <span class="fac-header-ring-label">Total</span>
                </div>
              </div>
            </div>

            <!-- Demographic cards -->
            <div class="fac-demo-grid">
              <div class="fac-demo-card fac-demo-card--teal">
                <span class="fac-demo-value">{{ demographics.girls_women }}</span>
                <span class="fac-demo-label">Girls / Women</span>
              </div>
              <div class="fac-demo-card fac-demo-card--purple">
                <span class="fac-demo-value">{{ demographics.boys_men }}</span>
                <span class="fac-demo-label">Boys / Men</span>
              </div>
              <div class="fac-demo-card fac-demo-card--warn">
                <span class="fac-demo-value">{{ demographics.with_disability }}</span>
                <span class="fac-demo-label">With Disability</span>
              </div>
            </div>

            <!-- Recent sessions -->
            <div v-if="recentSessions.length" class="fac-sessions-section">
              <div class="section-header">
                <div class="section-header-left">
                  <h3 class="section-title">Recent Sessions</h3>
                  <span class="section-count">{{ recentSessions.length }}</span>
                </div>
              </div>
              <div class="fac-sessions-table-wrap">
                <table class="fac-sessions-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Activity</th>
                      <th>Present</th>
                      <th>Total</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in recentSessions" :key="s.id">
                      <td class="td-date">{{ formatDate(s.session_date) }}</td>
                      <td class="td-name">{{ formatActivityName(s.activity_name) }}</td>
                      <td>{{ s.present_count }}</td>
                      <td>{{ s.total_count }}</td>
                      <td :class="barColor(s.total_count ? Math.round((s.present_count / s.total_count) * 100) : 0)">
                        {{ s.total_count ? Math.round((s.present_count / s.total_count) * 100) : 0 }}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ── RIGHT: Sidebar ──────────────────────────── -->
          <aside class="fac-sidebar">

            <!-- Activity Summary -->
            <div class="fac-insight-card">
              <h4 class="fac-insight-title">Activity Summary</h4>
              <div class="fac-insight-list">
                <div
                  v-for="act in activitySummary"
                  :key="act.code"
                  class="fac-insight-row"
                >
                  <div class="fac-insight-row-top">
                    <span class="fac-insight-value">{{ act.actual }}</span>
                  </div>
                  <span class="fac-insight-label">{{ act.name }}</span>
                </div>
              </div>
            </div>

            <!-- Demographic Snapshot -->
            <div class="fac-insight-card fac-insight-card--highlight">
              <h4 class="fac-insight-title">Demographic Breakdown</h4>
              <div class="fac-insight-hero">
                <span class="fac-insight-hero-num">{{ demographics.total_beneficiaries }}</span>
                <span class="fac-insight-hero-label">Total Registered</span>
              </div>
              <div class="fac-insight-breakdown">
                <div class="fac-insight-break-row">
                  <div class="fac-insight-break-top">
                    <span class="fac-insight-break-val">{{ demographics.girls_women }}</span>
                    <span class="fac-insight-break-pct">{{ demographics.total_beneficiaries ? Math.round((demographics.girls_women / demographics.total_beneficiaries) * 100) : 0 }}%</span>
                  </div>
                  <span class="fac-insight-break-label">Girls &amp; Women</span>
                  <div class="fac-insight-bar">
                    <div class="fac-insight-bar-fill" :style="{ width: (demographics.total_beneficiaries ? Math.round((demographics.girls_women / demographics.total_beneficiaries) * 100) : 0) + '%' }"></div>
                  </div>
                </div>
                <div class="fac-insight-break-row">
                  <div class="fac-insight-break-top">
                    <span class="fac-insight-break-val">{{ demographics.boys_men }}</span>
                    <span class="fac-insight-break-pct">{{ demographics.total_beneficiaries ? Math.round((demographics.boys_men / demographics.total_beneficiaries) * 100) : 0 }}%</span>
                  </div>
                  <span class="fac-insight-break-label">Boys &amp; Men</span>
                  <div class="fac-insight-bar">
                    <div class="fac-insight-bar-fill fac-insight-bar-fill--alt" :style="{ width: (demographics.total_beneficiaries ? Math.round((demographics.boys_men / demographics.total_beneficiaries) * 100) : 0) + '%' }"></div>
                  </div>
                </div>
                <div class="fac-insight-break-row">
                  <div class="fac-insight-break-top">
                    <span class="fac-insight-break-val">{{ demographics.with_disability }}</span>
                    <span class="fac-insight-break-pct">{{ demographics.total_beneficiaries ? Math.round((demographics.with_disability / demographics.total_beneficiaries) * 100) : 0 }}%</span>
                  </div>
                  <span class="fac-insight-break-label">With Disability</span>
                  <div class="fac-insight-bar">
                    <div class="fac-insight-bar-fill fac-insight-bar-fill--warn" :style="{ width: (demographics.total_beneficiaries ? Math.round((demographics.with_disability / demographics.total_beneficiaries) * 100) : 0) + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>

          </aside>

        </div>
      </div>

      <!-- ═══════ ADMIN / PM VIEW ═══════ -->
      <div v-else class="dashboard-body">

        <!-- ── CENTER COLUMN ────────────────────────────── -->
        <div class="dashboard-center">

          <!-- Bento metrics grid -->
          <div class="bento-grid">

            <!-- Hero: Total Beneficiaries -->
            <div v-if="hasOrgSummary" class="bento-item bento-hero metric-card hero-modern">
              <div class="hero-top">
                <div class="hero-icon-wrap">
                  <AppIcon name="users" :size="20" />
                </div>
                <span class="hero-badge">Organisation</span>
              </div>
              <div class="metric-primary">
                <span class="metric-big">{{ orgSummary.total_unique_beneficiaries }}</span>
                <span class="metric-label">Total Unique Beneficiaries</span>
              </div>
              <div class="metric-splits-modern">
                <div class="split-card split-card--girls">
                  <div class="split-card-dot"></div>
                  <span class="split-card-value">{{ orgSummary.target_breakdown.girls }}</span>
                  <span class="split-card-label">Girls Target</span>
                </div>
                <div class="split-card split-card--boys">
                  <div class="split-card-dot split-card-dot--alt"></div>
                  <span class="split-card-value">{{ orgSummary.target_breakdown.boys }}</span>
                  <span class="split-card-label">Boys Target</span>
                </div>
                <div class="split-card split-card--disability">
                  <div class="split-card-dot split-card-dot--muted"></div>
                  <span class="split-card-value">{{ orgSummary.target_breakdown.girls_with_disability + orgSummary.target_breakdown.boys_with_disability }}</span>
                  <span class="split-card-label">With Disability</span>
                </div>
              </div>
            </div>

            <!-- Beneficiary Reach progress cards -->
            <div
              v-for="metric in reachMetrics"
              :key="metric.code"
              class="bento-item metric-card metric-card--activity"
            >
              <div class="metric-card-head">
                <span class="metric-label">{{ metric.name }}</span>
                <span class="metric-pct-pill">{{ metric.percentage }}%</span>
              </div>
              <div class="metric-target-row">
                <div class="metric-target-block">
                  <span class="target-number">{{ metric.actual }}</span>
                  <span class="target-caption">Actual</span>
                </div>
                <span class="target-slash">/</span>
                <div class="metric-target-block">
                  <span class="target-number target-number--muted">{{ metric.target }}</span>
                  <span class="target-caption">Target</span>
                </div>
              </div>
              <div class="metric-bar">
                <div class="metric-bar-fill" :style="{ width: Math.min(metric.percentage, 100) + '%' }"></div>
              </div>
            </div>

            <!-- Summary cards -->
            <div v-if="hasOrgSummary" class="bento-item metric-card metric-card--compact">
              <span class="compact-value">{{ orgSummary.total_projects }}</span>
              <span class="compact-label">Projects</span>
              <span class="compact-sub">Total configured</span>
            </div>
            <div v-if="hasOrgSummary" class="bento-item metric-card metric-card--compact">
              <span class="compact-value">{{ totalActivities }}</span>
              <span class="compact-label">Activities</span>
              <span class="compact-sub">Across all projects</span>
            </div>
          </div>

          <!-- Projects -->
          <div class="projects-section">
            <div class="section-header">
              <div class="section-header-left">
                <h3 class="section-title">Projects</h3>
                <span class="section-count">{{ sortedProjects.length }}</span>
              </div>
              <span class="section-hint">
                <AppIcon name="mouse-pointer" :size="12" />
                Click to explore
              </span>
            </div>

            <div v-if="sortedProjects.length === 0" class="section-empty">
              No projects configured yet.
            </div>

            <div v-else class="project-grid">
              <div
                v-for="p in sortedProjects"
                :key="p.id"
                class="project-card"
                :class="{ 'project-card--inactive': !p.is_active }"
                @click="navigateToProject(p.id)"
              >
                <!-- Card header: title + arrow -->
                <div class="project-card-top">
                  <div class="project-card-title-block">
                    <span class="project-card-name">{{ p.project_name }}</span>
                    <span class="project-card-partner">{{ p.partner_name }}</span>
                  </div>
                  <AppIcon name="chevron-right" :size="16" class="project-arrow" />
                </div>

                <!-- Metadata chips -->
                <div class="project-chips">
                  <span class="chip">
                    <AppIcon name="layers" :size="12" />
                    {{ formatType(p.framework_type) }}
                  </span>
                  <span class="chip">
                    <AppIcon name="calendar" :size="12" />
                    {{ formatDate(p.period_start) }} — {{ formatDate(p.period_end) }}
                  </span>
                  <span v-if="!p.is_active" class="chip chip--warn">Inactive</span>
                </div>

                <!-- Stats row -->
                <div class="project-stats">
                  <div class="project-stat">
                    <span class="project-stat-value">{{ p.active_activities }}</span>
                    <span class="project-stat-label">Activities</span>
                  </div>
                  <div class="project-stat-divider"></div>
                  <div class="project-stat">
                    <span class="project-stat-value">{{ p.total_beneficiaries }}</span>
                    <span class="project-stat-label">Beneficiaries</span>
                  </div>
                  <div class="project-stat-divider"></div>
                  <div class="project-stat">
                    <span class="project-stat-value">{{ p.overall_target }}</span>
                    <span class="project-stat-label">Target</span>
                  </div>
                </div>

                <!-- Progress bar -->
                <div class="project-progress">
                  <div class="project-progress-header">
                    <span class="project-progress-label">Progress</span>
                    <span class="project-progress-pct" :class="barColor(p.overall_progress)">{{ p.overall_progress }}%</span>
                  </div>
                  <div class="project-progress-track">
                    <div
                      class="project-progress-fill"
                      :class="barColor(p.overall_progress)"
                      :style="{ width: Math.min(p.overall_progress, 100) + '%' }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── RIGHT COLUMN: Insights ────────────────────── -->
        <aside v-if="hasOrgSummary" class="dashboard-insights">

          <!-- Beneficiary Snapshot -->
          <div class="insight-card">
            <h4 class="insight-title">Beneficiary Snapshot</h4>
            <div class="insight-hero">
              <span class="insight-hero-num">{{ orgSummary.total_unique_beneficiaries }}</span>
              <span class="insight-hero-label">Total Registered</span>
            </div>
            <div class="insight-breakdown">
              <div class="insight-row-item">
                <div class="insight-row-top">
                  <span class="insight-value">{{ beneficiaryReach.girls_women.actual }}</span>
                  <span class="insight-pct">{{ beneficiaryReach.girls_women.percentage }}%</span>
                </div>
                <span class="insight-label">Girls &amp; Women</span>
                <div class="insight-bar">
                  <div class="insight-bar-fill" :style="{ width: Math.min(beneficiaryReach.girls_women.percentage, 100) + '%' }"></div>
                </div>
              </div>
              <div class="insight-row-item">
                <div class="insight-row-top">
                  <span class="insight-value">{{ beneficiaryReach.boys_men.actual }}</span>
                  <span class="insight-pct">{{ beneficiaryReach.boys_men.percentage }}%</span>
                </div>
                <span class="insight-label">Boys &amp; Men</span>
                <div class="insight-bar">
                  <div class="insight-bar-fill insight-bar-fill--alt" :style="{ width: Math.min(beneficiaryReach.boys_men.percentage, 100) + '%' }"></div>
                </div>
              </div>
              <div class="insight-row-item">
                <div class="insight-row-top">
                  <span class="insight-value">{{ beneficiaryReach.with_disability.actual }}</span>
                  <span class="insight-pct">{{ beneficiaryReach.with_disability.percentage }}%</span>
                </div>
                <span class="insight-label">With Disability</span>
                <div class="insight-bar">
                  <div class="insight-bar-fill insight-bar-fill--warn" :style="{ width: Math.min(beneficiaryReach.with_disability.percentage, 100) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Overall Target Progress -->
          <div class="insight-card insight-card--highlight">
            <h4 class="insight-title">Overall Progress</h4>
            <div class="overall-block">
              <div class="overall-ring">
                <svg viewBox="0 0 36 36" class="ring-svg">
                  <path
                    class="ring-bg"
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke-width="3"
                  />
                  <path
                    class="ring-fill"
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke-width="3"
                    :stroke-dasharray="overallPct + ', 100'"
                  />
                </svg>
                <span class="ring-label">{{ overallPct }}%</span>
              </div>
              <span class="overall-sub">{{ orgSummary.total_unique_beneficiaries }} of {{ orgSummary.overall_target }} target beneficiaries</span>
            </div>
          </div>

        </aside>

      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboard } from '../../composables/useDashboard'
import DashboardBreadcrumb from '../../components/dashboard/DashboardBreadcrumb.vue'
import AppIcon from '../../components/interfaces/AppIcon.vue'

const router = useRouter()

const projectNavOpen = ref(false)
const projectNavRef = ref<HTMLElement | null>(null)

function onClickOutside(e: MouseEvent) {
  if (projectNavRef.value && !projectNavRef.value.contains(e.target as Node)) {
    projectNavOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

const {
  isLoading,
  error,
  orgSummary,
  projects,
  beneficiaryReach,
  hasData,
  hasOrgSummary,
  isFacilitatorView,
  demographics,
  activitySummary,
  locations,
  recentSessions,
  sortedProjects,
  formatDate,
  fetchDashboard,
} = useDashboard()

const breadcrumbs = computed(() => [
  { title: isFacilitatorView.value ? (locations.value[0]?.name || 'My Location') : 'Organisation', href: '/dashboard', current: true },
])

const totalActivities = computed(() =>
  sortedProjects.value.reduce((sum, p) => sum + (p.active_activities || 0), 0),
)

const reachMetrics = computed(() => {
  const r = beneficiaryReach.value
  return [
    { code: 'total', name: 'Total Reach', ...r.total },
    { code: 'girls', name: 'Girls & Women', ...r.girls_women },
    { code: 'boys', name: 'Boys & Men', ...r.boys_men },
    { code: 'disability', name: 'With Disability', ...r.with_disability },
  ]
})

const overallPct = computed(() => {
  if (!orgSummary.value.overall_target) return 0
  return Math.min(
    Math.round((orgSummary.value.total_unique_beneficiaries / orgSummary.value.overall_target) * 100),
    100,
  )
})

function formatType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatActivityName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function barColor(pct: number): string {
  if (pct >= 80) return 'clr-green'
  if (pct >= 50) return 'clr-yellow'
  return 'clr-red'
}

function navigateToProject(id: string) {
  router.push(`/dashboard/projects/${id}`)
}

onMounted(fetchDashboard)
</script>

<style scoped>
/* ── Breadcrumb row ────────────────────────────────── */
.breadcrumb-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}
.breadcrumb-row .dash-breadcrumb { margin-bottom: 0; }
.breadcrumb-row :deep(.dash-breadcrumb) { margin-bottom: 0; }

.project-nav { position: relative; }
.project-nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-input, rgba(0,0,0,0.02));
  border: 1px solid var(--border-subtle, rgba(0,0,0,0.06));
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.project-nav-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-dim);
}

.project-nav-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 260px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 12px);
  box-shadow: var(--shadow-elevated, 0 8px 24px rgba(0,0,0,0.15));
  z-index: 50;
  padding: 4px;
}
.project-nav-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: none;
  border-radius: var(--radius-sm, 8px);
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}
.project-nav-item:hover { background: var(--hover-bg); }
.project-nav-item-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
}
.project-nav-item-type {
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Loading skeleton ──────────────────────────────── */
.loading-skeleton { animation: fadeIn 0.3s ease; }
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.skeleton-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  height: 140px;
  animation: pulse 1.5s ease infinite;
}

/* ── Error ───────────────────────────────────────── */
.dash-error {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--error-bg);
  border: 1px solid rgba(255, 59, 48, 0.12);
  border-radius: var(--radius-md);
  color: var(--error);
  font-size: 0.85rem;
}
.btn-retry {
  margin-left: auto;
  padding: 0.4rem 1rem;
  border: 1px solid var(--error);
  background: transparent;
  color: var(--error);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-retry:hover { background: var(--error-bg); }

/* ── Empty state ─────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
}
.empty-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--primary-dim);
  color: var(--primary);
  margin-bottom: 16px;
}
.empty-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.empty-sub { font-size: 0.85rem; color: var(--text-muted); margin: 0 0 24px; }
.checklist {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 360px;
}
.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  transition: border-color 0.15s, background 0.15s;
}
.check-item:hover { border-color: var(--primary); background: var(--primary-dim); text-decoration: none; }
.check-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  flex-shrink: 0;
}

/* ═══ Dashboard body layout ═══════════════════════ */
.dashboard-body {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 28px;
  align-items: start;
}
@media (max-width: 1100px) {
  .dashboard-body { grid-template-columns: 1fr; }
}

.dashboard-center {
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-width: 0;
}

/* ── Bento Grid ──────────────────────────────────── */
.bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  animation: fadeIn 0.35s ease-out;
}
.bento-item { min-width: 0; }
.bento-hero { grid-column: 1 / -1; }
@media (max-width: 640px) {
  .bento-grid { grid-template-columns: 1fr; }
  .bento-hero { grid-column: auto; }
}

/* ── Metric cards ────────────────────────────────── */
.metric-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color, #E5E5EA);
  border-radius: var(--radius-lg, 20px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s, transform 0.2s;
}
.metric-card:hover {
  box-shadow: var(--shadow-elevated);
  transform: translateY(-1px);
}

.hero-modern {
  background: var(--bg-card);
  position: relative;
  overflow: hidden;
}
.hero-modern::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, var(--data-teal-dim) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.hero-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--data-teal-dim);
  color: var(--data-teal);
}
.hero-badge {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted, #AEAEB2);
  background: var(--hover-bg, rgba(0,0,0,0.03));
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.02em;
}
.metric-primary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 22px;
}
.metric-big {
  font-size: 2.8rem;
  font-weight: 800;
  color: var(--text-primary, #1D1D1F);
  line-height: 1;
  letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
}
.metric-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-secondary, #86868B);
}

.metric-splits-modern {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.split-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 12px;
  background: var(--bg-input, rgba(0,0,0,0.02));
  border-radius: var(--radius-md, 16px);
  transition: background 0.15s;
}
.split-card:hover { background: var(--hover-bg); }
.split-card-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--data-teal);
  margin-bottom: 2px;
}
.split-card-dot--alt { background: var(--data-purple); }
.split-card-dot--muted { background: var(--warning); }
.split-card-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary, #1D1D1F);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.split-card--girls .split-card-value { color: var(--data-teal); }
.split-card--boys .split-card-value { color: var(--data-purple); }
.split-card--disability .split-card-value { color: var(--warning); }

[data-theme="light"] .split-card--girls { background: var(--data-teal-dim); }
[data-theme="light"] .split-card--boys { background: var(--data-purple-dim); }
[data-theme="light"] .split-card--disability { background: rgba(255, 149, 0, 0.08); }
.split-card-label {
  font-size: 0.68rem;
  color: var(--text-muted, #AEAEB2);
  font-weight: 500;
}
@media (max-width: 480px) {
  .metric-splits-modern { grid-template-columns: 1fr; }
}

/* Activity / reach cards */
.metric-card--activity { gap: 14px; }
.metric-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.metric-pct-pill {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-primary);
  background: var(--hover-bg);
  padding: 3px 10px;
  border-radius: 20px;
  font-variant-numeric: tabular-nums;
}
.metric-target-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: 1;
}
.metric-target-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.target-number {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
}
.target-number--muted { color: var(--text-muted, #AEAEB2); }
.target-caption {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--text-muted, #AEAEB2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.target-slash {
  font-size: 1.4rem;
  font-weight: 300;
  color: var(--text-muted, #AEAEB2);
  line-height: 1;
  margin-bottom: 14px;
}
.metric-bar {
  height: 5px;
  background: var(--hover-bg, rgba(0,0,0,0.03));
  border-radius: 3px;
  overflow: hidden;
}
.metric-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--data-teal);
  opacity: 0.55;
  transition: width 0.5s ease;
}

/* Compact summary cards */
.metric-card--compact {
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
  padding: 28px 24px;
}
.compact-value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary, #1D1D1F);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.compact-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary, #1D1D1F);
}
.compact-sub {
  font-size: 0.72rem;
  color: var(--text-muted, #AEAEB2);
}

/* ── Section header ───────────────────────────────── */
.projects-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.section-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.section-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.section-count {
  font-size: 0.7rem;
  color: var(--text-muted);
  background: var(--hover-bg);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.section-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 500;
}
.section-empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
}

/* ── Project grid ────────────────────────────────── */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}
@media (max-width: 480px) {
  .project-grid { grid-template-columns: 1fr; }
}

/* ── Project card ────────────────────────────────── */
.project-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  cursor: pointer;
  position: relative;
  box-shadow: var(--shadow-card);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.2s ease;
}
.project-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  border: 1.5px solid transparent;
  pointer-events: none;
  transition: border-color 0.2s ease;
}
.project-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}
.project-card:hover::after {
  border-color: var(--primary);
}
.project-card:active {
  transform: scale(0.99);
}
.project-card--inactive {
  opacity: 0.6;
}

/* Card top row */
.project-card-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.project-card-title-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.project-card-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  letter-spacing: -0.01em;
}
.project-card-partner {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 500;
}
.project-arrow {
  color: var(--text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease, color 0.2s ease;
  flex-shrink: 0;
  margin-top: 2px;
}
.project-card:hover .project-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--primary);
}

/* Metadata chips */
.project-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 100px;
  background: var(--hover-bg);
  color: var(--text-secondary);
}
.chip--warn {
  background: var(--warning-bg);
  color: var(--warning);
}

/* Stats row */
.project-stats {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 12px 0;
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
}
.project-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.project-stat-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.project-stat-label {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.project-stat-divider {
  width: 1px;
  height: 28px;
  background: var(--border-subtle);
  flex-shrink: 0;
}

/* Progress bar */
.project-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.project-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.project-progress-label {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
}
.project-progress-pct {
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.project-progress-pct.clr-green { color: var(--progress-high); }
.project-progress-pct.clr-yellow { color: var(--progress-mid); }
.project-progress-pct.clr-red { color: var(--progress-low); }
.project-progress-track {
  height: 5px;
  background: var(--hover-bg);
  border-radius: 3px;
  overflow: hidden;
}
.project-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.project-progress-fill.clr-green { background: var(--progress-high); }
.project-progress-fill.clr-yellow { background: var(--progress-mid); }
.project-progress-fill.clr-red { background: var(--progress-low); }

/* ── Right column: Insights ──────────────────────── */
.dashboard-insights {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: calc(var(--topbar-height, 56px) + 24px);
}
@media (max-width: 1100px) {
  .dashboard-insights {
    position: static;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
}

.insight-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.insight-card--highlight {
  background: var(--data-teal-dim);
  border-color: rgba(45, 212, 191, 0.12);
}
.insight-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}
.insight-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 0;
}
.insight-hero-num {
  font-size: 2.4rem;
  font-weight: 800;
  color: var(--text-primary, #1D1D1F);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}
.insight-hero-label {
  font-size: 0.72rem;
  color: var(--text-muted, #AEAEB2);
  font-weight: 500;
}
.insight-breakdown {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.insight-row-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.insight-row-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.insight-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-secondary, #86868B);
}
.insight-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.insight-pct {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.insight-bar {
  height: 4px;
  background: var(--hover-bg);
  border-radius: 2px;
  overflow: hidden;
}
.insight-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--data-teal);
  opacity: 0.65;
  transition: width 0.5s ease;
}
.insight-bar-fill--alt { background: var(--data-purple); opacity: 0.55; }
.insight-bar-fill--warn { background: var(--warning); opacity: 0.50; }

/* ── Overall Progress ring ───────────────────────── */
.overall-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.overall-ring {
  position: relative;
  width: 80px;
  height: 80px;
}
.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ring-bg { stroke: var(--hover-bg); }
.ring-fill {
  stroke: var(--data-teal);
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}
.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}
.overall-sub {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-align: center;
}

/* ── Animations ──────────────────────────────────── */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ──────────────────────────────────── */
@media (max-width: 1024px) {
  .skeleton-grid { grid-template-columns: repeat(2, 1fr); }
  .col-type, .col-partner { display: none; }
  .cell-type, .cell-partner { display: none; }
}
@media (max-width: 640px) {
  .skeleton-grid { grid-template-columns: 1fr; }
  .col-period { display: none; }
  .cell-period { display: none; }
  .col-progress { width: 120px; }
}

/* ═══ Facilitator view ════════════════════════════ */
.facilitator-dashboard {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.fac-body {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  align-items: start;
}

/* ── Header card ── */
.fac-header-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px 28px;
  position: relative;
  overflow: hidden;
}
.fac-header-card::before {
  content: '';
  position: absolute;
  top: -50px;
  right: -50px;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, var(--primary-dim) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.fac-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}
.fac-header-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fac-header-badge {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-muted, #AEAEB2);
  letter-spacing: 0.06em;
}
.fac-header-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}
.fac-header-chips {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.fac-header-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--primary-dim);
  flex-shrink: 0;
}
.fac-header-ring-num {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.fac-header-ring-label {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Demographic cards ── */
.fac-demo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.fac-demo-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: box-shadow 0.2s, transform 0.2s;
}
.fac-demo-card:hover {
  box-shadow: var(--shadow-elevated);
  transform: translateY(-1px);
}
.fac-demo-value {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.fac-demo-card--teal .fac-demo-value { color: var(--data-teal); }
.fac-demo-card--purple .fac-demo-value { color: var(--data-purple); }
.fac-demo-card--warn .fac-demo-value { color: var(--warning); }
.fac-demo-label {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* ── Main column ── */
.fac-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

/* ── Sessions section ── */
.fac-sessions-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.fac-sessions-table-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border-color, #E5E5EA);
  border-radius: var(--radius-lg, 20px);
  overflow: hidden;
}
.fac-sessions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.fac-sessions-table th {
  text-align: left;
  padding: 14px 16px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-surface, rgba(0, 0, 0, 0.015));
}
.fac-sessions-table td {
  padding: 12px 16px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle);
  font-variant-numeric: tabular-nums;
}
.fac-sessions-table tbody tr:last-child td {
  border-bottom: none;
}
.fac-sessions-table tbody tr:hover {
  background: var(--hover-bg, rgba(0, 0, 0, 0.02));
}
.td-date {
  white-space: nowrap;
  font-weight: 500;
}
.td-name {
  font-weight: 600;
}

/* ── Sidebar ── */
.fac-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 80px;
}

/* ── Insight cards ── */
.fac-insight-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
}
.fac-insight-card--highlight {
  border-color: var(--primary-border, var(--border-color));
  box-shadow: 0 0 0 1px var(--primary-dim);
}
.fac-insight-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 16px 0;
}
.fac-insight-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.fac-insight-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.fac-insight-row-top {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.fac-insight-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.5px;
}
.fac-insight-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
}

/* Hero number in insight card */
.fac-insight-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 0 20px;
}
.fac-insight-hero-num {
  font-size: 2.8rem;
  font-weight: 800;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -1px;
}
.fac-insight-hero-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Demographic breakdown bars */
.fac-insight-breakdown {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.fac-insight-break-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.fac-insight-break-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.fac-insight-break-val {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.fac-insight-break-pct {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.fac-insight-break-label {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--text-secondary);
}
.fac-insight-bar {
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 2px;
}
.fac-insight-bar-fill {
  height: 100%;
  background: var(--data-teal);
  border-radius: 3px;
  transition: width 0.6s ease;
}
.fac-insight-bar-fill--alt {
  background: var(--data-purple);
}
.fac-insight-bar-fill--warn {
  background: var(--warning);
}

/* ── Responsive ── */
@media (max-width: 960px) {
  .fac-body {
    grid-template-columns: 1fr;
  }
  .fac-sidebar {
    position: static;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}
@media (max-width: 640px) {
  .fac-demo-grid {
    grid-template-columns: 1fr;
  }
  .fac-sidebar {
    grid-template-columns: 1fr;
  }
  .fac-sessions-table-wrap { overflow-x: auto; }
  .fac-sessions-table { min-width: 480px; }
}
</style>
