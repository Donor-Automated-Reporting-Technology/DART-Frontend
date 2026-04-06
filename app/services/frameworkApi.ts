import { getActivePinia } from 'pinia'
import { ApiError } from './api'
import type {
  Framework,
  FrameworkActivity,
  CreateFrameworkRequest,
  UpdateFrameworkRequest,
  ToggleActivityRequest,
  SetTargetRequest,
  FrameworkListResponse,
  FrameworkActivitiesResponse,
  ActivityTemplate,
  ActivityTemplatesResponse,
} from '../interfaces/framework'

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

export const frameworkApi = {
  async listFrameworks(token?: string): Promise<FrameworkListResponse> {
    return request<FrameworkListResponse>(`${BASE_URL}/frameworks`, { method: 'GET' }, token)
  },

  async createFramework(payload: CreateFrameworkRequest, token?: string): Promise<Framework> {
    return request<Framework>(`${BASE_URL}/frameworks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token)
  },

  async updateFramework(id: string, payload: UpdateFrameworkRequest, token?: string): Promise<Framework> {
    return request<Framework>(`${BASE_URL}/frameworks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, token)
  },

  async getActivities(frameworkId: string, token?: string): Promise<FrameworkActivitiesResponse> {
    return request<FrameworkActivitiesResponse>(
      `${BASE_URL}/frameworks/${frameworkId}/activities`,
      { method: 'GET' },
      token,
    )
  },

  async toggleActivity(
    frameworkId: string,
    activityId: string,
    payload: ToggleActivityRequest,
    token?: string,
  ): Promise<FrameworkActivity> {
    return request<FrameworkActivity>(
      `${BASE_URL}/frameworks/${frameworkId}/activities/${activityId}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
      token,
    )
  },

  async setTarget(
    frameworkId: string,
    activityId: string,
    payload: SetTargetRequest,
    token?: string,
  ): Promise<FrameworkActivity> {
    return request<FrameworkActivity>(
      `${BASE_URL}/frameworks/${frameworkId}/activities/${activityId}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
      token,
    )
  },

  async getTemplates(frameworkType?: string, token?: string): Promise<ActivityTemplatesResponse> {
    const qs = frameworkType ? `?framework_type=${frameworkType}` : ''
    return request<ActivityTemplatesResponse>(
      `${BASE_URL}/activity-templates${qs}`,
      { method: 'GET' },
      token,
    )
  },
}
