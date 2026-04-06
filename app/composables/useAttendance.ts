/**
 * useAttendance composable
 *
 * Manages attendance recording for the daily attendance activity.
 * Loads beneficiaries for a given date+centre, tracks selection,
 * and submits attendance records.
 */

import { ref, computed, watch } from 'vue'
import { activityApi } from '../services/activityApi'
import type { AttendanceBeneficiary } from '../services/activityApi'
import { ApiError } from '../services/api'
import { getBeneficiariesOffline, saveSessionOffline, saveAttendanceRecordsOffline } from '../services/offlineDb'
import { v4 as uuidv4 } from 'uuid'

export interface AttendanceRow extends AttendanceBeneficiary {
  selected: boolean
}

export const useAttendance = () => {
  const date = ref(new Date().toISOString().slice(0, 10))
  const centreId = ref('')
  const rows = ref<AttendanceRow[]>([])
  const loading = ref(false)
  const submitting = ref(false)
  const submitted = ref(false)
  const error = ref<string | null>(null)

  // derived
  const presentCount = computed(() => rows.value.filter(r => r.selected).length)
  const absentCount = computed(() => rows.value.filter(r => !r.selected).length)
  const totalCount = computed(() => rows.value.length)

  const genderBreakdown = computed(() => {
    const sel = rows.value.filter(r => r.selected)
    return {
      girls: sel.filter(r => r.sex === 'female').length,
      boys: sel.filter(r => r.sex === 'male').length,
    }
  })

  const disabilityCount = computed(() =>
    rows.value.filter(r => r.selected && r.disability_status !== 'none').length,
  )

  async function fetchBeneficiaries() {
    loading.value = true
    error.value = null
    submitted.value = false
    try {
      if (!navigator.onLine) {
        const offline = await getBeneficiariesOffline()
        rows.value = offline.map(b => ({
          id: b.serverId ?? b.id,
          full_name: [b.personalName, b.fatherName, b.grandfatherName, b.familyName]
            .filter(Boolean).join(' '),
          age: b.ageAtRegistration,
          sex: b.sex,
          disability_status: b.disabilityStatus,
          already_present: false,
          selected: false,
        }))
        return
      }
      const list = await activityApi.getAttendanceBeneficiaries()
      rows.value = (Array.isArray(list) ? list : []).map(b => ({
        ...b,
        selected: b.already_present,
      }))
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load beneficiaries'
    } finally {
      loading.value = false
    }
  }

  function toggleBeneficiary(id: string) {
    const row = rows.value.find(r => r.id === id)
    if (row) row.selected = !row.selected
  }

  function selectAll() { rows.value.forEach(r => { r.selected = true }) }
  function deselectAll() { rows.value.forEach(r => { r.selected = false }) }

  async function submitAttendance() {
    submitting.value = true
    error.value = null
    try {
      if (!navigator.onLine) {
        // Queue session + attendance records for later sync
        const sessionId = uuidv4()
        await saveSessionOffline({
          id: sessionId,
          sessionDate: date.value,
          sessionType: 'general_group_activity',
          syncStatus: 'pending',
          clientTimestamp: new Date().toISOString(),
        })
        await saveAttendanceRecordsOffline(rows.value.map(r => ({
          id: uuidv4(),
          sessionId,
          beneficiaryId: r.id,
          status: r.selected ? 'present' as const : 'absent' as const,
          syncStatus: 'pending' as const,
          clientTimestamp: new Date().toISOString(),
        })))
        submitted.value = true
        return
      }

      const session = await activityApi.createSession({
        session_date: date.value,
        session_type: 'general_group_activity',
      }) as { session: { id: string } }

      await activityApi.recordAttendance({
        session_id: session.session.id,
        records: rows.value.map(r => ({
          beneficiary_id: r.id,
          status: r.selected ? 'present' as const : 'absent' as const,
        })),
      })
      submitted.value = true
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to submit attendance'
    } finally {
      submitting.value = false
    }
  }

  watch([date], () => {
    fetchBeneficiaries()
  })

  return {
    date,
    centreId,
    rows,
    loading,
    submitting,
    submitted,
    error,
    presentCount,
    absentCount,
    totalCount,
    genderBreakdown,
    disabilityCount,
    fetchBeneficiaries,
    toggleBeneficiary,
    selectAll,
    deselectAll,
    submitAttendance,
  }
}
