/**
 * Dashboard API Service
 *
 * All HTTP calls for the DART dashboard feature.
 * Endpoints are placeholders — swap the fetch calls in once the backend routes
 * are confirmed.  The mock helpers below are used by useDashboard.ts until then.
 *
 * Base URL is proxied via nuxt.config.ts → /api/** → http://localhost:8090/api/**
 */

import type {
  DashboardStats,
  Report,
  ActivityItem,
} from "../interfaces/dashboard";

const BASE = "/api/v1";

// ─── Shared fetch helper ──────────────────────────────────────────────────────

/**
 * Thin wrapper around fetch.
 * Throws a typed error on non-2xx responses.
 * Includes credentials so the httpOnly refresh-token cookie is forwarded.
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message ?? `API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ─── Dashboard endpoints ──────────────────────────────────────────────────────

export const dashboardApi = {
  /**
   * Fetch top-level summary statistics for the authenticated organisation.
   *
   * GET /api/v1/dashboard/stats
   *
   * Response shape: DashboardStats
   */
  async getStats(): Promise<DashboardStats> {
    return apiFetch<DashboardStats>("/dashboard/stats");
  },

  /**
   * Fetch the most recent reports for this organisation.
   *
   * GET /api/v1/reports?limit={limit}&sort=desc
   *
   * @param limit  Max number of reports to return (default 5)
   */
  async getRecentReports(limit = 5): Promise<Report[]> {
    return apiFetch<Report[]>(`/reports?limit=${limit}&sort=desc`);
  },

  /**
   * Fetch the latest activity events across the organisation.
   *
   * GET /api/v1/activity?limit={limit}
   *
   * @param limit  Max number of items to return (default 10)
   */
  async getActivity(limit = 10): Promise<ActivityItem[]> {
    return apiFetch<ActivityItem[]>(`/activity?limit=${limit}`);
  },
};
