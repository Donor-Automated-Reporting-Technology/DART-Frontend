/**
 * useDashboard composable
 *
 * Fetches multi-activity dashboard data from GET /api/v1/dashboard.
 * Provides demographics, activity summary, location breakdown, and recent sessions.
 */

import { ref, computed, watch } from 'vue'
import { getActivePinia } from 'pinia'
import { ApiError } from '../services/api'
import { useFrameworkStore } from '../stores/framework'
import { cfsApi } from '../services/cfsApi'
import type {
  DashboardResponse,
  DemographicsSummary,
  ActivitySummary,
  LocationSummary,
  RecentSession,
} from '../interfaces/dashboard'
import type { DashboardStatsResponse } from '../interfaces/cfs'

const BASE_URL = '/api/v1'

type PeriodKey = 'month' | 'quarter' | 'year'

function resolveToken(): string | undefined {
  try {
    const pinia = getActivePinia()
    const authState = pinia?.state.value?.['auth'] as { accessToken?: string | null } | undefined
    return authState?.accessToken ?? undefined
  } catch {
    return undefined
  }
}

function periodRange(key: PeriodKey): { period_start: string; period_end: string } {
  const now = new Date()
  const end = now.toISOString().slice(0, 10)
  let start: Date

  if (key === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (key === 'quarter') {
    const q = Math.floor(now.getMonth() / 3) * 3
    start = new Date(now.getFullYear(), q, 1)
  } else {
    start = new Date(now.getFullYear(), 0, 1)
  }

  return { period_start: start.toISOString().slice(0, 10), period_end: end }
}

export const useDashboard = () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const period = ref<PeriodKey>('quarter')
  const locationFilter = ref<string | null>(null)

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
  const hasData = computed(
    () => demographics.value.total_beneficiaries > 0 || activitySummary.value.length > 0,
  )

  const totalActivities = computed(() => activitySummary.value.length)

  const overallProgress = computed(() => {
    if (!activitySummary.value.length) return 0
    const sum = activitySummary.value.reduce((acc, a) => acc + a.percentage, 0)
    return Math.round(sum / activitySummary.value.length)
  })

  // ── Formatters ─────────────────────────────────────────────────────────────
  const greeting = (): string => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

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

  const timeAgo = (iso: string): string => {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diffMs / 60000)
    const hrs = Math.floor(diffMs / 3600000)
    const days = Math.floor(diffMs / 86400000)
    if (mins < 2) return 'Just now'
    if (mins < 60) return `${mins} minutes ago`
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchDashboard() {
    isLoading.value = true
    error.value = null

    try {
      const token = resolveToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const range = periodRange(period.value)
      const qs = new URLSearchParams()
      qs.set('period_start', range.period_start)
      qs.set('period_end', range.period_end)
      if (locationFilter.value) qs.set('location_id', locationFilter.value)

      // 1. Fetch the main dashboard (locations, sessions, activity list)
      const url = `${BASE_URL}/dashboard?${qs.toString()}`
      const response = await fetch(url, { headers })
      const raw = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new ApiError(response.status, raw?.message ?? `API error ${response.status}`, raw)
      }

      const body: DashboardResponse = raw?.data !== undefined ? raw.data : raw

      locations.value = body.locations ?? []
      recentSessions.value = body.recent_sessions ?? []

      const apiActivities: ActivitySummary[] = body.activity_summary ?? []

      // ── Strategy: resolve org-wide grant targets for ALL user roles ────
      // Try multiple sources in order of specificity.  The first source that
      // provides data wins. This ensures non-admin users see the same
      // admin-configured targets as admins.

      let resolved = false

      // ─── Source A: Framework activities (per-activity targets) ─────────
      // Works for admins and roles with framework read access.
      try {
        const frameworkStore = useFrameworkStore()
        if (!frameworkStore.currentFramework) await frameworkStore.fetchFramework()
        if (frameworkStore.currentFramework && !frameworkStore.frameworkActivities.length) {
          await frameworkStore.fetchActivities()
        }

        const adminTargets = new Map<string, number>()
        for (const fa of frameworkStore.activeActivities) {
          const code = fa.template?.code
          if (code && fa.target_count > 0) {
            adminTargets.set(code, fa.target_count)
          }
        }

        if (adminTargets.size > 0) {
          activitySummary.value = apiActivities.map((a) => {
            const adminTarget = adminTargets.get(a.code)
            if (adminTarget !== undefined) {
              const pct = adminTarget > 0 ? Math.round((a.actual / adminTarget) * 100) : 0
              return { ...a, target: adminTarget, percentage: Math.min(pct, 999) }
            }
            return a
          })
          demographics.value = body.demographics ?? demographics.value
          resolved = true
        }
      } catch {
        // Framework endpoint not accessible for this role — try next source
      }

      // ─── Source B: CFS org-wide dashboard stats ───────────────────────
      // Returns correct org-wide demographics + grant targets + progress.
      // Accessible to all org members for CFS/child_protection frameworks.
      if (!resolved) {
        try {
          const cfsStats: DashboardStatsResponse = await cfsApi.getDashboardStats()

          // Use org-wide demographics instead of location-scoped values
          demographics.value = {
            total_beneficiaries: cfsStats.demographics.total_children ?? 0,
            girls_women: cfsStats.demographics.total_female ?? 0,
            boys_men: cfsStats.demographics.total_male ?? 0,
            with_disability: cfsStats.demographics.total_with_disability ?? 0,
          }

          // Map CFS progress items (server-calculated actual vs grant target)
          // to the activity summary, keyed by activity code.
          const cfsProgressMap: Record<string, { actual: number; target: number; percentage: number }> = {}

          if (cfsStats.progress) {
            // Map the CFS grant target categories to likely activity codes
            if (cfsStats.progress.total_children) {
              cfsProgressMap['cfs'] = cfsStats.progress.total_children
              cfsProgressMap['children_sessions'] = cfsStats.progress.total_children
            }
            if (cfsStats.progress.sessions) {
              cfsProgressMap['sessions'] = cfsStats.progress.sessions
            }
          }

          // Also build a target-only map from grant_targets for additional matching
          const grantTargetMap: Record<string, number> = {}
          if (cfsStats.grant_targets) {
            grantTargetMap['cfs'] = cfsStats.grant_targets.target_total_children ?? 0
            grantTargetMap['children_sessions'] = cfsStats.grant_targets.target_total_children ?? 0
          }

          activitySummary.value = apiActivities.map((a) => {
            // Prefer full progress item (has correct actual + target)
            const progress = cfsProgressMap[a.code]
            if (progress && progress.target > 0) {
              return {
                ...a,
                actual: progress.actual,
                target: progress.target,
                percentage: Math.min(progress.percentage, 999),
              }
            }
            // Fall back to grant target for target only, keep API actual
            const grantTarget = grantTargetMap[a.code]
            if (grantTarget && grantTarget > 0) {
              const pct = Math.round((a.actual / grantTarget) * 100)
              return { ...a, target: grantTarget, percentage: Math.min(pct, 999) }
            }
            return a
          })

          resolved = true
        } catch {
          // CFS dashboard stats not accessible — try grant targets only
        }
      }

      // ─── Source C: CFS grant targets (target values only) ─────────────
      // Lightweight read-only config endpoint — most likely accessible to all.
      if (!resolved) {
        try {
          const grantTargets = await cfsApi.getGrantTargets()
          if (grantTargets?.target_values) {
            const tv = grantTargets.target_values
            const targetMap: Record<string, number> = {}
            if (tv.total_children > 0) {
              targetMap['cfs'] = tv.total_children
              targetMap['children_sessions'] = tv.total_children
            }

            demographics.value = body.demographics ?? demographics.value

            activitySummary.value = apiActivities.map((a) => {
              const target = targetMap[a.code]
              if (target && target > 0) {
                const pct = Math.round((a.actual / target) * 100)
                return { ...a, target, percentage: Math.min(pct, 999) }
              }
              return a
            })
            resolved = true
          }
        } catch {
          // Grant targets not accessible
        }
      }

      // ─── Fallback: use raw API data as-is ─────────────────────────────
      if (!resolved) {
        demographics.value = body.demographics ?? demographics.value
        activitySummary.value = apiActivities
      }
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load dashboard'
    } finally {
      isLoading.value = false
    }
  }

  // re-fetch when period or location changes
  watch([period, locationFilter], () => fetchDashboard())

  return {
    // state
    isLoading,
    error,
    period,
    locationFilter,
    demographics,
    activitySummary,
    locations,
    recentSessions,
    // derived
    hasData,
    totalActivities,
    overallProgress,
    // formatters
    greeting,
    todayLabel,
    formatDate,
    timeAgo,
    // actions
    fetchDashboard,
  }
}
