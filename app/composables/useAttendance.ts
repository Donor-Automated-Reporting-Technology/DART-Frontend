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
    if (!centreId.value) return
    loading.value = true
    error.value = null
    submitted.value = false
    try {
      const list = await activityApi.getAttendanceBeneficiaries({
        date: date.value,
        centre_id: centreId.value,
        session_type: 'attendance',
      }) as AttendanceBeneficiary[]
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
    if (!centreId.value) return
    submitting.value = true
    error.value = null
    try {
      const session = await activityApi.createSession({
        cfs_location_id: centreId.value,
        session_date: date.value,
        session_type: 'attendance',
      }) as { id: string }

      await activityApi.recordAttendance({
        session_id: session.id,
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

  watch([date, centreId], () => {
    if (centreId.value) fetchBeneficiaries()
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
