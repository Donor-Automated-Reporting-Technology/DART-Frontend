/**
 * interfaces/logframe.ts
 *
 * Types for the M&E logframe system attached to a project (framework).
 * Mirrors the backend DTOs: GET/PUT /api/v1/frameworks/:id/logframe
 */

/** Hierarchy level types in the logframe tree. */
export type LogframeLevelType = 'goal' | 'outcome' | 'result' | 'activity'

/** Disaggregation dimensions allowed on an indicator. */
export type LogframeDisaggregation = 'age_group' | 'gender' | 'disability' | 'other'

/** External reference link attached to an indicator. */
export interface LogframeLink {
  label: string
  url: string
}

/** The logframe metadata record (one per project). */
export interface Logframe {
  id: string
  organisation_id: string
  framework_id: string
  name: string
  description?: string | null
  donor_framework?: string | null
  status: string
  version: number
  created_by?: string | null
  created_at: string
  updated_at: string
}

/** One node in the logframe hierarchy (goal → outcome → result → activity). */
export interface LogframeLevel {
  id: string
  logframe_id: string
  parent_id?: string | null
  level_type: LogframeLevelType
  sort_order: number
  title: string
  created_at: string
  updated_at: string
}

/** An M&E indicator on a logframe level. */
export interface LogframeIndicator {
  id: string
  logframe_id: string
  level_id: string
  code?: string | null
  indicator: string
  definition?: string | null
  unit?: string | null
  baseline_value?: number | null
  baseline_year?: number | null
  baseline_notes?: string | null
  target_value?: number | null
  target_year?: number | null
  means_of_verification?: string | null
  assumptions?: string | null
  disaggregation: LogframeDisaggregation[]
  data_source?: string | null
  external_links: LogframeLink[]
  sort_order: number
  created_at: string
  updated_at: string
  /** Framework activity IDs whose data feeds this indicator (populated on read). */
  activity_ids: string[]
}

/** Full logframe tree returned by GET .../logframe. */
export interface LogframeData {
  logframe: Logframe | null
  levels: LogframeLevel[]
  indicators: LogframeIndicator[]
}

/** Donor template available for import. */
export interface LogframeTemplateInfo {
  id: string
  name: string
  donor: string
  description: string
  indicator_count: number
}

// --- Requests ---

export interface LogframeUpsertRequest {
  name: string
  description?: string | null
  donor_framework?: string | null
}

export interface LogframeLevelRequest {
  level_type: LogframeLevelType
  parent_id?: string | null
  title: string
  sort_order?: number | null
}

export interface LogframeIndicatorRequest {
  level_id: string
  code?: string | null
  indicator: string
  definition?: string | null
  unit?: string | null
  baseline_value?: number | null
  baseline_year?: number | null
  baseline_notes?: string | null
  target_value?: number | null
  target_year?: number | null
  means_of_verification?: string | null
  assumptions?: string | null
  disaggregation?: LogframeDisaggregation[]
  data_source?: string | null
  external_links?: LogframeLink[]
  sort_order?: number | null
}

export interface LogframeImportRequest {
  template: string
  indicator_codes?: string[]
}

export interface LogframeLinkActivityRequest {
  framework_activity_id: string
}
