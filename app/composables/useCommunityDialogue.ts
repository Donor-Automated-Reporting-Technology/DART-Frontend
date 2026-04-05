/**
 * useCommunityDialogue composable
 *
 * Manages community dialogue cohort groups: creation, enrollment, session tracking.
 * Sessions follow a cohort_sequential pattern (7 sessions, one per theme).
 */

import { ref, computed } from 'vue'
import { cohortApi } from '../services/cohortApi'
import { activityApi } from '../services/activityApi'
import type {
  CohortGroup,
  CohortEnrollment,
  CreateCohortGroupRequest,
} from '../interfaces/cohort'

export const CD_THEMES = [
  { name: 'Child Protection & Rights',       sessions: 1 },
  { name: 'Gender-Based Violence',           sessions: 1 },
  { name: 'Psychosocial Well-being',         sessions: 1 },
  { name: 'Positive Parenting',              sessions: 1 },
  { name: 'Community Safety & Reporting',    sessions: 1 },
  { name: 'Health & Hygiene',                sessions: 1 },
  { name: 'Closing & Action Planning',       sessions: 1 },
]

export const useCommunityDialogue = () => {
  const groups = ref<CohortGroup[]>([])
  const selectedGroup = ref<CohortGroup | null>(null)
  const enrollments = ref<CohortEnrollment[]>([])
  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  const currentTheme = ref(0)
  const sessionDate = ref(new Date().toISOString().slice(0, 10))

  const attendance = ref<Record<string, boolean>>({})

  const sessionProgress = computed(() => ({
    completed: 0,
    total: CD_THEMES.length,
  }))

  const totalEnrolled = computed(() => enrollments.value.filter(e => e.status === 'active').length)
  const totalDropped = computed(() => enrollments.value.filter(e => e.status === 'dropped_out').length)

  async function fetchGroups() {
    loading.value = true
    error.value = null
    try {
      const res = await cohortApi.listGroups()
      groups.value = (res.groups ?? []).filter((g: any) => g.activity_type === 'community_dialogue' || !g.activity_type)
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load groups'
    } finally {
      loading.value = false
    }
  }

  async function selectGroup(id: string) {
    loading.value = true
    error.value = null
    try {
      const res = await cohortApi.getGroupDetail(id)
      selectedGroup.value = res.group
      enrollments.value = res.enrollments ?? []
      attendance.value = {}
      enrollments.value.forEach(e => {
        if (e.status === 'active') attendance.value[e.beneficiary_id] = false
      })
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load group detail'
    } finally {
      loading.value = false
    }
  }

  async function createGroup(payload: CreateCohortGroupRequest) {
    submitting.value = true
    error.value = null
    try {
      const g = await cohortApi.createGroup(payload)
      groups.value.push(g)
      return g
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to create group'
      return null
    } finally {
      submitting.value = false
    }
  }

  async function enrollBeneficiaries(beneficiaryIds: string[]) {
    if (!selectedGroup.value) return
    submitting.value = true
    error.value = null
    try {
      await cohortApi.enrollBeneficiaries(selectedGroup.value.id, {
        beneficiary_ids: beneficiaryIds,
      })
      await selectGroup(selectedGroup.value.id)
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to enroll beneficiaries'
    } finally {
      submitting.value = false
    }
  }

  function toggleAttendance(beneficiaryId: string) {
    attendance.value[beneficiaryId] = !attendance.value[beneficiaryId]
  }

  async function submitSessionAttendance() {
    if (!selectedGroup.value) return
    submitting.value = true
    error.value = null
    try {
      const session = await activityApi.createSession({
        cfs_location_id: selectedGroup.value.service_point_id,
        session_date: sessionDate.value,
        session_type: 'community_dialogue',
        framework_activity_id: selectedGroup.value.framework_activity_id,
        activity_context: {
          cohort_group_id: selectedGroup.value.id,
          theme_index: currentTheme.value,
          theme_name: CD_THEMES[currentTheme.value]?.name,
        },
      }) as { id: string }

      await activityApi.recordAttendance({
        session_id: session.id,
        records: Object.entries(attendance.value).map(([bid, present]) => ({
          beneficiary_id: bid,
          status: present ? 'present' as const : 'absent' as const,
        })),
      })

      if (currentTheme.value < CD_THEMES.length - 1) {
        currentTheme.value++
      }

      Object.keys(attendance.value).forEach(k => { attendance.value[k] = false })
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to submit session'
    } finally {
      submitting.value = false
    }
  }

  return {
    groups, selectedGroup, enrollments, loading, submitting, error,
    currentTheme, sessionDate, attendance,
    sessionProgress, totalEnrolled, totalDropped,
    fetchGroups, selectGroup, createGroup, enrollBeneficiaries,
    toggleAttendance, submitSessionAttendance,
  }
}
