import { getActivePinia } from 'pinia'
import { ApiError } from './api'
import type {
  CreateTeamUpGroupRequest,
  EligibleBeneficiary,
  StartTeamUpSessionRequest,
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

const BASE_URL = '/api/v1/teamup'

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

export const teamupApi = {
  getCurriculum: () => request<TeamUpCurriculum>(`${BASE_URL}/curriculum`),

  listGroups: (cfsLocationId?: string) =>
    request<TeamUpGroup[]>(`${BASE_URL}/groups${cfsLocationId ? `?cfs_location_id=${cfsLocationId}` : ''}`),
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

  downloadDRA: (params: { groupId?: string; cfsLocationId?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.groupId) qs.set('group_id', params.groupId)
    if (params.cfsLocationId) qs.set('cfs_location_id', params.cfsLocationId)
    const q = qs.toString()
    return download(`${BASE_URL}/export${q ? `?${q}` : ''}`, 'TeamUp_DRA.xlsx')
  },
}

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
