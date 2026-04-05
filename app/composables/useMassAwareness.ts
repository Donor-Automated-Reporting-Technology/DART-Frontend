/**
 * useMassAwareness composable
 *
 * Manages mass awareness events with aggregate participant counts.
 * Pattern: aggregate_event — no individual registration, just totals.
 */

import { ref, computed, reactive } from 'vue'
import { activityApi } from '../services/activityApi'
import { getActivePinia } from 'pinia'

const BASE_URL = '/api/v1'

function resolveToken(): string | undefined {
  try {
    const pinia = getActivePinia()
    const authState = pinia?.state.value?.['auth'] as { accessToken?: string | null } | undefined
    return authState?.accessToken ?? undefined
  } catch { return undefined }
}

export interface MassAwarenessEvent {
  id: string
  event_name: string
  event_date: string
  location_name: string
  total_participants: number
  girls: number
  boys: number
  women: number
  men: number
  disability_male: number
  disability_female: number
  community_leader_contact: string
  notes: string
}

export const useMassAwareness = () => {
  const events = ref<MassAwarenessEvent[]>([])
  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  const form = reactive({
    event_name: '',
    event_date: new Date().toISOString().slice(0, 10),
    cfs_location_id: '',
    community_leader_contact: '',
    girls: 0,
    boys: 0,
    women: 0,
    men: 0,
    disability_male: 0,
    disability_female: 0,
    notes: '',
  })

  const totalParticipants = computed(() =>
    form.girls + form.boys + form.women + form.men,
  )

  function resetForm() {
    form.event_name = ''
    form.event_date = new Date().toISOString().slice(0, 10)
    form.cfs_location_id = ''
    form.community_leader_contact = ''
    form.girls = 0
    form.boys = 0
    form.women = 0
    form.men = 0
    form.disability_male = 0
    form.disability_female = 0
    form.notes = ''
  }

  async function fetchEvents() {
    loading.value = true
    error.value = null
    try {
      const token = resolveToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${BASE_URL}/cfs/sessions?session_type=mass_awareness`, { headers })
      const raw = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(raw?.message ?? 'Failed to fetch events')

      const sessions = raw?.data?.sessions ?? raw?.data ?? []
      events.value = sessions.map((s: any) => ({
        id: s.id,
        event_name: s.activity_context?.event_name ?? 'Unnamed Event',
        event_date: s.session_date,
        location_name: s.location_name ?? '',
        total_participants: (s.activity_context?.girls ?? 0) + (s.activity_context?.boys ?? 0) +
          (s.activity_context?.women ?? 0) + (s.activity_context?.men ?? 0),
        girls: s.activity_context?.girls ?? 0,
        boys: s.activity_context?.boys ?? 0,
        women: s.activity_context?.women ?? 0,
        men: s.activity_context?.men ?? 0,
        disability_male: s.activity_context?.disability_male ?? 0,
        disability_female: s.activity_context?.disability_female ?? 0,
        community_leader_contact: s.activity_context?.community_leader_contact ?? '',
        notes: s.activity_context?.notes ?? '',
      }))
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load events'
    } finally {
      loading.value = false
    }
  }

  async function submitEvent(frameworkActivityId: string) {
    submitting.value = true
    error.value = null
    try {
      await activityApi.createSession({
        cfs_location_id: form.cfs_location_id,
        session_date: form.event_date,
        session_type: 'mass_awareness',
        framework_activity_id: frameworkActivityId,
        activity_context: {
          event_name: form.event_name,
          community_leader_contact: form.community_leader_contact,
          girls: form.girls,
          boys: form.boys,
          women: form.women,
          men: form.men,
          disability_male: form.disability_male,
          disability_female: form.disability_female,
          notes: form.notes,
        },
      })

      resetForm()
      await fetchEvents()
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to submit event'
    } finally {
      submitting.value = false
    }
  }

  return {
    events, loading, submitting, error,
    form, totalParticipants,
    fetchEvents, submitEvent, resetForm,
  }
}
