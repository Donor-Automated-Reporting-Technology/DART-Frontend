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

/** Full beneficiary record from `GET /cfs/beneficiaries/:id`. */
export interface BeneficiaryProfile {
  id: string
  personal_name: string
  father_name: string
  grandfather_name?: string | null
  family_name?: string | null
  age_at_registration: number
  sex: string
  language: string
  disability_status: string
  beneficiary_type: string
  guardian_name?: string | null
  guardian_phone?: string | null
  known_medical_issues?: string | null
  known_learning_difficulties?: string | null
  additional_notes?: string | null
  primero_case_id?: string | null
  cfs_location?: { id: string; name: string } | null
  registration_date: string
  is_enrolled: boolean
  updated_at: string
}

/** The fields the profile screen can change (`PUT /cfs/beneficiaries/:id`). */
export interface BeneficiaryProfileInput {
  personal_name: string
  father_name: string
  grandfather_name?: string
  family_name?: string
  age_at_registration: number
  sex: string
  language: string
  disability_status: string
  guardian_name: string
  guardian_phone?: string
  known_medical_issues?: string
  known_learning_difficulties?: string
  additional_notes?: string
  primero_case_id?: string
}

export interface OrgLocation {
  id: string
  name: string
  sector?: string | null
  geographic_area?: string | null
}

export const beneficiaryApi = {
  /** One beneficiary's full profile, if the signed-in user can see them. */
  async get(id: string, token?: string): Promise<BeneficiaryProfile> {
    return request<BeneficiaryProfile>(`${BASE_URL}/cfs/beneficiaries/${id}`, { method: 'GET' }, token)
  },

  /** Corrects a beneficiary's profile. Needs the beneficiaries.edit permission. */
  async update(id: string, payload: BeneficiaryProfileInput, token?: string): Promise<BeneficiaryProfile> {
    return request<BeneficiaryProfile>(`${BASE_URL}/cfs/beneficiaries/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token)
  },

  /** Every location (CFS or other site) in the organisation — any role may read it. */
  async listLocations(token?: string): Promise<OrgLocation[]> {
    return request<OrgLocation[]>(`${BASE_URL}/cfs/org-locations`, { method: 'GET' }, token)
  },

  async register(payload: RegisterBeneficiaryRequest, token?: string) {
    return request(`${BASE_URL}/beneficiaries`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token)
  },

  async list(params?: BeneficiaryFilter, token?: string): Promise<BeneficiaryListResponse> {
    const qs = new URLSearchParams()
    if (params?.cfs_location_id) qs.set('cfs_location_id', params.cfs_location_id)
    if (params?.search) qs.set('search', params.search)
    if (params?.sex) qs.set('sex', params.sex)
    if (params?.disability_status) qs.set('disability_status', params.disability_status)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.page_size) qs.set('page_size', String(params.page_size))
    const query = qs.toString() ? `?${qs.toString()}` : ''
    return request<BeneficiaryListResponse>(`${BASE_URL}/beneficiaries/list${query}`, { method: 'GET' }, token)
  },

  async exportExcel(params?: BeneficiaryFilter, token?: string): Promise<Blob> {
    const resolved = resolveToken(token)
    const qs = new URLSearchParams()
    if (params?.cfs_location_id) qs.set('cfs_location_id', params.cfs_location_id)
    if (params?.search) qs.set('search', params.search)
    if (params?.sex) qs.set('sex', params.sex)
    if (params?.disability_status) qs.set('disability_status', params.disability_status)
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
    return request(`${BASE_URL}/cfs/registrations`, {
      method: 'POST',
      body: JSON.stringify({ beneficiary_id: beneficiaryId, cfs_location_id: servicePointId }),
    }, token)
  },

  async getUnenrolled(token?: string) {
    return request<{ beneficiaries: Array<{
      id: string
      personal_name: string
      father_name: string
      grandfather_name?: string | null
      family_name?: string | null
      age_at_registration: number
      sex: string
      disability_status: string
    }> }>(`${BASE_URL}/beneficiaries/unenrolled`, { method: 'GET' }, token)
  },

  async getEnrolled(params?: BeneficiaryFilter, token?: string): Promise<BeneficiaryListResponse> {
    const qs = new URLSearchParams()
    if (params?.cfs_location_id) qs.set('cfs_location_id', params.cfs_location_id)
    if (params?.search) qs.set('search', params.search)
    if (params?.sex) qs.set('sex', params.sex)
    if (params?.disability_status) qs.set('disability_status', params.disability_status)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.page_size) qs.set('page_size', String(params.page_size))
    const query = qs.toString() ? `?${qs.toString()}` : ''
    return request<BeneficiaryListResponse>(`${BASE_URL}/beneficiaries/enrolled${query}`, { method: 'GET' }, token)
  },
}
