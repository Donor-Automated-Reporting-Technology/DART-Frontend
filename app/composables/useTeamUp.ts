/**
 * useTeamUp composable
 *
 * Manages TeamUp cohort groups: creation, enrollment, session tracking.
 * Sessions follow a cohort_sequential pattern (20 sessions across modules).
 */

import { ref, computed, watch } from 'vue'
import { cohortApi } from '../services/cohortApi'
import { activityApi } from '../services/activityApi'
import type {
  CohortGroup,
  CohortEnrollment,
  CreateCohortGroupRequest,
} from '../interfaces/cohort'
import { ApiError } from '../services/api'

export const TEAMUP_MODULES = [
  { name: 'Fear & Assertiveness', sessions: 4 },
  { name: 'Anger',               sessions: 4 },
  { name: 'Cooperation',         sessions: 4 },
  { name: 'Conflict Resolution', sessions: 4 },
  { name: 'Closing Activities',  sessions: 4 },
]

export const useTeamUp = () => {
  const groups = ref<CohortGroup[]>([])
  const selectedGroup = ref<CohortGroup | null>(null)
  const enrollments = ref<CohortEnrollment[]>([])
  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  const currentModule = ref(0)
  const currentSession = ref(1)
  const sessionDate = ref(new Date().toISOString().slice(0, 10))

  // attendance map: beneficiary_id -> boolean (present today)
  const attendance = ref<Record<string, boolean>>({})

  // computed
  const sessionProgress = computed(() => {
    if (!selectedGroup.value) return { completed: 0, total: 20 }
    // total sessions from template
    const total = TEAMUP_MODULES.reduce((sum, m) => sum + m.sessions, 0)
    return { completed: 0, total } // actual completed driven by API data
  })

  const totalEnrolled = computed(() => enrollments.value.filter(e => e.status === 'active').length)
  const totalDropped = computed(() => enrollments.value.filter(e => e.status === 'dropped_out').length)

  async function fetchGroups() {
    loading.value = true
    error.value = null
    try {
      const res = await cohortApi.listGroups()
      groups.value = res.groups ?? []
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
      // reset attendance map
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
      // refresh enrollments
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
        session_type: 'teamup',
        framework_activity_id: selectedGroup.value.framework_activity_id,
        activity_context: {
          cohort_group_id: selectedGroup.value.id,
          module_index: currentModule.value,
          module_name: TEAMUP_MODULES[currentModule.value]?.name,
          session_number: currentSession.value,
        },
      }) as { id: string }

      await activityApi.recordAttendance({
        session_id: session.id,
        records: Object.entries(attendance.value).map(([bid, present]) => ({
          beneficiary_id: bid,
          status: present ? 'present' as const : 'absent' as const,
        })),
      })

      // advance session
      currentSession.value++
      const mod = TEAMUP_MODULES[currentModule.value]
      if (mod && currentSession.value > mod.sessions) {
        currentModule.value++
        currentSession.value = 1
      }

      // reset attendance
      Object.keys(attendance.value).forEach(k => { attendance.value[k] = false })
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to submit session'
    } finally {
      submitting.value = false
    }
  }

  return {
    groups,
    selectedGroup,
    enrollments,
    loading,
    submitting,
    error,
    currentModule,
    currentSession,
    sessionDate,
    attendance,
    sessionProgress,
    totalEnrolled,
    totalDropped,
    fetchGroups,
    selectGroup,
    createGroup,
    enrollBeneficiaries,
    toggleAttendance,
    submitSessionAttendance,
  }
}
