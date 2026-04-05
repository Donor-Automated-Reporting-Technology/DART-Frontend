/**
 * interfaces/onboarding.ts
 *
 * TypeScript types for the framework-based 3-step onboarding flow.
 * Steps:
 *   1. Organisation profile (name + country)
 *   2. Framework setup (type + project details)
 *   3. Activity confirmation (enable at least 1)
 */

import type { FrameworkType } from './framework'

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

// ─── Step 2 — Framework setup ─────────────────────────────────────────────────

/** Payload sent to POST /api/v1/onboarding/framework */
export interface SetupFrameworkPayload {
  framework_type: FrameworkType
  project_name: string
  partner_name: string
  reporting_to: string
  period_start: string
  period_end: string
}

// ─── Step 3 — Activity confirmation ──────────────────────────────────────────

/** An activity template returned for the chosen framework type */
export interface OnboardingActivity {
  id: string
  name: string
  code: string
  description: string
  /** Toggled immediately via PATCH; at least one must remain active */
  is_active: boolean
}

/** Payload sent to PATCH /api/v1/onboarding/activities/:id */
export interface ToggleActivityPayload {
  is_active: boolean
}
