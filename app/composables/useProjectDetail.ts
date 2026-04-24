/**
 * useProjectDetail composable
 *
 * Fetches Level 2 project detail from:
 * - GET /api/v1/dashboard/projects/:frameworkId
 */

import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import type {
  ProjectInfo,
  ProjectSummary,
  ProjectActivity,
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
    target_breakdown: { girls: 0, boys: 0, girls_with_disability: 0, boys_with_disability: 0 },
  })

  const activities = ref<ProjectActivity[]>([])

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasData = computed(() => !!project.value.id)

  const sortedActivities = computed(() =>
    activities.value
      .filter(a => a.is_active)
      .sort((a, b) => a.name.localeCompare(b.name)),
  )

  const activeCount = computed(() => activities.value.filter(a => a.is_active).length)

  const overallProgress = computed(() => {
    const tb = summary.value.target_breakdown
    const totalTarget = tb.girls + tb.boys
    if (!totalTarget) return 0
    return Math.min(Math.round((summary.value.unique_beneficiaries / totalTarget) * 100), 100)
  })

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
    activities,
    hasData,
    sortedActivities,
    activeCount,
    overallProgress,
    formatDate,
    formatType,
    formatPattern,
    fetchProjectDetail,
  }
}
