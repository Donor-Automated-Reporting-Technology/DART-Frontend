/**
 * useDashboard composable
 *
 * Fetches Level 1 org dashboard data from:
 * - GET /api/v1/dashboard          → org_summary + projects[]
 * - GET /api/v1/dashboard/summary-stats → beneficiary_reach
 */

import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import type {
  OrgSummary,
  DashboardProject,
  BeneficiaryReach,
  ReachMetric,
  DemographicsSummary,
  ActivitySummary,
  LocationSummary,
  RecentSession,
} from '../interfaces/dashboard'

const BASE_URL = '/api/v1'

const emptyReachMetric: ReachMetric = { actual: 0, target: 0, percentage: 0 }

export const useDashboard = () => {
  const authStore = useAuthStore()

  // ── API helper (uses auth store for token) ─────────────────────────────────
  async function apiFetch<T>(path: string): Promise<T> {
    const token = authStore.accessToken
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(`${BASE_URL}${path}`, { headers })
    const raw = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(raw?.message ?? `API error ${response.status}`)
    }

    return (raw?.data !== undefined ? raw.data : raw) as T
  }

  // ── State ──────────────────────────────────────────────────────────────────
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  const orgSummary = ref<OrgSummary>({
    total_projects: 0,
    total_active_locations: 0,
    total_unique_beneficiaries: 0,
    overall_target: 0,
    target_breakdown: { girls: 0, boys: 0, girls_with_disability: 0, boys_with_disability: 0 },
  })

  const projects = ref<DashboardProject[]>([])

  const beneficiaryReach = ref<BeneficiaryReach>({
    total: { ...emptyReachMetric },
    girls_women: { ...emptyReachMetric },
    boys_men: { ...emptyReachMetric },
    with_disability: { ...emptyReachMetric },
  })

  // Facilitator-specific state (location-scoped response)
  const demographics = ref<DemographicsSummary>({
    total_beneficiaries: 0,
    girls_women: 0,
    boys_men: 0,
    with_disability: 0,
  })
  const activitySummary = ref<ActivitySummary[]>([])
  const locations = ref<LocationSummary[]>([])
  const recentSessions = ref<RecentSession[]>([])

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasOrgSummary = computed(
    () => orgSummary.value.total_projects > 0 || orgSummary.value.total_unique_beneficiaries > 0,
  )

  const isFacilitatorView = computed(
    () => !hasOrgSummary.value && demographics.value.total_beneficiaries > 0,
  )

  const hasData = computed(
    () => hasOrgSummary.value || projects.value.length > 0 || isFacilitatorView.value,
  )

  const sortedProjects = computed(() =>
    [...projects.value].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1
      if (!a.is_active && b.is_active) return 1
      return a.project_name.localeCompare(b.project_name)
    }),
  )

  // ── Formatters ─────────────────────────────────────────────────────────────
  const todayLabel = computed(() =>
    new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  )

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchDashboard() {
    isLoading.value = true
    error.value = null

    try {
      // Fetch dashboard — response shape depends on user role
      const dashData = await apiFetch<Record<string, any>>('/dashboard')

      if (dashData?.org_summary) {
        // Admin/PM view: org_summary + projects
        orgSummary.value = dashData.org_summary
        projects.value = dashData.projects ?? []

        // Fetch reach stats (admin only)
        try {
          const statsData = await apiFetch<{ beneficiary_reach: BeneficiaryReach }>('/dashboard/summary-stats')
          if (statsData?.beneficiary_reach) {
            beneficiaryReach.value = statsData.beneficiary_reach
          }
        } catch {
          // summary-stats not available — non-critical
        }
      } else if (dashData?.demographics) {
        // Facilitator view: demographics + activity_summary + locations + recent_sessions
        demographics.value = dashData.demographics
        activitySummary.value = dashData.activity_summary ?? []
        locations.value = dashData.locations ?? []
        recentSessions.value = dashData.recent_sessions ?? []
      }
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load dashboard'
    } finally {
      isLoading.value = false
    }
  }

  return {
    // state
    isLoading,
    error,
    orgSummary,
    projects,
    beneficiaryReach,
    // facilitator state
    demographics,
    activitySummary,
    locations,
    recentSessions,
    // derived
    hasData,
    hasOrgSummary,
    isFacilitatorView,
    sortedProjects,
    // formatters
    todayLabel,
    formatDate,
    // actions
    fetchDashboard,
  }
}
