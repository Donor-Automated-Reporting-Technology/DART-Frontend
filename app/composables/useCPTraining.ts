/**
 * useCPTraining composable
 *
 * Manages CP training events with participant registration and pre/post test scores.
 * Pattern: training_event.
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

export const PARTICIPANT_CATEGORIES = [
  'CPC',
  'PCCC',
  'Community Leader',
  'Teacher',
  'Religious Leader',
  'Government Official',
  'Other',
]

export interface TrainingEvent {
  id: string
  name: string
  date: string
  location_name: string
  participant_count: number
  created_at: string
}

export interface TrainingParticipant {
  id: string
  beneficiary_id: string
  beneficiary_name: string
  category: string
  pre_test_score: number | null
  post_test_score: number | null
}

export const useCPTraining = () => {
  const events = ref<TrainingEvent[]>([])
  const selectedEvent = ref<TrainingEvent | null>(null)
  const participants = ref<TrainingParticipant[]>([])
  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  const form = reactive({
    name: '',
    date: new Date().toISOString().slice(0, 10),
    cfs_location_id: '',
  })

  function resetForm() {
    form.name = ''
    form.date = new Date().toISOString().slice(0, 10)
    form.cfs_location_id = ''
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

  async function fetchEvents() {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch('/trainings')
      events.value = data?.trainings ?? data ?? []
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load trainings'
    } finally {
      loading.value = false
    }
  }

  async function createEvent(frameworkActivityId: string) {
    submitting.value = true
    error.value = null
    try {
      await apiFetch('/trainings', {
        method: 'POST',
        body: JSON.stringify({
          framework_activity_id: frameworkActivityId,
          name: form.name,
          date: form.date,
          cfs_location_id: form.cfs_location_id,
        }),
      })
      resetForm()
      await fetchEvents()
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to create training'
    } finally {
      submitting.value = false
    }
  }

  async function selectEvent(id: string) {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch(`/trainings/${encodeURIComponent(id)}`)
      selectedEvent.value = data?.training ?? data
      participants.value = data?.participants ?? []
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load training detail'
    } finally {
      loading.value = false
    }
  }

  async function addParticipant(trainingId: string, beneficiaryId: string, category: string) {
    submitting.value = true
    error.value = null
    try {
      await apiFetch(`/trainings/${encodeURIComponent(trainingId)}/participants`, {
        method: 'POST',
        body: JSON.stringify({ beneficiary_id: beneficiaryId, category }),
      })
      await selectEvent(trainingId)
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to add participant'
    } finally {
      submitting.value = false
    }
  }

  async function updateScores(trainingId: string, participantId: string, preScore: number | null, postScore: number | null) {
    submitting.value = true
    error.value = null
    try {
      await apiFetch(`/trainings/${encodeURIComponent(trainingId)}/participants/${encodeURIComponent(participantId)}/scores`, {
        method: 'PUT',
        body: JSON.stringify({ pre_test_score: preScore, post_test_score: postScore }),
      })
      await selectEvent(trainingId)
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to update scores'
    } finally {
      submitting.value = false
    }
  }

  function closeDetail() {
    selectedEvent.value = null
    participants.value = []
  }

  return {
    events, selectedEvent, participants, loading, submitting, error,
    form,
    fetchEvents, createEvent, selectEvent, addParticipant, updateScores, closeDetail, resetForm,
  }
}
