/**
 * useIGA composable
 *
 * Manages IGA (Income Generating Activities) participant tracking.
 * Pattern: case_workflow with status: enrolled -> training -> grant_received -> graduated.
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

export type IGAStatus = 'enrolled' | 'training' | 'grant_received' | 'graduated'
export const IGA_STATUSES: IGAStatus[] = ['enrolled', 'training', 'grant_received', 'graduated']

export const IGA_TRAINING_TYPES = [
  'Financial Literacy',
  'Business Skills',
  'Vocational Training',
  'Agricultural Skills',
  'Other',
]

export const IGA_LIVELIHOOD_TYPES = [
  'Petty Trade',
  'Agriculture',
  'Livestock',
  'Tailoring',
  'Food Processing',
  'Other',
]

export interface IGAParticipant {
  id: string
  beneficiary_id: string
  beneficiary_name: string
  status: IGAStatus
  training_type: string
  livelihood_type: string
  grant_amount: number
  notes: string
  created_at: string
}

export const useIGA = () => {
  const participants = ref<IGAParticipant[]>([])
  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  const statusFilter = ref<IGAStatus | ''>('')

  const form = reactive({
    beneficiary_id: '',
    training_type: '',
    livelihood_type: '',
    grant_amount: 0,
    notes: '',
  })

  function resetForm() {
    form.beneficiary_id = ''
    form.training_type = ''
    form.livelihood_type = ''
    form.grant_amount = 0
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

  async function fetchParticipants() {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (statusFilter.value) params.set('status', statusFilter.value)
      const data = await apiFetch(`/iga/participants?${params}`)
      participants.value = data?.participants ?? data ?? []
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load participants'
    } finally {
      loading.value = false
    }
  }

  async function enrollParticipant(frameworkActivityId: string) {
    submitting.value = true
    error.value = null
    try {
      await apiFetch('/iga/participants', {
        method: 'POST',
        body: JSON.stringify({
          framework_activity_id: frameworkActivityId,
          beneficiary_id: form.beneficiary_id,
          training_type: form.training_type,
          livelihood_type: form.livelihood_type,
          grant_amount: form.grant_amount,
          notes: form.notes,
        }),
      })
      resetForm()
      await fetchParticipants()
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to enroll participant'
    } finally {
      submitting.value = false
    }
  }

  async function updateStatus(participantId: string, newStatus: IGAStatus, note: string) {
    submitting.value = true
    error.value = null
    try {
      await apiFetch(`/iga/participants/${encodeURIComponent(participantId)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, note }),
      })
      await fetchParticipants()
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to update status'
    } finally {
      submitting.value = false
    }
  }

  return {
    participants, loading, submitting, error,
    statusFilter, form,
    fetchParticipants, enrollParticipant, updateStatus, resetForm,
  }
}
