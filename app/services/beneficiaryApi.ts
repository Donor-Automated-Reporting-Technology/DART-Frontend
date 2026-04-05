import { getActivePinia } from 'pinia'
import { ApiError } from './api'
import type {
  RegisterBeneficiaryRequest,
  BeneficiaryListResponse,
  BeneficiaryFilter,
} from '../interfaces/beneficiary'

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

export const beneficiaryApi = {
  async register(payload: RegisterBeneficiaryRequest, token?: string) {
    return request(`${BASE_URL}/beneficiaries`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token)
  },

  async list(params?: BeneficiaryFilter, token?: string): Promise<BeneficiaryListResponse> {
    const qs = new URLSearchParams()
    if (params?.centre_id) qs.set('centre_id', params.centre_id)
    if (params?.search) qs.set('search', params.search)
    if (params?.beneficiary_type) qs.set('beneficiary_type', params.beneficiary_type)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.page_size) qs.set('page_size', String(params.page_size))
    const query = qs.toString() ? `?${qs.toString()}` : ''
    return request<BeneficiaryListResponse>(`${BASE_URL}/beneficiaries${query}`, { method: 'GET' }, token)
  },

  async exportExcel(params?: BeneficiaryFilter, token?: string): Promise<Blob> {
    const resolved = resolveToken(token)
    const qs = new URLSearchParams()
    if (params?.centre_id) qs.set('centre_id', params.centre_id)
    if (params?.search) qs.set('search', params.search)
    const query = qs.toString() ? `?${qs.toString()}` : ''
    const response = await fetch(`${BASE_URL}/beneficiaries/export${query}`, {
      headers: {
        ...(resolved ? { Authorization: `Bearer ${resolved}` } : {}),
      },
    })
    if (!response.ok) {
      throw new ApiError(response.status, 'Export failed')
    }
    return response.blob()
  },

  async assignToServicePoint(beneficiaryId: string, servicePointId: string, token?: string) {
    return request(`${BASE_URL}/beneficiaries/${beneficiaryId}/register`, {
      method: 'POST',
      body: JSON.stringify({ cfs_location_id: servicePointId }),
    }, token)
  },
}
