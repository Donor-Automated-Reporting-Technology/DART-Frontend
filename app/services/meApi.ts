/**
 * services/meApi.ts — "My account" for every signed-in user:
 * profile, sign-in email, password, and the user's organisation role.
 */
import { getActivePinia } from 'pinia'
import { ApiError } from './api'

const BASE_URL = '/api/v1'

export interface MeRole {
  id: string
  name: string
  level: number
  scope: 'own_location' | 'supervised_locations' | 'organisation'
  base_role: string
  permissions: string[]
}

export interface Me {
  id: string
  full_name: string
  email: string
  phone: string
  organisation: { id: string; name: string }
  role: MeRole | null
  locations: { id: string; name: string }[]
  must_change_password: boolean
}

function resolveToken(): string | undefined {
  try {
    const authState = getActivePinia()?.state.value?.['auth'] as { accessToken?: string | null } | undefined
    return authState?.accessToken ?? undefined
  } catch {
    return undefined
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = resolveToken()
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, data?.message ?? 'Request failed', data)
  return data as T
}

export const meApi = {
  get: () => request<Me>(`${BASE_URL}/me`),
  updateProfile: (body: { full_name: string; phone: string }) =>
    request<Me>(`${BASE_URL}/me`, { method: 'PATCH', body: JSON.stringify(body) }),
  changeEmail: (body: { email: string; current_password: string }) =>
    request<Me>(`${BASE_URL}/me/email`, { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body: { current_password: string; new_password: string; confirm_password: string }) =>
    request<void>(`${BASE_URL}/me/password`, { method: 'PUT', body: JSON.stringify(body) }),
}

/** Human labels for a role's data scope. */
export const SCOPE_LABELS: Record<MeRole['scope'], string> = {
  own_location: 'Their own CFS',
  supervised_locations: 'The CFS they supervise',
  organisation: 'The whole organisation',
}
