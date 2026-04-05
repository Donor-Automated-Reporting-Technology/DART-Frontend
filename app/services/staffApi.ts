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

export interface CreateStaffRequest {
  full_name: string
  email: string
  password: string
  role: string
}

export interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
  assigned_locations: string[]
}

export interface StaffAssignment {
  user_id: string
  cfs_location_id: string
  start_date: string
}

export const staffApi = {
  async create(payload: CreateStaffRequest, token?: string) {
    return request(`${BASE_URL}/cfs/staff`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token)
  },

  async list(token?: string) {
    return request(`${BASE_URL}/cfs/staff-assignments`, { method: 'GET' }, token)
  },

  async assign(payload: StaffAssignment, token?: string) {
    return request(`${BASE_URL}/cfs/staff-assignments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token)
  },

  async unassign(payload: { user_id: string }, token?: string) {
    return request(`${BASE_URL}/cfs/staff-assignments/unassign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token)
  },
}
