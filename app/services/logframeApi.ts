import { getActivePinia } from 'pinia'
import { ApiError } from './api'
import type {
  Logframe,
  LogframeData,
  LogframeImpactData,
  LogframeTemplateInfo,
  LogframeUpsertRequest,
  LogframeLevel,
  LogframeLevelRequest,
  LogframeIndicator,
  LogframeIndicatorRequest,
  LogframeImportRequest,
  LogframeLinkActivityRequest,
} from '../interfaces/logframe'

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
  // DELETE endpoints may return 204 with no body
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(response.status, data?.message ?? 'Request failed', data)
  }
  return (data?.data !== undefined ? data.data : data) as T
}

export const logframeApi = {
  /** Full logframe tree of a project (metadata, levels, indicators). */
  async getLogframe(frameworkId: string, token?: string): Promise<LogframeData> {
    return request<LogframeData>(
      `${BASE_URL}/frameworks/${frameworkId}/logframe`,
      { method: 'GET' },
      token,
    )
  },

  /**
   * Impact view of the project's logframe: hierarchy levels, every indicator
   * with its numeric target, the activities linked to each indicator (with
   * live actual counts) and a headline summary.
   */
  async getImpact(frameworkId: string, token?: string): Promise<LogframeImpactData> {
    return request<LogframeImpactData>(
      `${BASE_URL}/frameworks/${frameworkId}/logframe/impact`,
      { method: 'GET' },
      token,
    )
  },

  /** Create or update the logframe metadata. */
  async upsertLogframe(
    frameworkId: string,
    payload: LogframeUpsertRequest,
    token?: string,
  ): Promise<Logframe> {
    return request<Logframe>(
      `${BASE_URL}/frameworks/${frameworkId}/logframe`,
      { method: 'PUT', body: JSON.stringify(payload) },
      token,
    )
  },

  /** List importable donor templates. */
  async listTemplates(frameworkId: string, token?: string): Promise<LogframeTemplateInfo[]> {
    return request<LogframeTemplateInfo[]>(
      `${BASE_URL}/frameworks/${frameworkId}/logframe/templates`,
      { method: 'GET' },
      token,
    )
  },

  /** Import a donor template into the logframe. */
  async importTemplate(
    frameworkId: string,
    payload: LogframeImportRequest,
    token?: string,
  ): Promise<LogframeData> {
    return request<LogframeData>(
      `${BASE_URL}/frameworks/${frameworkId}/logframe/import`,
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    )
  },

  /** Add a hierarchy level (goal/outcome/result/activity). */
  async createLevel(
    frameworkId: string,
    payload: LogframeLevelRequest,
    token?: string,
  ): Promise<LogframeLevel> {
    return request<LogframeLevel>(
      `${BASE_URL}/frameworks/${frameworkId}/logframe/levels`,
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    )
  },

  /** Update a hierarchy level (re-parenting is cycle-safe). */
  async updateLevel(
    frameworkId: string,
    levelId: string,
    payload: LogframeLevelRequest,
    token?: string,
  ): Promise<LogframeLevel> {
    return request<LogframeLevel>(
      `${BASE_URL}/frameworks/${frameworkId}/logframe/levels/${levelId}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      token,
    )
  },

  /** Delete a leaf hierarchy level (409 when children exist). */
  async deleteLevel(frameworkId: string, levelId: string, token?: string): Promise<void> {
    return request<void>(
      `${BASE_URL}/frameworks/${frameworkId}/logframe/levels/${levelId}`,
      { method: 'DELETE' },
      token,
    )
  },

  /** Add an indicator to a level. */
  async createIndicator(
    frameworkId: string,
    payload: LogframeIndicatorRequest,
    token?: string,
  ): Promise<LogframeIndicator> {
    return request<LogframeIndicator>(
      `${BASE_URL}/frameworks/${frameworkId}/logframe/indicators`,
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    )
  },

  /** Update an indicator. */
  async updateIndicator(
    frameworkId: string,
    indicatorId: string,
    payload: LogframeIndicatorRequest,
    token?: string,
  ): Promise<LogframeIndicator> {
    return request<LogframeIndicator>(
      `${BASE_URL}/frameworks/${frameworkId}/logframe/indicators/${indicatorId}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      token,
    )
  },

  /** Delete an indicator and its activity links. */
  async deleteIndicator(
    frameworkId: string,
    indicatorId: string,
    token?: string,
  ): Promise<void> {
    return request<void>(
      `${BASE_URL}/frameworks/${frameworkId}/logframe/indicators/${indicatorId}`,
      { method: 'DELETE' },
      token,
    )
  },

  /** Link a framework activity to an indicator. */
  async linkActivity(
    frameworkId: string,
    indicatorId: string,
    payload: LogframeLinkActivityRequest,
    token?: string,
  ): Promise<LogframeIndicator> {
    return request<LogframeIndicator>(
      `${BASE_URL}/frameworks/${frameworkId}/logframe/indicators/${indicatorId}/activities`,
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    )
  },

  /** Unlink a framework activity from an indicator. */
  async unlinkActivity(
    frameworkId: string,
    indicatorId: string,
    activityId: string,
    token?: string,
  ): Promise<LogframeIndicator> {
    return request<LogframeIndicator>(
      `${BASE_URL}/frameworks/${frameworkId}/logframe/indicators/${indicatorId}/activities/${activityId}`,
      { method: 'DELETE' },
      token,
    )
  },
}
