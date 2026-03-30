/**
 * interfaces/onboarding.ts
 *
 * All TypeScript types for the ST-06 progressive onboarding flow.
 * Covers the Pinia store shape, API request/response contracts,
 * and the four step panel data models.
 */

// ─── Store / UI types ─────────────────────────────────────────────────────────

/** A single step entry managed by the onboarding Pinia store */
export interface OnboardingStep {
  /** 1-based step number */
  step: number
  /** Human-readable label shown in the banner */
  label: string
  /** Whether this step has been marked complete */
  complete: boolean
  /** Whether this step's inline panel is currently expanded */
  active: boolean
}

/** Top-level shape of the onboarding Pinia store state */
export interface OnboardingState {
  steps: OnboardingStep[]
  onboarding_complete: boolean
  loading: boolean
}

// ─── API response — GET /api/v1/onboarding/status ────────────────────────────

/** Response shape returned by GET /api/v1/onboarding/status */
export interface OnboardingStatusResponse {
  onboarding_complete: boolean
  steps: OnboardingStepStatus[]
  /** Current organisation profile — used to pre-fill Step 1 */
  organisation?: OrgProfileData
}

/** Per-step completion record inside the status response */
export interface OnboardingStepStatus {
  step: number
  complete: boolean
}

// ─── Step 1 — Organisation profile ───────────────────────────────────────────

/** Organisation data returned from the status endpoint and used in Step 1 */
export interface OrgProfileData {
  id: string
  /** Read-only — set at registration, cannot be changed */
  name: string
  /** ISO 3166-1 alpha-2 country code — read-only after registration */
  country: string
  /** Optional free-text description — max 1 000 chars */
  description?: string
  operating_locations: OperatingLocation[]
}

/** One row in the operating locations repeatable field (Step 1) */
export interface OperatingLocation {
  /** Present on existing rows returned from the API; absent on new rows */
  id?: string
  /** Required — minimum 1 location must be present to complete Step 1 */
  name: string
  /** Optional sector tag */
  sector?: string
  /** Optional geographic area / sub-region */
  geographic_area?: string
}

/** Payload sent to PUT /api/v1/organisations/:id */
export interface UpdateOrgPayload {
  description?: string
  locations: Omit<OperatingLocation, 'id'>[]
}

// ─── Step 2 — Donor selection ─────────────────────────────────────────────────

/** A donor card returned from GET /api/v1/donors */
export interface Donor {
  id: string
  name: string
  /** Short description shown on the card */
  description: string
  /** When true the card is clickable and selectable */
  is_active: boolean
  /** When true a "Coming soon" badge is shown; card is not interactive */
  coming_soon: boolean
  /** Number of activities that will be loaded if this donor is selected */
  activity_count: number
}

/** Payload sent to POST /api/v1/onboarding/select-donor */
export interface SelectDonorPayload {
  donor_id: string
}

// ─── Step 3 — Activity confirmation ──────────────────────────────────────────

/** An activity loaded for the selected donor (GET /api/v1/onboarding/activities) */
export interface OnboardingActivity {
  id: string
  name: string
  description: string
  /** Toggled immediately via PATCH; at least one must remain active */
  is_active: boolean
  /** Donor name displayed as a badge on each card */
  donor: string
}

/** Payload sent to PATCH /api/v1/onboarding/activities/:id */
export interface ToggleActivityPayload {
  is_active: boolean
}

// ─── Step 4 — Add first team member ──────────────────────────────────────────

/** Available roles for new team members — org_admin is excluded from the UI */
export type TeamMemberRole =
  | 'program_manager'
  | 'field_officer'
  | 'case_worker'
  | 'finance_officer'
  | 'facilitator'

/** Payload sent to POST /api/v1/users */
export interface NewTeamMemberPayload {
  full_name: string
  email: string
  password?: string
  role: TeamMemberRole
}
