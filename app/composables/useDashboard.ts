/**
 * useDashboard composable
 *
 * Fetches multi-activity dashboard data from GET /api/v1/dashboard.
 * Provides demographics, activity summary, location breakdown, and recent sessions.
 */

import { ref, computed, watch } from 'vue'
import { getActivePinia } from 'pinia'
import { ApiError } from '../services/api'
import type {
  DashboardResponse,
  DemographicsSummary,
  ActivitySummary,
  LocationSummary,
  RecentSession,
} from '../interfaces/dashboard'

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

      const url = `${BASE_URL}/dashboard?${qs.toString()}`
      const response = await fetch(url, { headers })
      const raw = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new ApiError(response.status, raw?.message ?? `API error ${response.status}`, raw)
      }

      const body: DashboardResponse = raw?.data !== undefined ? raw.data : raw

      demographics.value = body.demographics ?? demographics.value
      activitySummary.value = body.activity_summary ?? []
      locations.value = body.locations ?? []
      recentSessions.value = body.recent_sessions ?? []
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
