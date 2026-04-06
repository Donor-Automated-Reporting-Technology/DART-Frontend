import { getActivePinia } from 'pinia'
import { ApiError } from './api'

const BASE_URL = '/api/v1'

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

async function request<T>(url: string, options: RequestInit = {}, token?: string): Promise<T> {
  const resolved = resolveToken(token)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(resolved ? { Authorization: `Bearer ${resolved}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  }
  const response = await fetch(url, { ...options, headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(response.status, data?.message ?? 'Request failed', data)
  }
  return (data?.data !== undefined ? data.data : data) as T
}

export interface CreateSessionRequest {
  session_date: string
  session_type: string
}

export interface RecordAttendanceRequest {
  session_id: string
  records: Array<{ beneficiary_id: string; status: 'present' | 'absent' }>
}

/** Raw shape returned by GET /cfs/beneficiaries */
interface BeneficiaryListItem {
  id: string
  personal_name: string
  father_name: string
  grandfather_name?: string
  family_name?: string
  age_at_registration: number
  sex: string
  disability_status: string
}

export interface AttendanceBeneficiary {
  id: string
  full_name: string
  age: number
  sex: string
  disability_status: string
  already_present: boolean
}

export const activityApi = {
  async createSession(payload: CreateSessionRequest, token?: string) {
    return request(`${BASE_URL}/cfs/sessions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token)
  },

  async recordAttendance(payload: RecordAttendanceRequest, token?: string) {
    return request(`${BASE_URL}/cfs/attendance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token)
  },

  async getAttendanceBeneficiaries(
    _params?: { date?: string; centre_id?: string; session_type?: string },
    token?: string,
  ): Promise<AttendanceBeneficiary[]> {
    const raw = await request<BeneficiaryListItem[]>(
      `${BASE_URL}/cfs/beneficiaries`,
      { method: 'GET' },
      token,
    )
    return (Array.isArray(raw) ? raw : []).map((b) => ({
      id: b.id,
      full_name: [b.personal_name, b.father_name, b.grandfather_name, b.family_name]
        .filter(Boolean)
        .join(' '),
      age: b.age_at_registration,
      sex: b.sex,
      disability_status: b.disability_status,
      already_present: false,
    }))
  },
}
