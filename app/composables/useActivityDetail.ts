/**
 * useActivityDetail composable
 *
 * Fetches Level 3 activity detail from:
 * - GET /api/v1/dashboard/activities/:frameworkActivityId
 */

import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import type {
  ActivityInfo,
  ActivityDetailSummary,
  AttendanceOverview,
  DailyTrendPoint,
  ActivityLocationRow,
  ActivitySession,
  ActivityDetailResponse,
} from '../interfaces/dashboard'

const BASE_URL = '/api/v1'

export const useActivityDetail = () => {
  const authStore = useAuthStore()

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
  const patternType = ref('')

  const activity = ref<ActivityInfo>({
    id: '',
    name: '',
    code: '',
    target_count: 0,
    target_unit: '',
  })

  const summary = ref<ActivityDetailSummary>({
    unique_children: 0,
    target: 0,
    percentage: 0,
    girls: 0,
    boys: 0,
    with_disability: 0,
    new_this_period: 0,
  })

  const attendance = ref<AttendanceOverview>({
    total_sessions: 0,
    total_present: 0,
    total_absent: 0,
    attendance_rate: 0,
  })

  const dailyTrend = ref<DailyTrendPoint[]>([])
  const byLocation = ref<ActivityLocationRow[]>([])
  const recentSessions = ref<ActivitySession[]>([])

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasData = computed(() => !!activity.value.id)

  const sortedLocations = computed(() =>
    [...byLocation.value].sort((a, b) => a.location_name.localeCompare(b.location_name)),
  )

  const sortedSessions = computed(() =>
    [...recentSessions.value].sort((a, b) => b.date.localeCompare(a.date)),
  )

  // ── Formatters ─────────────────────────────────────────────────────────────
  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const formatShortDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })

  const formatPattern = (pattern: string): string =>
    pattern.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchActivityDetail(frameworkActivityId: string) {
    isLoading.value = true
    error.value = null

    try {
      const data = await apiFetch<ActivityDetailResponse>(`/dashboard/activities/${frameworkActivityId}`)
      patternType.value = data.pattern_type ?? ''
      activity.value = data.activity
      summary.value = data.summary
      attendance.value = data.attendance
      dailyTrend.value = data.daily_trend ?? []
      byLocation.value = data.by_location ?? []
      recentSessions.value = data.recent_sessions ?? []
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load activity detail'
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    patternType,
    activity,
    summary,
    attendance,
    dailyTrend,
    byLocation,
    recentSessions,
    hasData,
    sortedLocations,
    sortedSessions,
    formatDate,
    formatShortDate,
    formatPattern,
    fetchActivityDetail,
  }
}
