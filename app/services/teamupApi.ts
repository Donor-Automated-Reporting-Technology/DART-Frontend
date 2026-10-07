import { getActivePinia } from 'pinia'
import { ApiError } from './api'
import { COHORT_PROGRAMS, type CohortProgramKey } from '../utils/cohortPrograms'
import type {
  CreateTeamUpGroupRequest,
  EligibleBeneficiary,
  SaveCurriculumRequest,
  StartTeamUpSessionRequest,
  TeamUpDashboard,
  TeamUpAttendance,
  TeamUpCurriculum,
  TeamUpEnrollResult,
  TeamUpEnrollment,
  TeamUpFlag,
  TeamUpGroup,
  TeamUpGroupDetail,
  TeamUpGroupReport,
  TeamUpSession,
  TeamUpSessionDetail,
  AttendanceStatus,
  UpdateTeamUpEnrollmentRequest,
  UpdateTeamUpSessionRequest,
} from '../interfaces/teamup'


function resolveToken(explicit?: string): string | undefined {
  if (explicit) return explicit
  try {
    const pinia = getActivePinia()
    const authState = pinia?.state.value?.['auth'] as { accessToken?: string | null } | undefined
    return authState?.accessToken ?? undefined
  } catch {
    return undefined
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = resolveToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  }
  const response = await fetch(url, { ...options, headers })
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(response.status, data?.message ?? 'Request failed', data)
  }
  return (data?.data !== undefined ? data.data : data) as T
}

async function download(url: string, fallbackName: string): Promise<void> {
  const token = resolveToken()
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(response.status, data?.message ?? 'Download failed', data)
  }
  const blob = await response.blob()
  const match = response.headers.get('Content-Disposition')?.match(/filename[^;=\n]*=\s*"?([^";\n]+)"?/)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = match?.[1] ?? fallbackName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}

const json = (body: unknown) => JSON.stringify(body)

/**
 * API client for one cohort programme. The same endpoints are mounted for
 * every programme under /api/v1/<route> (teamup, parenting, community-dialogue).
 */
export function cohortApi(program: CohortProgramKey) {
  const BASE_URL = `/api/v1/${COHORT_PROGRAMS[program].route}`
  return {
    getCurriculum: () => request<TeamUpCurriculum>(`${BASE_URL}/curriculum`),
    listCurricula: () => request<TeamUpCurriculum[]>(`${BASE_URL}/curricula`),
    getCurriculumById: (id: string) => request<TeamUpCurriculum>(`${BASE_URL}/curricula/${id}`),
    createCurriculum: (payload: SaveCurriculumRequest) =>
      request<TeamUpCurriculum>(`${BASE_URL}/curricula`, { method: 'POST', body: json(payload) }),
    updateCurriculum: (id: string, payload: SaveCurriculumRequest) =>
      request<TeamUpCurriculum>(`${BASE_URL}/curricula/${id}`, { method: 'PUT', body: json(payload) }),
    deleteCurriculum: (id: string) => request<void>(`${BASE_URL}/curricula/${id}`, { method: 'DELETE' }),

    listGroups: (params: { cfsLocationId?: string; frameworkActivityId?: string } = {}) => {
      const qs = new URLSearchParams()
      if (params.cfsLocationId) qs.set('cfs_location_id', params.cfsLocationId)
      if (params.frameworkActivityId) qs.set('framework_activity_id', params.frameworkActivityId)
      const q = qs.toString()
      return request<TeamUpGroup[]>(`${BASE_URL}/groups${q ? `?${q}` : ''}`)
    },
    createGroup: (payload: CreateTeamUpGroupRequest) =>
      request<TeamUpGroup>(`${BASE_URL}/groups`, { method: 'POST', body: json(payload) }),
    getGroup: (id: string) => request<TeamUpGroupDetail>(`${BASE_URL}/groups/${id}`),
    listEligible: (id: string) => request<EligibleBeneficiary[]>(`${BASE_URL}/groups/${id}/eligible`),
    enroll: (id: string, beneficiaryIds: string[]) =>
      request<TeamUpEnrollResult>(`${BASE_URL}/groups/${id}/enroll`, {
        method: 'POST',
        body: json({ beneficiary_ids: beneficiaryIds }),
      }),
    updateEnrollment: (groupId: string, enrollmentId: string, payload: UpdateTeamUpEnrollmentRequest) =>
      request<TeamUpEnrollment>(`${BASE_URL}/groups/${groupId}/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        body: json(payload),
      }),
    startSession: (groupId: string, payload: StartTeamUpSessionRequest) =>
      request<TeamUpSessionDetail>(`${BASE_URL}/groups/${groupId}/sessions`, { method: 'POST', body: json(payload) }),
    getReport: (groupId: string) => request<TeamUpGroupReport>(`${BASE_URL}/groups/${groupId}/report`),

    getSession: (id: string) => request<TeamUpSessionDetail>(`${BASE_URL}/sessions/${id}`),
    updateSession: (id: string, payload: UpdateTeamUpSessionRequest) =>
      request<TeamUpSession>(`${BASE_URL}/sessions/${id}`, { method: 'PATCH', body: json(payload) }),
    markAttendance: (id: string, entries: { beneficiary_id: string; status: AttendanceStatus }[]) =>
      request<TeamUpAttendance[]>(`${BASE_URL}/sessions/${id}/attendance`, {
        method: 'POST',
        body: json({ entries, client_timestamp: new Date().toISOString() }),
      }),
    setBlock: (id: string, blockId: string, completed: boolean) =>
      request<void>(`${BASE_URL}/sessions/${id}/blocks/${blockId}`, { method: 'PATCH', body: json({ completed }) }),
    flagChild: (id: string, beneficiaryId: string, concern: string, clientUuid: string) =>
      request<TeamUpFlag>(`${BASE_URL}/sessions/${id}/flags`, {
        method: 'POST',
        body: json({ beneficiary_id: beneficiaryId, concern, client_uuid: clientUuid }),
      }),
    completeSession: (id: string, payload: UpdateTeamUpSessionRequest) =>
      request<TeamUpSession>(`${BASE_URL}/sessions/${id}/complete`, { method: 'PATCH', body: json(payload) }),

    listSessions: (params: { from: string; to: string; mine?: boolean; frameworkActivityId?: string }) => {
      const qs = new URLSearchParams({ from: params.from, to: params.to })
      if (params.mine) qs.set('mine', '1')
      if (params.frameworkActivityId) qs.set('framework_activity_id', params.frameworkActivityId)
      return request<TeamUpSessionDetail[]>(`${BASE_URL}/sessions?${qs.toString()}`)
    },

    getDashboard: (frameworkActivityId: string, cfsLocationId?: string) =>
      request<TeamUpDashboard>(
        `${BASE_URL}/dashboard/${frameworkActivityId}${cfsLocationId ? `?cfs_location_id=${cfsLocationId}` : ''}`,
      ),

    downloadExcel: (params: { groupId?: string; cfsLocationId?: string; frameworkActivityId?: string } = {}) => {
      const qs = new URLSearchParams()
      if (params.groupId) qs.set('group_id', params.groupId)
      if (params.cfsLocationId) qs.set('cfs_location_id', params.cfsLocationId)
      if (params.frameworkActivityId) qs.set('framework_activity_id', params.frameworkActivityId)
      const q = qs.toString()
      return download(`${BASE_URL}/export${q ? `?${q}` : ''}`, `${COHORT_PROGRAMS[program].label}_Attendance.xlsx`)
    },
  }
}

export const teamupApi = cohortApi('teamup')

/**
 * Roles allowed to download activity databases (Excel). Facilitators and other
 * field roles use Word reports instead. Mirrors dataExportRoles in the API.
 */
export const DATA_EXPORT_ROLES = ['org_admin', 'program_manager', 'data_manager']
export const canDownloadData = (role?: string | null) => !!role && DATA_EXPORT_ROLES.includes(role)

/** Download any authenticated file endpoint (used for the project workbook). */
export const downloadFile = (url: string, fallbackName: string) => download(url, fallbackName)

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const BLOCK_LABELS: Record<string, string> = {
  check_in: 'Check-in',
  warm_up: 'Warm-up',
  game: 'Game',
  cool_down: 'Cool-down',
  check_out: 'Check-out',
}

export function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
