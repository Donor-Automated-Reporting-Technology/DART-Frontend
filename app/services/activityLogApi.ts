/**
 * services/activityLogApi.ts — Settings → Activity log: who did what, when,
 * from which tablet and IP address, and the activity that needs a look.
 */
import { getActivePinia } from 'pinia'
import { ApiError } from './api'

const BASE_URL = '/api/v1/activity-log'

export type ActivityGroup = '' | 'sign_ins' | 'changes' | 'views' | 'downloads' | 'refused' | 'admin'

export interface ActivityEntry {
  id: string
  at: string
  action: string
  /** What happened, in plain words. */
  label: string
  details: string | null
  entity: string
  entity_id: string | null
  /** The signed-in account. */
  user_id: string | null
  user_name: string | null
  /** On a shared tablet: the person who entered their PIN. */
  recorded_by_id: string | null
  recorded_by_name: string | null
  device_id: string | null
  device_name: string | null
  ip_address: string | null
  client: 'web' | 'app' | null
}

export interface ActivityQuery {
  group?: ActivityGroup
  user_id?: string
  device_id?: string
  /** YYYY-MM-DD */
  from?: string
  /** YYYY-MM-DD, included */
  to?: string
  out_of_hours?: boolean
  page?: number
  limit?: number
}

export interface ActivityPage {
  data: ActivityEntry[]
  total: number
  page: number
  limit: number
  open_flags: number
}

export interface ActivityFlag {
  id: string
  rule: string
  rule_label: string
  severity: 'high' | 'medium' | 'low'
  summary: string
  user_id: string | null
  user_name: string | null
  device_id: string | null
  device_name: string | null
  event_count: number
  first_seen_at: string
  last_seen_at: string
  created_at: string
  reviewed_by_name: string | null
  reviewed_at: string | null
  review_note: string | null
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

export const activityLogApi = {
  list: (q: ActivityQuery) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(q)) {
      if (v !== undefined && v !== '' && v !== false) params.set(k, String(v))
    }
    return request<ActivityPage>(`${BASE_URL}?${params}`)
  },
  flags: (reviewed = false) =>
    request<{ data: ActivityFlag[]; open_flags: number }>(`${BASE_URL}/flags${reviewed ? '?reviewed=true' : ''}`),
  review: (id: string, note: string) =>
    request<void>(`${BASE_URL}/flags/${id}/review`, { method: 'POST', body: JSON.stringify({ note }) }),
}
