<template>
  <!--
    dashboard.vue
    ─────────────────────────────────────────────────────────────────────────────
    The main dashboard page — admin only.
    Now fetches live data from GET /api/v1/cfs/dashboard.
  -->
  <NuxtLayout name="app" :breadcrumbs="breadcrumbs">

    <div class="dashboard-page">

      <!-- ── 0. Onboarding banner (org_admin only) ───────────────────────────── -->
      <OnboardingBanner />

      <!-- ── 1. Greeting header ──────────────────────────────────────────────── -->
      <div class="page-greeting">
        <div class="greeting-body">
          <p class="greeting-eyebrow">{{ todayLabel }}</p>
          <h1 class="greeting-title">
            {{ greetingText }},
            <span class="greeting-name">{{ firstName }}</span>
          </h1>
          <p v-if="isStaff && myLocationStats?.location?.name" class="greeting-sub">
            <AppIcon name="map-pin" :size="14" class="greeting-location-icon" />
            {{ myLocationStats.location.name }}
            <span v-if="myLocationStats.location.geographic_area" class="greeting-location-area">
              &middot; {{ myLocationStats.location.geographic_area }}
            </span>
          </p>
          <p v-else class="greeting-sub">Here's what's happening with your program today.</p>
        </div>
        <div v-if="isStaff" class="greeting-sync">
          <SyncButton />
        </div>
        <div class="greeting-accent" aria-hidden="true"></div>
      </div>

      <!-- ── Loading Skeleton ─────────────────────────────────────────────── -->
      <div v-if="isLoading" class="loading-skeleton">
        <div class="skeleton-grid">
          <div v-for="n in 4" :key="n" class="skeleton-card"></div>
        </div>
      </div>

      <!-- ── Error State ──────────────────────────────────────────────────── -->
      <div v-else-if="loadError" class="dash-error">
        <AppIcon name="alert-circle" :size="20" />
        <span>{{ loadError }}</span>
        <button class="btn-retry" @click="fetchDashboard">Retry</button>
      </div>

      <!-- ── Live Dashboard ───────────────────────────────────────────────── -->
      <template v-else>

        <!-- ── STAFF DASHBOARD (Facilitator/Case Worker - Simple) ────────── -->
        <div v-if="isStaff && myLocationStats" class="staff-dashboard staff-dashboard--simple">

          <!-- 1. Primary Stats Row -->
          <div class="stats-row-simple">
            <DashStatCard
              label="Children Reached"
              :value="myLocationStats?.demographics.total_children ?? 0"
              sub="Direct registrations"
              icon="users"
              icon-color="primary"
            />
            <DashStatCard
              label="Presence Rate"
              :value="`${attendanceRate}%`"
              sub="Average attendance"
              icon="activity"
              icon-color="success"
            />
            <DashStatCard
              label="Sessions Logged"
              :value="myLocationStats?.attendance.total_sessions ?? 0"
              sub="Activities delivered"
              icon="calendar"
              icon-color="accent"
            />
            <DashStatCard
              label="Special Needs"
              :value="myLocationStats?.demographics.total_with_disability ?? 0"
              sub="Inclusive reach"
              icon="heart"
              icon-color="warning"
            />
          </div>

          <!-- 2. Beneficiaries List -->
          <div class="section-container">
            <div class="section-header">
              <h3 class="section-title">Registered Beneficiaries</h3>
              <NuxtLink to="/cfs/registration" class="btn-text">
                <AppIcon name="plus" :size="14" />
                New Registration
              </NuxtLink>
            </div>
            <div class="simple-card table-card-v2">
              <CfsBeneficiariesTable :token="authStore.accessToken || undefined" />
            </div>
          </div>

          <!-- 3. Insights -->
          <div class="simple-insights-grid">
            <!-- Recent Activity -->
            <div class="section-container">
              <h3 class="section-title">Recent Activity</h3>
              <div class="simple-card activity-card">
                <table v-if="myLocationStats?.recent_sessions?.length" class="simple-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Presence</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in myLocationStats?.recent_sessions.slice(0, 3)" :key="s.id">
                      <td class="cell-date">{{ formatDate(s.session_date) }}</td>
                      <td class="cell-type">{{ s.session_type.replace(/_/g, ' ') }}</td>
                      <td class="cell-presence">{{ s.present_count }}/{{ s.total_count }}</td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="empty-state">No recent activities.</div>
              </div>
            </div>

            <!-- Gender Balance Summary -->
            <div class="section-container">
              <h3 class="section-title">Gender Balance</h3>
              <div class="simple-card gender-summary">
                <div class="gender-mini-bar">
                  <div class="bar-fill bar-pink" :style="{ width: girlsPercentage + '%' }"></div>
                  <div class="bar-fill bar-blue" :style="{ width: boysPercentage + '%' }"></div>
                </div>
                <div class="gender-details">
                  <span><strong>{{ girlsPercentage }}%</strong> Girls ({{ myLocationStats?.demographics.total_female }})</span>
                  <span><strong>{{ boysPercentage }}%</strong> Boys ({{ myLocationStats?.demographics.total_male }})</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- ── ADMIN DASHBOARD (Org Admin) ─────────────────────────────── -->
        <div v-else-if="isAdmin && stats" class="admin-dashboard">

          <!-- Tabs Switcher -->
          <div class="dash-tabs">
            <button
              class="tab-btn"
              :class="{ 'tab-btn--active': activeTab === 'summary' }"
              @click="activeTab = 'summary'"
            >Program Summary</button>
            <button
              class="tab-btn"
              :class="{ 'tab-btn--active': activeTab === 'beneficiaries' }"
              @click="activeTab = 'beneficiaries'"
            >Beneficiaries List</button>
          </div>

          <!-- 2. Program Summary Tab -->
          <template v-if="activeTab === 'summary'">
            <!-- Stat cards -->
            <div class="stats-grid">
              <DashStatCard
                label="Children Reached"
                :value="stats?.demographics.total_children ?? 0"
                sub="Unique beneficiaries"
                icon="users"
                icon-color="primary"
                :accent="true"
              />
              <DashStatCard
                label="Sessions Delivered"
                :value="stats?.attendance.total_sessions ?? 0"
                sub="This period"
                icon="calendar"
                icon-color="accent"
              />
              <DashStatCard
                label="Attendance Records"
                :value="stats?.attendance.total_present ?? 0"
                :sub="`${attendanceRate}% attendance rate`"
                icon="activity"
                icon-color="success"
              />
              <DashStatCard
                label="Children with Disability"
                :value="stats?.demographics.total_with_disability ?? 0"
                sub="Inclusive reach"
                icon="heart"
                icon-color="warning"
              />
            </div>

            <!-- CFS Breakdown -->
            <div class="cfs-breakdown">
              <div class="breakdown-card">
                <h3 class="breakdown-title">Demographics</h3>
                <div class="breakdown-stats">
                  <div class="breakdown-item">
                    <span class="breakdown-label">Girls</span>
                    <span class="breakdown-value">{{ stats?.demographics.total_female ?? 0 }}</span>
                  </div>
                  <div class="breakdown-item">
                    <span class="breakdown-label">Boys</span>
                    <span class="breakdown-value">{{ stats?.demographics.total_male ?? 0 }}</span>
                  </div>
                  <div class="breakdown-item">
                    <span class="breakdown-label">With Disability</span>
                    <span class="breakdown-value">{{ stats?.demographics.total_with_disability ?? 0 }}</span>
                  </div>
                </div>
              </div>

              <div class="breakdown-card">
                <h3 class="breakdown-title">Location Breakdown</h3>
                <div class="breakdown-stats">
                  <div
                    v-for="loc in stats?.locations"
                    :key="loc.location_id"
                    class="breakdown-item"
                  >
                    <span class="breakdown-label">
                      <strong>{{ loc.location_name }}</strong>
                      <br />
                      <span class="muted" style="font-size: 0.72rem; font-style: normal;">
                        Facilitator: {{ getLocationFacilitator(loc.location_id) }}
                      </span>
                    </span>
                    <span class="breakdown-value">{{ loc.total_children }}</span>
                  </div>
                  <div v-if="stats?.locations?.length === 0" class="breakdown-item">
                    <span class="breakdown-label muted">No locations configured</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Grant Target Progress -->
            <div v-if="stats?.progress" class="progress-section">
              <h3 class="section-title">Grant Target Progress</h3>
              <p v-if="stats?.grant_targets" class="period-label">
                {{ formatDate(stats.grant_targets.period_start) }} — {{ formatDate(stats.grant_targets.period_end) }}
              </p>
              <div class="progress-grid">
                <div class="progress-card">
                  <div class="progress-header">
                    <span class="progress-label">Total Children</span>
                    <span class="progress-numbers">{{ stats?.progress?.total_children?.actual ?? 0 }} / {{ stats?.progress?.total_children?.target ?? 0 }}</span>
                  </div>
                  <div class="progress-bar-track">
                    <div class="progress-bar-fill" :style="{ width: (stats?.progress?.total_children?.percentage ?? 0) + '%' }"></div>
                  </div>
                  <span class="progress-pct">{{ stats?.progress?.total_children?.percentage ?? 0 }}%</span>
                </div>

                <div class="progress-card">
                  <div class="progress-header">
                    <span class="progress-label">Girls</span>
                    <span class="progress-numbers">{{ stats?.progress?.girls?.actual ?? 0 }} / {{ stats?.progress?.girls?.target ?? 0 }}</span>
                  </div>
                  <div class="progress-bar-track">
                    <div class="progress-bar-fill fill-pink" :style="{ width: (stats?.progress?.girls?.percentage ?? 0) + '%' }"></div>
                  </div>
                  <span class="progress-pct">{{ stats?.progress?.girls?.percentage ?? 0 }}%</span>
                </div>

                <div class="progress-card">
                  <div class="progress-header">
                    <span class="progress-label">With Disability</span>
                    <span class="progress-numbers">{{ stats?.progress?.with_disability?.actual ?? 0 }} / {{ stats?.progress?.with_disability?.target ?? 0 }}</span>
                  </div>
                  <div class="progress-bar-track">
                    <div class="progress-bar-fill fill-purple" :style="{ width: (stats?.progress?.with_disability?.percentage ?? 0) + '%' }"></div>
                  </div>
                  <span class="progress-pct">{{ stats?.progress?.with_disability?.percentage ?? 0 }}%</span>
                </div>

                <div class="progress-card">
                  <div class="progress-header">
                    <span class="progress-label">Sessions</span>
                    <span class="progress-numbers">{{ stats?.progress?.sessions?.actual ?? 0 }} / {{ stats?.progress?.sessions?.target ?? 0 }}</span>
                  </div>
                  <div class="progress-bar-track">
                    <div class="progress-bar-fill fill-green" :style="{ width: (stats?.progress?.sessions?.percentage ?? 0) + '%' }"></div>
                  </div>
                  <span class="progress-pct">{{ stats?.progress?.sessions?.percentage ?? 0 }}%</span>
                </div>
              </div>
            </div>

            <!-- No Targets CTA -->
            <div v-else class="no-targets-cta">
              <AppIcon name="target" :size="24" />
              <div>
                <h4>No grant targets configured</h4>
                <p>Set up targets to track your CFS programme progress against donor commitments.</p>
              </div>
              <NuxtLink to="/cfs/configuration" class="btn-configure">Configure Targets</NuxtLink>
            </div>
          </template>

          <!-- 3. Beneficiaries List Tab -->
          <template v-else-if="activeTab === 'beneficiaries'">
            <div class="table-card">
              <CfsBeneficiariesTable
                :token="authStore.accessToken || undefined"
                :show-location-filter="true"
                :locations="stats.locations.map(l => ({ id: l.location_id, name: l.location_name }))"
                :assignments="assignments"
              />
            </div>
          </template>

          <!-- Quick Actions -->
          <div class="quick-actions">
            <h3 class="section-title">Quick Actions</h3>
            <div class="actions-grid">
              <NuxtLink to="/cfs/configuration" class="action-card">
                <div class="action-icon">
                  <AppIcon name="settings" :size="24" />
                </div>
                <div class="action-content">
                  <h4 class="action-title">CFS Configuration</h4>
                  <p class="action-description">Manage CFS settings</p>
                </div>
              </NuxtLink>

              <NuxtLink to="/cfs/staff-management" class="action-card">
                <div class="action-icon">
                  <AppIcon name="users" :size="24" />
                </div>
                <div class="action-content">
                  <h4 class="action-title">Manage Staff</h4>
                  <p class="action-description">Assign staff to CFS locations</p>
                </div>
              </NuxtLink>

              <NuxtLink to="/cfs" class="action-card">
                <div class="action-icon">
                  <AppIcon name="bar-chart" :size="24" />
                </div>
                <div class="action-content">
                  <h4 class="action-title">View All CFS</h4>
                  <p class="action-description">Full program overview</p>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>

      </template>

    </div>

  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore }      from '../stores/auth';
import { useDashboard }      from '../composables/useDashboard';
import { cfsApi }            from '../services/cfsApi';
import DashStatCard          from '../components/dashboard/DashStatCard.vue';
import OnboardingBanner      from '../components/onboarding/OnboardingBanner.vue';
import AppIcon               from '../components/interfaces/AppIcon.vue';
import type { Breadcrumb }   from '../interfaces/dashboard';
import type { DashboardStatsResponse, MyLocationDashboardResponse, StaffAssignment } from '../interfaces/cfs';
import CfsBeneficiariesTable from '../components/cfs/CfsBeneficiariesTable.vue';
import SyncButton from '../components/interfaces/SyncButton.vue';

// ── Page metadata ──────────────────────────────────────────────────────────────
definePageMeta({ middleware: ['auth', 'role-guard'], layout: false, allowedRoles: ['org_admin', 'facilitator', 'case_worker'] });

useHead({ title: 'Dashboard — DART' });

// ── Breadcrumbs ────────────────────────────────────────────────────────────────
const breadcrumbs: Breadcrumb[] = [
  { title: 'Home',      href: '/'          },
  { title: 'Dashboard', href: '/dashboard', current: true },
];

// ── Dashboard composable ───────────────────────────────────────────────────────
const { todayLabel } = useDashboard();

// ── Auth store ─────────────────────────────────────────────────────────────────
const authStore = useAuthStore();

// ── API state ──────────────────────────────────────────────────────────────────
const stats = ref<DashboardStatsResponse | null>(null);
const myLocationStats = ref<MyLocationDashboardResponse | null>(null);
const assignments = ref<StaffAssignment[]>([]);
const isLoading = ref(true);
const loadError = ref('');

/** Role check helpers */
const isStaff = computed(() => ['facilitator', 'case_worker'].includes(authStore.userRole || ''));
const isAdmin = computed(() => authStore.userRole === 'org_admin');

/** Admin tab state */
const activeTab = ref<'summary' | 'beneficiaries'>('summary');

/** Attendance rate as a rounded percentage */
const attendanceRate = computed(() => {
  if (isStaff.value) {
    if (!myLocationStats.value || !myLocationStats.value.attendance.total_attendance_records) return 0;
    return Math.round(
      (myLocationStats.value.attendance.total_present / myLocationStats.value.attendance.total_attendance_records) * 100
    );
  }
  if (!stats.value || !stats.value.attendance.total_attendance_records) return 0;
  return Math.round(
    (stats.value.attendance.total_present / stats.value.attendance.total_attendance_records) * 100
  );
});

/** First name extracted from the stored user display name */
const firstName = computed(() => {
  const name = authStore.userName ?? 'there';
  return name.split(' ')[0] || 'there';
});

/** Reactive greeting text based on the current hour */
const greetingText = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
});

/** Format a date string as "Jan 1, 2026" */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Get active facilitator name for a location */
function getLocationFacilitator(locationId: string): string {
  const assigned = assignments.value.find(a => a.cfs_location_id === locationId && a.is_active && a.role === 'facilitator');
  return assigned?.full_name || 'No facilitator assigned';
}

/** Computed summary of session types for the recent sessions list (Staff view) */
const sessionTypeCounts = computed(() => {
  if (!myLocationStats.value) return {};
  const counts: Record<string, number> = {};
  myLocationStats.value.recent_sessions.forEach(s => {
    counts[s.session_type] = (counts[s.session_type] || 0) + 1;
  });
  return counts;
});

/** Format session type for display */
function formatSessionType(type: string): string {
  return type.replace(/_/g, ' ');
}

/** Computed percentages for gender balance */
const girlsPercentage = computed(() => {
  if (!myLocationStats.value || !myLocationStats.value.demographics.total_children) return 0;
  return Math.round((myLocationStats.value.demographics.total_female / myLocationStats.value.demographics.total_children) * 100);
});

const boysPercentage = computed(() => {
  if (!myLocationStats.value || !myLocationStats.value.demographics.total_children) return 0;
  return Math.round((myLocationStats.value.demographics.total_male / myLocationStats.value.demographics.total_children) * 100);
});

/** Fetch dashboard stats from the API */
async function fetchDashboard() {
  isLoading.value = true;
  loadError.value = '';
  try {
    const token = authStore.accessToken || undefined;
    if (isStaff.value) {
      myLocationStats.value = await cfsApi.getMyLocationDashboard(token);
    } else {
      const [dashStats, staffResult] = await Promise.all([
        cfsApi.getDashboardStats(token),
        cfsApi.getStaffAssignments(token)
      ]);
      stats.value = dashStats;
      assignments.value = staffResult.assignments;
    }
  } catch (e: any) {
    if (e?.status === 404 && isStaff.value) {
      loadError.value = "You haven't been assigned to a location yet. Please contact your administrator.";
    } else {
      loadError.value = e?.message || 'Failed to load dashboard data';
    }
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchDashboard);
</script>

<style scoped>
/* ── Staff Dashboard (Facilitator/Case Worker - Simple) ────────── */

.staff-dashboard--simple {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 1100px;
  margin: 0 auto;
  animation: fadeIn 0.35s ease-out;
}

/* ── Stats Row (4 columns) ────────────────────────────────────────────────── */
.stats-row-simple {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media (max-width: 1024px) {
  .stats-row-simple { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .stats-row-simple { grid-template-columns: 1fr; }
}

/* ── Quick Actions (Horizontal Row) ───────────────────────────────────────── */
.actions-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.action-tile-simple {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.action-tile-simple::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--gradient-card);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.action-tile-simple:hover {
  transform: translateY(-2px);
  border-color: var(--border-color);
  box-shadow: var(--shadow-card), var(--shadow-glow);
  text-decoration: none;
}

.action-tile-simple:hover::before {
  opacity: 1;
}

.tile-icon {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--hover-bg);
  flex-shrink: 0;
}

.tile-label {
  position: relative;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.action-tile--indigo .tile-icon { background: rgba(99, 102, 241, 0.10); color: #818cf8; }
.action-tile--emerald .tile-icon { background: rgba(52, 211, 153, 0.10); color: #34d399; }
.action-tile--amethyst .tile-icon { background: rgba(168, 85, 247, 0.10); color: #c084fc; }

@media (max-width: 768px) {
  .actions-row { grid-template-columns: 1fr; }
}

/* ── Simple Cards ──────────────────────────────────────────────────────────── */
.simple-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.table-card-v2 { padding: 0.5rem; overflow: hidden; }

/* ── Simple Insights Grid ──────────────────────────────────────────────────── */
.simple-insights-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1.5rem;
  align-items: flex-start;
}

@media (max-width: 1024px) {
  .simple-insights-grid { grid-template-columns: 1fr; }
}

/* ── Simple Table (Recent Activity) ────────────────────────────────────────── */
.simple-table {
  width: 100%;
  border-collapse: collapse;
}

.simple-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
  border-bottom: 1px solid var(--border-subtle);
}

.simple-table td {
  padding: 0.875rem 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.simple-table tr:last-child td { border-bottom: none; }

.simple-table tr:hover td { background: var(--hover-bg-subtle); }

.cell-date { font-weight: 600; color: var(--text-primary); }
.cell-type { text-transform: capitalize; }
.cell-presence { font-weight: 600; color: var(--primary); }

/* ── Gender Summary ─────────────────────────────────────────────────────────── */
.gender-mini-bar {
  height: 6px;
  background: var(--hover-bg);
  border-radius: 3px;
  display: flex;
  overflow: hidden;
  margin-bottom: 1rem;
}

.bar-fill { height: 100%; transition: width 0.5s ease; }
.bar-pink { background: linear-gradient(90deg, #ec4899, #f472b6); }
.bar-blue { background: linear-gradient(90deg, #3b82f6, #60a5fa); }

.gender-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gender-details span {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.gender-details strong { color: var(--text-primary); }

/* ── Formats & Shared ─────────────────────────────────────────────────────── */
.section-container { display: flex; flex-direction: column; gap: 0.75rem; }
.section-header { display: flex; justify-content: space-between; align-items: center; }
.section-title { font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); margin: 0; letter-spacing: -0.01em; }
.btn-text { font-size: 0.8rem; font-weight: 500; color: var(--primary); text-decoration: none; display: flex; align-items: center; gap: 4px; transition: opacity 0.15s; }
.btn-text:hover { text-decoration: none; opacity: 0.8; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Page Layout ───────────────────────────────────────────────────────────── */

.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  max-width: 1280px;
}

/* ── Greeting ──────────────────────────────────────────────────────────────── */
.page-greeting {
  position: relative;
  padding: 1.75rem 2rem;
  background: var(--bg-card);
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.greeting-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-brand);
  border-radius: 3px 3px 0 0;
}

.greeting-body { position: relative; }

.greeting-sync {
  position: relative;
  display: flex;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}

.greeting-eyebrow {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  margin: 0 0 0.35rem;
  letter-spacing: 0.02em;
}

.greeting-title {
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
  margin: 0;
  color: var(--text-primary);
}

.greeting-name {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.greeting-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0.4rem 0 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.greeting-location-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.greeting-location-area {
  color: var(--text-muted);
}

/* ── Loading Skeleton ──────────────────────────────────────────────────────── */
.loading-skeleton { animation: fadeIn 0.3s ease; }

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.skeleton-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  height: 140px;
  animation: pulse 1.5s ease infinite;
}

@media (max-width: 1024px) { .skeleton-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .skeleton-grid { grid-template-columns: 1fr; } }

/* ── Error State ───────────────────────────────────────────────────────────── */
.dash-error {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--error-bg);
  border: 1px solid rgba(248, 113, 113, 0.15);
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

/* ── Admin Dashboard ───────────────────────────────────────────────────────── */
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  animation: fadeIn 0.35s ease-out;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } }

/* ── Tabs ──────────────────────────────────────────────────────────────────── */
.dash-tabs {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  width: fit-content;
}

.tab-btn {
  padding: 8px 20px;
  border-radius: calc(var(--radius-md) - 3px);
  font-weight: 600;
  font-size: 0.82rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover { color: var(--text-secondary); }

.tab-btn--active {
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
}

/* ── Breakdown Cards ───────────────────────────────────────────────────────── */
.cfs-breakdown {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 768px) { .cfs-breakdown { grid-template-columns: 1fr; } }

.breakdown-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.breakdown-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 1rem;
}

.breakdown-stats { display: flex; flex-direction: column; gap: 0; }

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-subtle);
}

.breakdown-item:last-child { border-bottom: none; }

.breakdown-label { font-size: 0.85rem; color: var(--text-secondary); }
.breakdown-value { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }
.muted { color: var(--text-muted); }

/* ── Progress Section ──────────────────────────────────────────────────────── */
.progress-section { display: flex; flex-direction: column; gap: 0.75rem; }

.period-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

.progress-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (max-width: 768px) { .progress-grid { grid-template-columns: 1fr; } }

.progress-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label { font-size: 0.82rem; font-weight: 500; color: var(--text-secondary); }
.progress-numbers { font-size: 0.78rem; color: var(--text-muted); font-weight: 500; }

.progress-bar-track {
  height: 6px;
  background: var(--hover-bg);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--gradient-brand);
  border-radius: 3px;
  transition: width 0.6s ease;
}

.fill-pink { background: linear-gradient(90deg, #ec4899, #f472b6); }
.fill-purple { background: linear-gradient(90deg, #a78bfa, #c084fc); }
.fill-green { background: linear-gradient(90deg, #34d399, #6ee7b7); }

.progress-pct {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* ── No Targets CTA ────────────────────────────────────────────────────────── */
.no-targets-cta {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
  color: var(--text-muted);
}

.no-targets-cta h4 { margin: 0; font-size: 0.9rem; color: var(--text-primary); }
.no-targets-cta p { margin: 0.25rem 0 0; font-size: 0.8rem; }

.btn-configure {
  margin-left: auto;
  padding: 0.5rem 1.25rem;
  background: var(--primary);
  color: #000;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.btn-configure:hover { opacity: 0.9; text-decoration: none; }

/* ── Table Card ────────────────────────────────────────────────────────────── */
.table-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 0.5rem;
  overflow: hidden;
}

/* ── Quick Actions (Admin) ─────────────────────────────────────────────────── */
.quick-actions { display: flex; flex-direction: column; gap: 0.75rem; }

.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

@media (max-width: 768px) { .actions-grid { grid-template-columns: 1fr; } }

.action-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.action-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--gradient-card);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.action-card:hover {
  border-color: var(--border-color);
  box-shadow: var(--shadow-card), var(--shadow-glow);
  transform: translateY(-1px);
  text-decoration: none;
}

.action-card:hover::before { opacity: 1; }

.action-icon {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--primary-dim);
  color: var(--primary);
  flex-shrink: 0;
}

.action-content { position: relative; }
.action-title { font-size: 0.88rem; font-weight: 600; color: var(--text-primary); margin: 0; }
.action-description { font-size: 0.78rem; color: var(--text-muted); margin: 0.15rem 0 0; }

/* ── Empty State ───────────────────────────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}
</style>
