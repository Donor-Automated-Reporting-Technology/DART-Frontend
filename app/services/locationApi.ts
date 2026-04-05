import { getActivePinia } from 'pinia'
import { ApiError } from './api'
import type {
  Location,
  ServicePoint,
  CreateLocationRequest,
  UpdateLocationRequest,
  AddServicePointRequest,
  UpdateServicePointRequest,
  LocationListResponse,
} from '../interfaces/location'

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

export const locationApi = {
  async listLocations(token?: string): Promise<LocationListResponse> {
    return request<LocationListResponse>(`${BASE_URL}/locations`, { method: 'GET' }, token)
  },

  async createLocation(payload: CreateLocationRequest, token?: string): Promise<Location> {
    return request<Location>(`${BASE_URL}/locations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token)
  },

  async updateLocation(id: string, payload: UpdateLocationRequest, token?: string): Promise<Location> {
    return request<Location>(`${BASE_URL}/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, token)
  },

  async addServicePoint(locationId: string, payload: AddServicePointRequest, token?: string): Promise<ServicePoint> {
    return request<ServicePoint>(`${BASE_URL}/locations/${locationId}/service-points`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token)
  },

  async updateServicePoint(id: string, payload: UpdateServicePointRequest, token?: string): Promise<ServicePoint> {
    return request<ServicePoint>(`${BASE_URL}/service-points/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, token)
  },

  async deleteServicePoint(id: string, token?: string): Promise<{ message: string }> {
    return request<{ message: string }>(`${BASE_URL}/service-points/${id}`, {
      method: 'DELETE',
    }, token)
  },
}
