/**
 * interfaces/logframe.ts
 *
 * Types for the M&E logframe system attached to a project (framework).
 * Mirrors the backend DTOs: GET/PUT /api/v1/frameworks/:id/logframe
 *
 * Structure: project → logframe → impact → indicator → { numeric targets, activities }
 */

/** Hierarchy level types in the logframe tree. */
export type LogframeLevelType = 'goal' | 'impact' | 'outcome' | 'output' | 'result' | 'activity'

/** Disaggregation dimensions allowed on an indicator. */
export type LogframeDisaggregation = 'age_group' | 'gender' | 'disability' | 'other'

/** Free-form custom fields — arbitrary user-defined key/value pairs (JSONB). */
export type CustomFields = Record<string, unknown>

/** Value kind a user-defined target field holds. */
export type TargetFieldType = 'number' | 'decimal' | 'percent' | 'text' | 'date' | 'boolean'

/**
 * A user-defined field under an indicator's target (e.g. Girls, Boys).
 * Stored inside the indicator's `custom_fields` under the `target_fields` key.
 */
export interface LogframeTargetField {
  /** Field name shown to the user, e.g. "Girls". */
  label: string
  /** Value kind, driving the input rendered for the field. */
  type: TargetFieldType
  value: string | number | boolean | null
  /** Optional unit, e.g. persons, %. */
  unit?: string
  /**
   * What the dashboard counts as this field's actual. Omitted = inferred from
   * the label ("Girls" → female). `manual` uses `actual` below.
   */
  measure?: TargetFieldMeasure
  /** Actual entered by M&E staff, used when `measure` is `manual`. */
  actual?: number | null
}

/** Beneficiary group a target field's actual is counted from. */
export type TargetFieldMeasure =
  | 'total'
  | 'female'
  | 'male'
  | 'disability'
  | 'female_disability'
  | 'male_disability'
  | 'manual'

export const TARGET_FIELD_MEASURES: Array<{ value: TargetFieldMeasure; label: string }> = [
  { value: 'total', label: 'All beneficiaries' },
  { value: 'female', label: 'Girls / female' },
  { value: 'male', label: 'Boys / male' },
  { value: 'disability', label: 'With disability' },
  { value: 'female_disability', label: 'Girls with disability' },
  { value: 'male_disability', label: 'Boys with disability' },
  { value: 'manual', label: 'Entered manually' },
]

/** Key used inside `custom_fields` to persist the target field list. */
export const TARGET_FIELDS_KEY = 'target_fields'

/** An indicator's target for one project year (Year 1 = first year of the project period). */
export interface LogframeYearTarget {
  year: number
  value: number
}

/** Key used inside `custom_fields` to persist the per-project-year targets. */
export const YEAR_TARGETS_KEY = 'year_targets'

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
  custom_fields: CustomFields
  created_by?: string | null
  created_at: string
  updated_at: string
}

/** One node in the logframe hierarchy (goal/impact → outcome → result → activity). */
export interface LogframeLevel {
  id: string
  logframe_id: string
  parent_id?: string | null
  level_type: LogframeLevelType
  sort_order: number
  title: string
  custom_fields: CustomFields
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
  custom_fields: CustomFields
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

// --- Impact view (GET .../logframe/impact) ---

/** A framework activity linked to an indicator, with its live actual count. */
export interface LogframeImpactActivity {
  id: string
  activity_code: string
  activity_name: string
  pattern_type: string
  is_active: boolean
  target_count: number
  target_unit: string
  actual_count: number
  percentage: number
}

/** An indicator rendered on the impact page: numeric target + rolled-up progress. */
export interface LogframeImpactIndicator extends LogframeIndicator {
  actual_value: number
  percentage: number
  linked_activities: LogframeImpactActivity[]
}

/** Headline numbers of the impact view. */
export interface LogframeImpactSummary {
  impacts: number
  outcomes: number
  results: number
  indicators: number
  indicators_with_targets: number
  total_target_value: number
}

/** Full impact view of a project's logframe. */
export interface LogframeImpactData {
  logframe: Logframe | null
  levels: LogframeLevel[]
  indicators: LogframeImpactIndicator[]
  summary: LogframeImpactSummary
}

// --- Requests ---

export interface LogframeUpsertRequest {
  name: string
  description?: string | null
  donor_framework?: string | null
  custom_fields?: CustomFields
}

export interface LogframeLevelRequest {
  level_type: LogframeLevelType
  parent_id?: string | null
  title: string
  sort_order?: number | null
  custom_fields?: CustomFields
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
  custom_fields?: CustomFields
}

export interface LogframeImportRequest {
  template: string
  indicator_codes?: string[]
}

export interface LogframeLinkActivityRequest {
  framework_activity_id: string
}
