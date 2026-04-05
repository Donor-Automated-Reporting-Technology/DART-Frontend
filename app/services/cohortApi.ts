import { getActivePinia } from 'pinia'
import { ApiError } from './api'
import type {
  CohortGroup,
  CohortGroupListResponse,
  CohortGroupDetailResponse,
  CreateCohortGroupRequest,
  EnrollRequest,
  UpdateEnrollmentRequest,
} from '../interfaces/cohort'

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

export const cohortApi = {
  async createGroup(payload: CreateCohortGroupRequest, token?: string): Promise<CohortGroup> {
    return request<CohortGroup>(`${BASE_URL}/cohorts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token)
  },

  async listGroups(token?: string): Promise<CohortGroupListResponse> {
    return request<CohortGroupListResponse>(`${BASE_URL}/cohorts`, { method: 'GET' }, token)
  },

  async getGroupDetail(id: string, token?: string): Promise<CohortGroupDetailResponse> {
    return request<CohortGroupDetailResponse>(`${BASE_URL}/cohorts/${id}`, { method: 'GET' }, token)
  },

  async enrollBeneficiaries(groupId: string, payload: EnrollRequest, token?: string) {
    return request(`${BASE_URL}/cohorts/${groupId}/enroll`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token)
  },

  async updateEnrollment(
    groupId: string,
    enrollmentId: string,
    payload: UpdateEnrollmentRequest,
    token?: string,
  ) {
    return request(`${BASE_URL}/cohorts/${groupId}/enrollments/${enrollmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, token)
  },
}
