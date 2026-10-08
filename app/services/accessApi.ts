/**
 * services/accessApi.ts — Settings → Roles & permissions and Settings → People.
 */
import { getActivePinia } from 'pinia'
import { ApiError } from './api'

const BASE_URL = '/api/v1'

export type Scope = 'own_location' | 'supervised_locations' | 'organisation'

export interface OrgRole {
  id: string
  name: string
  description: string | null
  level: number
  scope: Scope
  base_role: string
  template_key: string | null
  permissions: string[]
  user_count: number
}

export interface PermissionInfo { key: string; label: string; description: string; admin_only?: boolean }
export interface PermissionCategory { key: string; label: string; permissions: PermissionInfo[] }

export interface OrgUser {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  is_active: boolean
  last_login_at: string | null
  role_id: string | null
  role_name: string | null
  role_level: number | null
  location_id: string | null
  location_name: string | null
}

export interface RoleInput {
  name: string
  description: string
  level: number
  scope: Scope
  permissions: string[]
  based_on?: string
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

export const accessApi = {
  roles: () => request<{ roles: OrgRole[]; catalogue: PermissionCategory[] }>(`${BASE_URL}/roles`),
  createRole: (body: RoleInput) => request<OrgRole>(`${BASE_URL}/roles`, { method: 'POST', body: JSON.stringify(body) }),
  updateRole: (id: string, body: RoleInput) => request<OrgRole>(`${BASE_URL}/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRole: (id: string) => request<void>(`${BASE_URL}/roles/${id}`, { method: 'DELETE' }),
  users: () => request<{ users: OrgUser[]; can_manage: boolean; my_level: number; scope: Scope }>(`${BASE_URL}/users`),
  setUserRole: (id: string, roleId: string) => request<OrgUser>(`${BASE_URL}/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role_id: roleId }) }),
  setUserActive: (id: string, active: boolean) => request<OrgUser>(`${BASE_URL}/users/${id}/active`, { method: 'PUT', body: JSON.stringify({ is_active: active }) }),
}

export const SCOPE_OPTIONS: { value: Scope; label: string; help: string }[] = [
  { value: 'own_location', label: 'Their own CFS', help: 'Only the CFS they are assigned to.' },
  { value: 'supervised_locations', label: 'The CFS they supervise', help: 'Every CFS they are assigned to supervise.' },
  { value: 'organisation', label: 'The whole organisation', help: 'All locations and programmes.' },
]
