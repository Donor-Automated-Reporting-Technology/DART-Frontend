/**
 * useCaseManagement composable
 *
 * Manages child protection cases with status workflow: Open -> Active -> Follow-up -> Closed.
 * Pattern: case_workflow.
 */

import { ref, reactive } from 'vue'
import { getActivePinia } from 'pinia'

const BASE_URL = '/api/v1'

function resolveToken(): string | undefined {
  try {
    const pinia = getActivePinia()
    const authState = pinia?.state.value?.['auth'] as { accessToken?: string | null } | undefined
    return authState?.accessToken ?? undefined
  } catch { return undefined }
}

export type CaseStatus = 'open' | 'active' | 'follow_up' | 'closed'
export const CASE_STATUSES: CaseStatus[] = ['open', 'active', 'follow_up', 'closed']

export const VULNERABILITY_CATEGORIES = [
  'Sexual Violence',
  'Physical Violence',
  'Emotional Violence',
  'Neglect',
  'Child Labour',
  'Child Marriage',
  'Unaccompanied / Separated',
  'Other',
]

export const CASE_HANDLING = ['WCH Direct', 'Referred'] as const
export type CaseHandling = (typeof CASE_HANDLING)[number]

export interface ProtectionCase {
  id: string
  case_number: string
  beneficiary_id: string
  beneficiary_name: string
  status: CaseStatus
  vulnerability_category: string
  case_handling: string
  support_type: string
  referred_agency: string
  last_monitored: string
  notes: string
  created_at: string
}

export interface CaseTimelineEntry {
  date: string
  status: CaseStatus
  note: string
}

export const useCaseManagement = () => {
  const cases = ref<ProtectionCase[]>([])
  const selectedCase = ref<ProtectionCase | null>(null)
  const timeline = ref<CaseTimelineEntry[]>([])
  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  const statusFilter = ref<CaseStatus | ''>('')
  const searchQuery = ref('')

  const form = reactive({
    beneficiary_id: '',
    case_number: '',
    vulnerability_category: '',
    case_handling: '' as string,
    support_type: '',
    referred_agency: '',
    notes: '',
  })

  function resetForm() {
    form.beneficiary_id = ''
    form.case_number = ''
    form.vulnerability_category = ''
    form.case_handling = ''
    form.support_type = ''
    form.referred_agency = ''
    form.notes = ''
  }

  async function apiFetch(path: string, options?: RequestInit) {
    const token = resolveToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string> ?? {}) }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
    const raw = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(raw?.message ?? 'Request failed')
    return raw?.data ?? raw
  }

  async function fetchCases() {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (statusFilter.value) params.set('status', statusFilter.value)
      if (searchQuery.value) params.set('search', searchQuery.value)
      const data = await apiFetch(`/cases?${params}`)
      cases.value = data?.cases ?? data ?? []
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load cases'
    } finally {
      loading.value = false
    }
  }

  async function createCase(frameworkActivityId: string) {
    submitting.value = true
    error.value = null
    try {
      await apiFetch('/cases', {
        method: 'POST',
        body: JSON.stringify({
          framework_activity_id: frameworkActivityId,
          beneficiary_id: form.beneficiary_id,
          case_number: form.case_number,
          vulnerability_category: form.vulnerability_category,
          case_handling: form.case_handling,
          support_type: form.support_type,
          referred_agency: form.referred_agency,
          notes: form.notes,
        }),
      })
      resetForm()
      await fetchCases()
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to create case'
    } finally {
      submitting.value = false
    }
  }

  async function selectCase(id: string) {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch(`/cases/${encodeURIComponent(id)}`)
      selectedCase.value = data?.case ?? data
      timeline.value = data?.timeline ?? []
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load case'
    } finally {
      loading.value = false
    }
  }

  async function updateStatus(id: string, newStatus: CaseStatus, note: string) {
    submitting.value = true
    error.value = null
    try {
      await apiFetch(`/cases/${encodeURIComponent(id)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, note }),
      })
      await selectCase(id)
      await fetchCases()
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to update status'
    } finally {
      submitting.value = false
    }
  }

  function closeDetail() {
    selectedCase.value = null
    timeline.value = []
  }

  return {
    cases, selectedCase, timeline, loading, submitting, error,
    statusFilter, searchQuery, form,
    fetchCases, createCase, selectCase, updateStatus, closeDetail, resetForm,
  }
}
