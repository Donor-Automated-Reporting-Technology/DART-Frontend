/**
 * interfaces/framework.ts
 *
 * Types for the multi-activity framework system.
 */

export type FrameworkType = 'child_protection' | 'education' | 'health' | 'wash' | 'livelihoods'

export type PatternType =
  | 'daily_attendance'
  | 'cohort_sequential'
  | 'topic_attendance'
  | 'aggregate_event'
  | 'case_workflow'
  | 'training_event'

export interface ActivityTemplate {
  id: string
  framework_type: FrameworkType
  name: string
  code: string
  description: string
  pattern_type: PatternType
  default_config: Record<string, unknown> | null
  created_at: string
}

export interface Framework {
  id: string
  organisation_id: string
  framework_type: FrameworkType
  project_name: string
  partner_name: string
  reporting_to: string
  period_start: string
  period_end: string
  is_active: boolean
  target_count: number
  target_girls: number
  target_boys: number
  target_girls_disability: number
  target_boys_disability: number
  created_at: string
  updated_at: string
}

export interface CreateFrameworkRequest {
  framework_type: FrameworkType
  project_name: string
  // A project's M&E logframe (and its donor/partner metadata) is attached later,
  // so these are optional at creation time.
  partner_name?: string
  reporting_to?: string
  period_start: string
  period_end: string
}

export interface UpdateFrameworkRequest {
  framework_type?: FrameworkType
  project_name?: string
  partner_name?: string
  reporting_to?: string
  period_start?: string
  period_end?: string
}

export interface FrameworkActivity {
  id: string
  framework_id: string
  activity_template_id: string
  is_active: boolean
  target_count: number
  target_unit: string
  custom_config: Record<string, unknown> | null
  created_at: string
  updated_at: string
  template?: ActivityTemplate
  /** Platform module that owns a hand-entered activity (currently only 'pss'). */
  module?: string | null
  /** True when the activity was entered by hand rather than from a template. */
  is_custom?: boolean
  /** Display name/code (populated from the template or the custom fields). */
  activity_name?: string
  activity_code?: string
  description?: string | null
  pattern_type?: string
}

/** Adds a hand-entered activity (e.g. from an external logframe) to a project. */
export interface AddFrameworkActivityRequest {
  name: string
  code?: string | null
  description?: string | null
  module: string
}

export interface ToggleActivityRequest {
  is_active: boolean
}

export interface SetTargetRequest {
  target_count?: number
  target_unit?: string
  target_girls?: number
  target_boys?: number
  target_girls_disability?: number
  target_boys_disability?: number
}

export interface SetProjectTargetRequest {
  target_girls: number
  target_boys: number
  target_girls_disability: number
  target_boys_disability: number
}

export interface FrameworkListResponse {
  frameworks: Framework[]
}

export interface FrameworkActivitiesResponse {
  activities: FrameworkActivity[]
}

export interface ActivityTemplatesResponse {
  templates: ActivityTemplate[]
}
