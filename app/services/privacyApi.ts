/**
 * services/privacyApi.ts — removing a person's personal details and the
 * retention period (South Sudan Information Sharing Protocol: set a retention
 * and destruction schedule). Needs the "Remove personal details" permission.
 */
import { getActivePinia } from 'pinia'
import { ApiError } from './api'

const BASE_URL = '/api/v1/privacy'

export type RemovalReason = 'caregiver_request' | 'consent_withdrawn' | 'organisation_exit' | 'other'

export const REMOVAL_REASONS: { value: RemovalReason; label: string }[] = [
  { value: 'caregiver_request', label: 'The caregiver asked for the details to be removed' },
  { value: 'consent_withdrawn', label: 'Consent was withdrawn' },
  { value: 'organisation_exit', label: 'The organisation is leaving WellReach' },
  { value: 'other', label: 'Another reason' },
]

function token(): string | undefined {
  try {
    const auth = getActivePinia()?.state.value?.['auth'] as { accessToken?: string | null } | undefined
    return auth?.accessToken ?? undefined
  } catch {
    return undefined
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const t = token()
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, data?.message ?? 'Request failed', data)
  return (data?.data !== undefined ? data.data : data) as T
}

export const privacyApi = {
  /** Removes one person's name, guardian, contact details and notes for good. */
  removeDetails(beneficiaryId: string, reason: RemovalReason): Promise<void> {
    return request<void>(`/beneficiaries/${beneficiaryId}/remove`, { method: 'POST', body: JSON.stringify({ reason }) })
  },
  /** Months after a person's last activity before their details are removed; null = off. */
  async getRetention(): Promise<number | null> {
    const r = await request<{ retention_months: number | null }>('/retention')
    return r.retention_months ?? null
  },
  async setRetention(months: number | null): Promise<number | null> {
    const r = await request<{ retention_months: number | null }>('/retention', {
      method: 'PUT', body: JSON.stringify({ retention_months: months }),
    })
    return r.retention_months ?? null
  },
}
