/**
 * services/deviceApi.ts — Settings → Tablets: the tablets and phones the
 * organisation authorises to run the WellReach app.
 */
import { getActivePinia } from 'pinia'
import { ApiError } from './api'

const BASE_URL = '/api/v1'

export interface Device {
  id: string
  name: string
  status: 'pending' | 'active' | 'revoked'
  cfs_location_id?: string
  cfs_location_name?: string
  code_expires_at?: string
  model?: string
  os_version?: string
  app_version?: string
  created_by_name?: string
  enrolled_by_name?: string
  enrolled_at?: string
  last_seen_at?: string
  last_user_name?: string
  revoked_by_name?: string
  revoked_at?: string
  created_at: string
}

/** A tablet waiting to be set up, with the code to enter on it (shown once). */
export interface DeviceWithCode {
  device: Device
  code: string
}

function token(): string | undefined {
  try {
    const s = getActivePinia()?.state.value?.['auth'] as { accessToken?: string | null } | undefined
    return s?.accessToken ?? undefined
  } catch {
    return undefined
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const t = token()
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, data?.message ?? 'Request failed', data)
  return data as T
}

export const deviceApi = {
  list: () => request<{ data: Device[] }>(`${BASE_URL}/devices`).then(r => r.data ?? []),
  add: (name: string, cfsLocationId: string) =>
    request<DeviceWithCode>(`${BASE_URL}/devices`, { method: 'POST', body: JSON.stringify({ name, cfs_location_id: cfsLocationId }) }),
  newCode: (id: string) => request<DeviceWithCode>(`${BASE_URL}/devices/${id}/code`, { method: 'POST' }),
  revoke: (id: string) => request<void>(`${BASE_URL}/devices/${id}/revoke`, { method: 'POST' }),
}
