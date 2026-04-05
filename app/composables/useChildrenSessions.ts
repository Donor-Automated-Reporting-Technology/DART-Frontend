/**
 * useChildrenSessions composable
 *
 * Manages topic-based CP awareness sessions for children.
 * 6 topics — each child attends each topic once.
 */

import { ref, computed, watch } from 'vue'
import { activityApi } from '../services/activityApi'
import type { AttendanceBeneficiary } from '../services/activityApi'
import { ApiError } from '../services/api'

export const CP_TOPICS = [
  'Good Touch / Bad Touch',
  'My Body Belongs to Me',
  'Feeling Safe & Unsafe',
  'Trusted Adults',
  'Saying No',
  'Getting Help',
]

export interface ChildTopicRow {
  id: string
  full_name: string
  age: number
  sex: string
  disability_status: string
  /** Array of booleans per topic index — true = already attended */
  topicsDone: boolean[]
  /** Whether selected for attendance today */
  selected: boolean
}

export const useChildrenSessions = () => {
  const centreId = ref('')
  const selectedTopic = ref(0)
  const sessionDate = ref(new Date().toISOString().slice(0, 10))
  const rows = ref<ChildTopicRow[]>([])
  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  const presentCount = computed(() => rows.value.filter(r => r.selected).length)
  const totalCount = computed(() => rows.value.length)

  const topicCompletionCounts = computed(() =>
    CP_TOPICS.map((_, ti) => rows.value.filter(r => r.topicsDone[ti]).length),
  )

  async function fetchBeneficiariesWithTopicProgress() {
    if (!centreId.value) return
    loading.value = true
    error.value = null
    try {
      const list = await activityApi.getAttendanceBeneficiaries({
        date: sessionDate.value,
        centre_id: centreId.value,
        session_type: 'children_sessions',
      }) as (AttendanceBeneficiary & { topic_progress?: boolean[] })[]

      rows.value = (Array.isArray(list) ? list : []).map(b => ({
        id: b.id,
        full_name: b.full_name,
        age: b.age,
        sex: b.sex,
        disability_status: b.disability_status,
        topicsDone: b.topic_progress ?? CP_TOPICS.map(() => false),
        selected: false,
      }))
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load beneficiaries'
    } finally {
      loading.value = false
    }
  }

  function toggleChild(id: string) {
    const row = rows.value.find(r => r.id === id)
    if (row) row.selected = !row.selected
  }

  function selectAll() { rows.value.forEach(r => { r.selected = true }) }
  function deselectAll() { rows.value.forEach(r => { r.selected = false }) }

  async function submitTopicAttendance() {
    if (!centreId.value) return
    submitting.value = true
    error.value = null
    try {
      const session = await activityApi.createSession({
        cfs_location_id: centreId.value,
        session_date: sessionDate.value,
        session_type: 'children_sessions',
        activity_context: {
          topic_index: selectedTopic.value,
          topic_name: CP_TOPICS[selectedTopic.value],
        },
      }) as { id: string }

      await activityApi.recordAttendance({
        session_id: session.id,
        records: rows.value.map(r => ({
          beneficiary_id: r.id,
          status: r.selected ? 'present' as const : 'absent' as const,
        })),
      })

      // mark topic done locally
      rows.value.forEach(r => {
        if (r.selected) r.topicsDone[selectedTopic.value] = true
        r.selected = false
      })
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to submit topic attendance'
    } finally {
      submitting.value = false
    }
  }

  watch([centreId, sessionDate], () => {
    if (centreId.value) fetchBeneficiariesWithTopicProgress()
  })

  return {
    centreId,
    selectedTopic,
    sessionDate,
    rows,
    loading,
    submitting,
    error,
    presentCount,
    totalCount,
    topicCompletionCounts,
    fetchBeneficiariesWithTopicProgress,
    toggleChild,
    selectAll,
    deselectAll,
    submitTopicAttendance,
  }
}
