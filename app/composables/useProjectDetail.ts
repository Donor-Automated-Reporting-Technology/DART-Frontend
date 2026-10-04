/**
 * useProjectDetail composable
 *
 * Fetches Level 2 project detail from:
 * - GET /api/v1/dashboard/projects/:frameworkId
 */

import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { resolveTargetFields } from '../utils/projectDashboard'
import type {
  ProjectInfo,
  ProjectSummary,
  ProjectActivity,
  TargetDisaggregation,
  ProjectLogframeSummary,
  ProjectDetailResponse,
} from '../interfaces/dashboard'

const BASE_URL = '/api/v1'

export const useProjectDetail = () => {
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

  const project = ref<ProjectInfo>({
    id: '',
    project_name: '',
    framework_type: '',
    partner_name: '',
    reporting_to: '',
    period_start: '',
    period_end: '',
  })

  const summary = ref<ProjectSummary>({
    unique_beneficiaries: 0,
    girls: 0,
    boys: 0,
    with_disability: 0,
    active_locations: 0,
    total_locations: 0,
    total_service_points: 0,
    total_target: 0,
    total_actual: 0,
  })

  // Dynamic target/actual structure derived from the project's logframe.
  const disaggregations = ref<TargetDisaggregation[]>([])

  // The project's M&E logframe. When present with targeted indicators it is the
  // authoritative target structure the dashboard renders.
  const logframe = ref<ProjectLogframeSummary | null>(null)

  const activities = ref<ProjectActivity[]>([])

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasData = computed(() => !!project.value.id)

  const sortedActivities = computed(() =>
    activities.value
      .filter(a => a.is_active)
      .sort((a, b) => a.name.localeCompare(b.name)),
  )

  const activeCount = computed(() => activities.value.filter(a => a.is_active).length)

  // Progress comes from the project's logframe only: actuals against the
  // numerical targets set on its indicators. Legacy framework/activity
  // targets are ignored so the dashboard always matches the logframe.
  function logframeProgress(levelId?: string): number | null {
    const indicators = (logframe.value?.indicators ?? []).filter(
      ind => (!levelId || ind.level_id === levelId) && ind.target_value != null && ind.target_value > 0,
    )
    if (!indicators.length) return null
    const target = indicators.reduce((sum, ind) => sum + (ind.target_value ?? 0), 0)
    const actual = indicators.reduce((sum, ind) => sum + (ind.actual_value ?? 0), 0)
    return Math.min(Math.round((actual / target) * 100), 100)
  }

  const overallProgress = computed(() => logframeProgress())

  // ── Formatters ─────────────────────────────────────────────────────────────
  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const formatType = (type: string): string =>
    type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const formatPattern = (pattern: string): string =>
    pattern.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchProjectDetail(frameworkId: string) {
    isLoading.value = true
    error.value = null

    try {
      const data = await apiFetch<ProjectDetailResponse>(`/dashboard/projects/${frameworkId}`)
      project.value = data.project
      summary.value = data.summary
      disaggregations.value = data.disaggregations ?? []
      logframe.value = data.logframe
        ? {
            ...data.logframe,
            indicators: (data.logframe.indicators ?? []).map(ind => ({ ...ind, target_fields: resolveTargetFields(ind) })),
          }
        : null
      activities.value = data.activities ?? []
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load project detail'
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    project,
    summary,
    disaggregations,
    logframe,
    activities,
    hasData,
    sortedActivities,
    activeCount,
    overallProgress,
    logframeProgress,
    formatDate,
    formatType,
    formatPattern,
    fetchProjectDetail,
  }
}
