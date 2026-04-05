/**
 * services/onboardingApi.ts
 *
 * All HTTP calls for the ST-06 progressive onboarding flow.
 * The Nuxt proxy (nuxt.config.ts → routeRules) forwards every /api/**
 * request to http://localhost:8090, so all URLs here use the /api/v1 prefix.
 *
 * Token resolution order (first wins):
 *   1. Explicit `token` argument passed by the caller
 *   2. Active Pinia store state (getActivePinia fallback)
 *   3. No Authorization header — backend will return 401
 */

import { getActivePinia } from "pinia";
import { ApiError } from "./api";
import type {
  OnboardingStatusResponse,
  UpdateOrgPayload,
  Donor,
  SelectDonorPayload,
  OnboardingActivity,
  ToggleActivityPayload,
  NewTeamMemberPayload,
} from "../interfaces/onboarding";

// ─── Framework setup request (replaces donor selection) ───────────────────────

export interface SetupFrameworkRequest {
  framework_type: string;
  project_name: string;
  partner_name: string;
  reporting_to: string;
  period_start: string;
  period_end: string;
}

// ─── Base URL ─────────────────────────────────────────────────────────────────

const BASE = "/api/v1";

// ─── Token resolution ─────────────────────────────────────────────────────────

/**
 * Reads the access token directly from the active Pinia state.
 *
 * This is used as an automatic fallback so callers never have to thread the
 * token through every function call.  It is safe to call at any point after
 * Pinia is initialised (i.e. after the Nuxt app boots).
 */
function resolveToken(explicit?: string): string | undefined {
  if (explicit) return explicit;

  try {
    const pinia = getActivePinia();
    const authState = pinia?.state.value?.["auth"] as
      | { accessToken?: string | null }
      | undefined;
    return authState?.accessToken ?? undefined;
  } catch {
    return undefined;
  }
}

// ─── Internal request helper ──────────────────────────────────────────────────

/**
 * Thin wrapper around `fetch` that:
 *  - Resolves the auth token automatically via Pinia when not supplied
 *  - Injects a Bearer Authorization header when a token is available
 *  - Merges a JSON Content-Type header
 *  - Parses the JSON response body
 *  - Throws an `ApiError` for non-2xx responses
 */
async function request<T>(
  url: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const resolved = resolveToken(token);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(resolved ? { Authorization: `Bearer ${resolved}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (data as any)?.message ?? "Request failed",
      data,
    );
  }

  // Unwrap the standard { "data": ... } backend envelop automatically if present
  return (data?.data !== undefined ? data.data : data) as T;
}

// ─── Onboarding status ────────────────────────────────────────────────────────

/**
 * GET /api/v1/onboarding/status
 *
 * Returns the current completion state of all four onboarding steps plus
 * the organisation profile data used to pre-fill Step 1.
 * Called on dashboard layout mount and after each step save.
 */
export const fetchOnboardingStatus = (token?: string) =>
  request<OnboardingStatusResponse>(`${BASE}/onboarding/status`, {}, token);

// ─── Step 1 — Organisation profile ───────────────────────────────────────────

/**
 * PUT /api/v1/organisations/:id
 *
 * Saves the editable organisation profile fields (description and operating
 * locations).  Organisation name and country are read-only after registration.
 */
export const updateOrgProfile = (
  orgId: string,
  payload: UpdateOrgPayload,
  token?: string,
) =>
  request(
    `${BASE}/organisations/${orgId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    token,
  );

// ─── Step 2 — Donor selection ─────────────────────────────────────────────────

/**
 * GET /api/v1/donors
 *
 * Returns all donors — both active (is_active: true, selectable) and
 * coming-soon (coming_soon: true, displayed greyed out).
 */
export const fetchDonors = async (token?: string) => {
  const res = await request<{ donors: Donor[] }>(`${BASE}/donors`, {}, token);
  return res.donors || [];
};

/**
 * POST /api/v1/onboarding/select-donor
 *
 * Confirms the chosen donor and triggers the platform to load that donor's
 * activities so they appear in Step 3.
 * @deprecated Use setupFramework() for the new framework-based onboarding flow.
 */
export const selectDonor = (payload: SelectDonorPayload, token?: string) =>
  request(
    `${BASE}/onboarding/select-donor`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );

/**
 * POST /api/v1/onboarding/framework
 *
 * Sets up the organisation's framework (replaces donor selection in new flow).
 * Creates a framework with the specified type and project details, then
 * auto-loads the matching activity templates for Step 3.
 */
export const setupFramework = (
  payload: SetupFrameworkRequest,
  token?: string,
) =>
  request(
    `${BASE}/onboarding/framework`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );

// ─── Step 3 — Activity confirmation ──────────────────────────────────────────

/**
 * GET /api/v1/onboarding/activities
 *
 * Returns the activities loaded for the selected donor.
 * Each activity can be toggled active/inactive before confirmation.
 */
export const fetchOnboardingActivities = async (token?: string) => {
  const res = await request<{ activities: OnboardingActivity[] }>(`${BASE}/onboarding/activities`, {}, token);
  return res.activities || [];
};

/**
 * PATCH /api/v1/onboarding/activities/:id
 *
 * Instantly persists an activity's active/inactive state.
 * Called immediately on toggle — no separate save button.
 */
export const toggleActivity = (
  id: string,
  payload: ToggleActivityPayload,
  token?: string,
) =>
  request(
    `${BASE}/onboarding/activities/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );

// ─── Step 4 — Team member ─────────────────────────────────────────────────────

/**
 * POST /api/v1/onboarding/team-members
 *
 * Creates a new team member and triggers an SMS or email invitation.
 * Simplified version of the full user management screen (US-USER-001).
 */
export const createTeamMember = (
  payload: NewTeamMemberPayload,
  token?: string,
) =>
  request(
    `${BASE}/onboarding/team-members`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
